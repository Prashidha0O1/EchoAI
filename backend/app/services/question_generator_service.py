"""
Question generation service using the fine-tuned Gemma 3 1B IT model.
Generates personalized interview questions from a candidate's CV and job description.
"""
import json
import logging
import os
import re
import tempfile
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

    The model is loaded once as a singleton.  If the model fails to load
    (e.g. transformers / torch not installed, or the weights are on a slow
    disk) the service gracefully falls back to a rich set of template
    questions so the rest of the application still works.
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
            from transformers import AutoModelForCausalLM, AutoTokenizer

            logger.info(f"Loading Gemma 3 model from: {MODEL_DIR}")

            self.tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
            self.model = AutoModelForCausalLM.from_pretrained(
                MODEL_DIR,
                dtype=torch.bfloat16,
            )
            self.model.eval()
            self.is_loaded = True
            logger.info("Gemma 3 question-generator loaded successfully.")

        except Exception as exc:
            logger.error(
                f"Failed to load Gemma 3 model — falling back to templates. Error: {exc}"
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
    # Fallback question templates
    # ------------------------------------------------------------------

    def _fallback_questions(
        self, role: str, experience_level: str
    ) -> List[Dict[str, Any]]:
        """Return rich template questions when the model is unavailable."""
        return [
            {
                "question": (
                    f"Tell me about yourself and why you are interested "
                    f"in the {role} role."
                ),
                "category": "behavioral",
                "difficulty": "easy",
                "keywords": ["background", "motivation", "fit"],
                "ideal_answer": (
                    "Candidate should give a concise professional summary and "
                    "connect their experience to the role's requirements."
                ),
            },
            {
                "question": (
                    "Walk me through your most significant project and "
                    "your specific contributions."
                ),
                "category": "experience",
                "difficulty": "medium",
                "keywords": ["project", "contributions", "impact"],
                "ideal_answer": (
                    "Should follow the STAR format with a clear description "
                    "of role, actions taken, and measurable outcome."
                ),
            },
            {
                "question": (
                    "Describe a time you had to learn a new technology quickly. "
                    "How did you approach it?"
                ),
                "category": "behavioral",
                "difficulty": "medium",
                "keywords": ["learning", "adaptability", "self-study"],
                "ideal_answer": (
                    "Should demonstrate a structured learning approach, "
                    "resource selection, and a positive outcome."
                ),
            },
            {
                "question": (
                    "How do you handle conflicting priorities and tight deadlines?"
                ),
                "category": "situational",
                "difficulty": "medium",
                "keywords": ["prioritization", "time-management", "communication"],
                "ideal_answer": (
                    "Should mention frameworks such as MoSCoW or Eisenhower matrix "
                    "and proactive stakeholder communication."
                ),
            },
            {
                "question": (
                    "Explain a complex technical concept from your work in simple terms "
                    "as if speaking to a non-technical stakeholder."
                ),
                "category": "technical",
                "difficulty": "medium",
                "keywords": ["communication", "simplification", "technical depth"],
                "ideal_answer": (
                    "Should demonstrate ability to translate complexity into plain "
                    "language with concrete analogies."
                ),
            },
            {
                "question": (
                    "Describe your approach to debugging a production issue under pressure."
                ),
                "category": "technical",
                "difficulty": "hard",
                "keywords": ["debugging", "production", "problem-solving"],
                "ideal_answer": (
                    "Should cover isolating the issue, using logs/monitoring, "
                    "rollback strategy, and a post-mortem to prevent recurrence."
                ),
            },
            {
                "question": (
                    f"Where do you see yourself in three years and how does the "
                    f"{role} position fit that path?"
                ),
                "category": "behavioral",
                "difficulty": "easy",
                "keywords": ["career goals", "growth", "alignment"],
                "ideal_answer": (
                    "Should show realistic career ambition aligned with the "
                    "company's growth opportunities."
                ),
            },
            {
                "question": (
                    "What questions do you have for us about the role, the team, "
                    "or the company?"
                ),
                "category": "behavioral",
                "difficulty": "easy",
                "keywords": ["curiosity", "engagement", "preparation"],
                "ideal_answer": (
                    "Should ask meaningful, researched questions about team culture, "
                    "success metrics, or technical challenges — not salary."
                ),
            },
        ]

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate_questions(
        self,
        cv_text: str,
        jd_text: str,
        role: str,
        experience_level: str,
    ) -> List[Dict[str, Any]]:
        """
        Generate personalised interview questions.

        Uses the fine-tuned Gemma 3 model when loaded; falls back to
        template questions otherwise.
        """
        if not self.is_loaded:
            logger.warning("Gemma 3 model not loaded — returning fallback questions.")
            return self._fallback_questions(role, experience_level)

        try:
            import torch

            prompt = self._build_prompt(cv_text, jd_text, role, experience_level)

            # Format with the IT chat template
            messages = [{"role": "user", "content": prompt}]
            formatted = self.tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
            )

            inputs = self.tokenizer(formatted, return_tensors="pt").to(
                self.model.device
            )

            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=1500,
                    do_sample=True,
                    temperature=0.7,
                    top_p=0.9,
                    top_k=50,
                    pad_token_id=(
                        self.tokenizer.pad_token_id
                        or self.tokenizer.eos_token_id
                    ),
                )

            # Decode only the newly generated tokens
            input_length = inputs["input_ids"].shape[1]
            generated_ids = outputs[0][input_length:]
            raw_output = self.tokenizer.decode(
                generated_ids, skip_special_tokens=True
            )

            logger.info(f"Gemma 3 raw output (first 300 chars): {raw_output[:300]}")

            questions = self._parse_questions(raw_output)
            if not questions:
                raise ValueError("No valid questions parsed from model output")

            return questions

        except Exception as exc:
            logger.error(f"Error during Gemma 3 generation: {exc}")
            return self._fallback_questions(role, experience_level)
