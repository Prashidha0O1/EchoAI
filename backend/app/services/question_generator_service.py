"""
Question generation service using the fine-tuned Gemma 3 1B IT model.
Generates personalized interview questions from a candidate's CV and job description.
"""
import asyncio
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Absolute path to the fine-tuned model directory
MODEL_DIR = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),   # backend/app/services/
        "..", "..",                   # backend/
        "ai_models",
        "Finetuned Model Germma 3 1B It",
    )
)

# Singleton instance
_generator_instance: Optional["QuestionGeneratorService"] = None


def get_question_generator() -> "QuestionGeneratorService":
    global _generator_instance
    if _generator_instance is None:
        _generator_instance = QuestionGeneratorService()
    return _generator_instance


class QuestionGeneratorService:
    """
    Wraps the fine-tuned Gemma 3 1B IT causal LM to generate structured
    interview questions from a candidate's CV, job description, role, and
    experience level.

    The model is loaded once as a singleton.  All questions are generated
    by the Gemma 3 model — there is no template fallback.
    """

    def __init__(self) -> None:
        self.model = None
        self.tokenizer = None
        self.is_loaded = False
        self._load_model()

    # ------------------------------------------------------------------
    # Model loading
    # ------------------------------------------------------------------

    def _load_model(self) -> None:
        """Load the Gemma 3 model and tokenizer (lazy, non-fatal)."""
        try:
            import torch
            from transformers import AutoTokenizer, Gemma3ForCausalLM

            device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Loading Gemma 3 model from: {MODEL_DIR} on device: {device}")

            self.tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
            self.model = Gemma3ForCausalLM.from_pretrained(
                MODEL_DIR,
                torch_dtype=torch.float16,
                device_map="cuda",
                ignore_mismatched_sizes=True,
                low_cpu_mem_usage=True,
            )
            self.model.eval()
            self.is_loaded = True
            logger.info(
                f"Gemma 3 question-generator loaded successfully on {device} "
                f"(dtype={next(self.model.parameters()).dtype})."
            )

        except Exception as exc:
            logger.error(
                f"Failed to load Gemma 3 model. Error: {exc}"
            )
            self.is_loaded = False

    # ------------------------------------------------------------------
    # Prompt construction
    # ------------------------------------------------------------------

    def _build_prompt(
        self,
        cv_text: str,
        jd_text: str,
        role: str,
        experience_level: str,
    ) -> str:
        """
        Build the structured prompt sent to the model.
        Inputs are truncated so the total prompt stays within the model's
        sliding-window context of 512 tokens comfortably.
        """
        cv_truncated = cv_text[:2500] if len(cv_text) > 2500 else cv_text
        jd_truncated = jd_text[:1500] if len(jd_text) > 1500 else jd_text

        return (
            "You are an expert technical interviewer. "
            "Generate exactly 8 personalized interview questions based on the "
            "candidate information below.\n\n"
            f"CANDIDATE RESUME:\n{cv_truncated}\n\n"
            f"JOB DESCRIPTION:\n{jd_truncated}\n\n"
            f"ROLE: {role}\n"
            f"EXPERIENCE LEVEL: {experience_level}\n\n"
            "Return a JSON array of 8 questions. Each object must have:\n"
            '  "question"    : the interview question (string)\n'
            '  "category"    : one of "technical", "behavioral", "situational", "experience"\n'
            '  "difficulty"  : one of "easy", "medium", "hard"\n'
            '  "keywords"    : array of 2-3 relevant keyword strings\n'
            '  "ideal_answer": brief guide on what a good answer should cover (1-2 sentences)\n\n'
            "Return ONLY the JSON array — no markdown fences, no extra text.\n"
            "Example:\n"
            '[\n'
            '  {\n'
            '    "question": "Explain how you optimised a database query.",\n'
            '    "category": "technical",\n'
            '    "difficulty": "medium",\n'
            '    "keywords": ["SQL", "indexing", "performance"],\n'
            '    "ideal_answer": "Candidate should mention query planning, indexes, and measured improvement."\n'
            '  }\n'
            ']'
        )

    # ------------------------------------------------------------------
    # Output parsing
    # ------------------------------------------------------------------

    def _parse_questions(self, raw_output: str) -> List[Dict[str, Any]]:
        """Extract and validate the JSON question list from model output."""
        # Strip markdown code fences if the model added them
        raw_output = re.sub(r"```(?:json)?", "", raw_output).strip()

        # Find the outermost JSON array
        json_match = re.search(r"\[.*\]", raw_output, re.DOTALL)
        if not json_match:
            raise ValueError("No JSON array found in model output")

        questions: list = json.loads(json_match.group())
        validated = []
        for q in questions:
            if not isinstance(q, dict) or not q.get("question"):
                continue
            validated.append(
                {
                    "question": str(q.get("question", "")),
                    "category": str(q.get("category", "behavioral")),
                    "difficulty": str(q.get("difficulty", "medium")),
                    "keywords": (
                        q["keywords"]
                        if isinstance(q.get("keywords"), list)
                        else []
                    ),
                    "ideal_answer": str(q.get("ideal_answer", "")),
                }
            )
        return validated

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def _run_inference(self, prompt: str) -> str:
        """
        Sync method — runs blocking torch inference.
        Called via asyncio.to_thread() so it never blocks the event loop.
        """
        import torch

        messages = [{"role": "user", "content": prompt}]
        formatted = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )
        inputs = self.tokenizer(formatted, return_tensors="pt").to(self.model.device)
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=600,
                do_sample=False,
                pad_token_id=(
                    self.tokenizer.pad_token_id or self.tokenizer.eos_token_id
                ),
            )
        input_length = inputs["input_ids"].shape[1]
        generated_ids = outputs[0][input_length:]
        return self.tokenizer.decode(generated_ids, skip_special_tokens=True)

    async def generate_questions(
        self,
        cv_text: str,
        jd_text: str,
        role: str,
        experience_level: str,
    ) -> List[Dict[str, Any]]:
        """
        Generate personalised interview questions (async).

        Uses the fine-tuned Gemma 3 model. Raises an error if the model
        is not loaded or generation fails — no silent fallback.
        """
        if not self.is_loaded:
            raise RuntimeError(
                "Gemma 3 model is not loaded. Cannot generate questions."
            )

        prompt = self._build_prompt(cv_text, jd_text, role, experience_level)
        # Offload blocking torch inference to the thread pool
        raw_output = await asyncio.to_thread(self._run_inference, prompt)

        logger.info(f"Gemma 3 raw output (first 300 chars): {raw_output[:300]}")

        questions = self._parse_questions(raw_output)
        if not questions:
            raise ValueError("Gemma 3 produced output but no valid questions could be parsed from it.")

        logger.info(f"Gemma 3 generated {len(questions)} questions successfully.")
        return questions
