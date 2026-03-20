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

    # ------------------------------------------------------------------
    # Gap analysis & feedback
    # ------------------------------------------------------------------

    # Comprehensive keyword dictionary keyed by display category
    _SKILL_CATEGORIES: dict = {
        "Programming Languages": [
            "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
            "swift", "kotlin", "ruby", "php", "scala", "r", "matlab", "perl", "bash",
            "shell", "powershell", "dart", "lua", "haskell", "elixir", "clojure",
        ],
        "Frontend": [
            "react", "angular", "vue", "next.js", "nuxt", "svelte", "redux", "tailwind",
            "bootstrap", "html", "css", "sass", "less", "webpack", "vite", "jquery",
            "react native", "flutter", "ionic", "electron",
        ],
        "Backend & Frameworks": [
            "node.js", "django", "flask", "fastapi", "spring", "express", "rails",
            "laravel", "asp.net", "graphql", "rest api", "grpc", "soap", "websockets",
            "microservices", "serverless", "nestjs", "gin", "fiber",
        ],
        "Databases": [
            "sql", "nosql", "postgresql", "mysql", "sqlite", "mongodb", "redis",
            "cassandra", "elasticsearch", "dynamodb", "firebase", "oracle", "mssql",
            "neo4j", "influxdb", "cockroachdb", "supabase", "prisma",
        ],
        "DevOps & Cloud": [
            "docker", "kubernetes", "aws", "azure", "gcp", "terraform", "ansible",
            "jenkins", "github actions", "gitlab ci", "circleci", "helm", "prometheus",
            "grafana", "nginx", "apache", "linux", "ci/cd", "devops", "sre",
            "cloudformation", "pulumi",
        ],
        "Data & AI / ML": [
            "machine learning", "deep learning", "nlp", "computer vision", "tensorflow",
            "pytorch", "keras", "scikit-learn", "pandas", "numpy", "spark", "hadoop",
            "airflow", "dbt", "tableau", "power bi", "data pipeline", "etl",
            "llm", "bert", "gpt", "hugging face", "langchain", "rag",
        ],
        "Tools & Practices": [
            "git", "github", "gitlab", "bitbucket", "jira", "confluence", "agile",
            "scrum", "kanban", "tdd", "bdd", "unit testing", "integration testing",
            "code review", "pair programming", "solid", "design patterns", "clean code",
            "swagger", "openapi", "postman", "figma",
        ],
        "Soft Skills": [
            "communication", "leadership", "teamwork", "problem solving", "critical thinking",
            "time management", "collaboration", "mentoring", "stakeholder management",
            "project management", "analytical", "adaptability",
        ],
    }

    def analyze_resume_gaps(
        self, resume_text: str, jd_text: str, percentage: float
    ) -> dict:
        """
        Compare the resume against the job description and return:
          - missing_keywords: skills/terms in JD but absent from CV
          - recommendations:  grouped, actionable suggestions
          - feedback:         general resume improvement tips
        """
        cv_lower = resume_text.lower()
        jd_lower = jd_text.lower()

        # ── 1. Keyword gap detection ────────────────────────────────
        missing_by_category: dict[str, list[str]] = {}

        for category, keywords in self._SKILL_CATEGORIES.items():
            missing = []
            for kw in keywords:
                # Keyword must appear in JD but NOT in CV
                if kw in jd_lower and kw not in cv_lower:
                    missing.append(kw.title() if len(kw) <= 4 else kw.capitalize())
            if missing:
                missing_by_category[category] = missing

        all_missing: list[str] = [kw for kws in missing_by_category.values() for kw in kws]

        # ── 2. Recommendations ──────────────────────────────────────
        recommendations: list[str] = []

        for category, kws in missing_by_category.items():
            skill_list = ", ".join(kws[:6])
            suffix = f" (and {len(kws) - 6} more)" if len(kws) > 6 else ""
            recommendations.append(
                f"Add {category} skills to your resume: {skill_list}{suffix}."
            )

        if not recommendations:
            recommendations.append(
                "Your CV already covers the key skills mentioned in this job description."
            )

        # ── 3. Feedback ─────────────────────────────────────────────
        feedback: list[str] = []

        # Score-range tip
        if percentage < 50:
            feedback.append(
                "Your resume needs significant tailoring for this role — "
                "focus on incorporating the missing keywords naturally into your experience."
            )
        elif percentage < 75:
            feedback.append(
                "You're partway there. Weave the missing keywords into your experience "
                "bullets and skills section to strengthen the match."
            )
        else:
            feedback.append(
                "Strong match! A few targeted tweaks to surface missing keywords "
                "can push your score even higher."
            )

        # Section presence hints
        has_summary = bool(re.search(r"\b(summary|objective|profile|about me)\b", cv_lower))
        if not has_summary:
            feedback.append(
                "Add a professional summary at the top of your resume, "
                "tailored specifically to this job role."
            )

        has_skills_section = bool(re.search(r"\b(skills|competencies|technologies)\b", cv_lower))
        if not has_skills_section:
            feedback.append(
                "Create a dedicated Skills / Technical Competencies section "
                "listing your key technologies and tools."
            )

        if len(all_missing) > 5:
            feedback.append(
                "Consider adding a Core Competencies section near the top of your "
                "resume to make key skills immediately visible to ATS scanners."
            )

        # Universal best-practice tips
        feedback.append(
            "Quantify your achievements wherever possible "
            "(e.g., 'Reduced load time by 40%' instead of 'Improved performance')."
        )
        feedback.append(
            "Start each experience bullet with a strong action verb "
            "(e.g., Built, Designed, Led, Optimised, Delivered)."
        )
        feedback.append(
            "Mirror the exact phrasing used in the job description — "
            "ATS systems often match on exact terms."
        )

        return {
            "missing_keywords": all_missing,
            "recommendations": recommendations,
            "feedback": feedback,
        }

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
