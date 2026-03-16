"""ATS Resume Checker service using fine-tuned BERT model."""
import re
import logging
from pathlib import Path
from typing import Optional

import torch
import torch.nn.functional as F

logger = logging.getLogger(__name__)

AI_MODELS_DIR = Path(__file__).resolve().parents[2] / "ai_models"

# Module-level singleton so the model is only loaded once per process
_ats_service_instance: Optional["ATSService"] = None


class ATSService:
    """
    Wraps the fine-tuned BertForSequenceClassification model stored in
    backend/ai_models/ and exposes a simple ATS scoring interface.

    The model has 24 output labels (LABEL_0 … LABEL_23). A weighted average
    of softmax probabilities is used to derive a continuous 0–1 score:
        score = Σ(i × P(label_i)) / 23
    Multiply by 100 for a human-readable percentage.
    """

    # Regex: keep letters, digits, whitespace; strip everything else
    _CLEAN_PATTERN = re.compile(r"[^a-zA-Z0-9\s]")

    def __init__(self) -> None:
        self._model = None
        self._tokenizer = None
        self._device = torch.device("cpu")
        self._num_labels = 24
        self._load_model()

    # ------------------------------------------------------------------
    # Model loading
    # ------------------------------------------------------------------

    def _load_model(self) -> None:
        """Load tokenizer and model from the ai_models directory."""
        try:
            # Import here so the module can be imported even if transformers
            # is not yet installed (e.g. during a bare pip install step).
            from transformers import BertTokenizer, BertForSequenceClassification

            model_path = str(AI_MODELS_DIR)
            logger.info(f"Loading ATS model from {model_path} …")

            self._tokenizer = BertTokenizer.from_pretrained(
                model_path, local_files_only=True
            )
            self._model = BertForSequenceClassification.from_pretrained(
                model_path, local_files_only=True
            )
            self._model.to(self._device)
            self._model.eval()
            self._num_labels = self._model.config.num_labels
            logger.info(
                f"ATS model loaded successfully "
                f"(num_labels={self._num_labels}, device={self._device})"
            )
        except Exception as exc:
            logger.error(f"Failed to load ATS model: {exc}")
            self._model = None
            self._tokenizer = None

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    @staticmethod
    def clean_text(text: str) -> str:
        """
        Strip punctuation and special characters, keeping only letters,
        digits, and whitespace. Collapses multiple spaces into one.
        """
        cleaned = ATSService._CLEAN_PATTERN.sub(" ", text)
        return " ".join(cleaned.split())

    def compute_ats_score(self, resume_text: str, jd_text: str) -> dict:
        """
        Compute an ATS match score between a resume and a job description.

        Args:
            resume_text: Raw text extracted from the candidate's CV.
            jd_text:     Raw job-description text provided by the user.

        Returns:
            {
                "score":      float  (0.0 – 1.0),
                "percentage": float  (0.0 – 100.0),
            }
        """
        if self._model is None or self._tokenizer is None:
            logger.error("ATS model is not loaded; returning zero score.")
            return {"score": 0.0, "percentage": 0.0}

        cleaned_resume = self.clean_text(resume_text)
        cleaned_jd = self.clean_text(jd_text)

        try:
            inputs = self._tokenizer(
                cleaned_resume,
                cleaned_jd,
                truncation=True,
                max_length=512,
                padding="max_length",
                return_tensors="pt",
            )
            inputs = {k: v.to(self._device) for k, v in inputs.items()}

            with torch.no_grad():
                outputs = self._model(**inputs)
                logits = outputs.logits  # shape: [1, num_labels]

            probs = F.softmax(logits, dim=-1).squeeze(0)  # shape: [num_labels]

            # Weighted average: label index acts as a similarity level
            label_values = torch.arange(
                self._num_labels, dtype=torch.float32, device=self._device
            )
            raw_score = (probs * label_values).sum()
            score = (raw_score / (self._num_labels - 1)).item()
            percentage = round(score * 100, 2)

            logger.info(f"ATS score computed: {percentage:.2f}%")
            return {"score": round(score, 4), "percentage": percentage}

        except Exception as exc:
            logger.error(f"Error during ATS inference: {exc}")
            return {"score": 0.0, "percentage": 0.0}

    @property
    def is_loaded(self) -> bool:
        return self._model is not None and self._tokenizer is not None


# ------------------------------------------------------------------
# Module-level singleton accessor
# ------------------------------------------------------------------

def get_ats_service() -> ATSService:
    """Return the shared ATSService instance, creating it on first call."""
    global _ats_service_instance
    if _ats_service_instance is None:
        _ats_service_instance = ATSService()
    return _ats_service_instance
