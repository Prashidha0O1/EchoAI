"""
Feedback generation service using the fine-tuned Gemma 3 1B IT model.
Analyses an interview transcript and produces structured performance scores.
"""
import json
import logging
import re
from typing import Any, Dict, List, Optional

from app.services.question_generator_service import get_question_generator

logger = logging.getLogger(__name__)


class FeedbackService:
    """
    Generates structured interview feedback by re-using the already-loaded
    Gemma 3 singleton from QuestionGeneratorService.
    """

    # ------------------------------------------------------------------
    # Prompt construction
    # ------------------------------------------------------------------

    def _build_prompt(
        self,
        transcript: str,
        role: str,
        interview_type: str,
    ) -> str:
        transcript_truncated = transcript[:4000] if len(transcript) > 4000 else transcript
        return (
            "You are an expert interview coach. "
            "Analyse the following interview transcript and return a structured JSON feedback object.\n\n"
            f"ROLE: {role}\n"
            f"INTERVIEW TYPE: {interview_type}\n\n"
            f"TRANSCRIPT:\n{transcript_truncated}\n\n"
            "Return a single JSON object with exactly these keys:\n"
            '  "overall_score"         : integer 0-100\n'
            '  "performance_metrics"   : object with keys "communication", "technical_knowledge",\n'
            '                            "problem_solving", "confidence", "relevance" — each integer 0-100\n'
            '  "strengths"             : array of 3-5 strength strings\n'
            '  "improvements"          : array of 3-5 improvement strings\n'
            '  "summary"               : 2-3 sentence summary string\n'
            '  "tags"                  : array of objects {"tag_name": str, "tag_category": "strength"|"weakness"|"neutral"}\n\n'
            "Return ONLY the JSON object — no markdown, no extra text.\n"
            "Example:\n"
            '{\n'
            '  "overall_score": 72,\n'
            '  "performance_metrics": {"communication": 80, "technical_knowledge": 65, "problem_solving": 70, "confidence": 75, "relevance": 70},\n'
            '  "strengths": ["Clear articulation of past projects", "Strong understanding of React"],\n'
            '  "improvements": ["Provide more concrete examples using STAR format", "Improve knowledge of system design"],\n'
            '  "summary": "The candidate demonstrated solid frontend skills and good communication. They would benefit from more structured answers and deeper system design knowledge.",\n'
            '  "tags": [{"tag_name": "communication", "tag_category": "strength"}, {"tag_name": "system design", "tag_category": "weakness"}]\n'
            '}'
        )

    # ------------------------------------------------------------------
    # Output parsing
    # ------------------------------------------------------------------

    def _parse_feedback(self, raw_output: str) -> Dict[str, Any]:
        raw_output = re.sub(r"```(?:json)?", "", raw_output).strip()
        json_match = re.search(r"\{.*\}", raw_output, re.DOTALL)
        if not json_match:
            raise ValueError("No JSON object found in model output")
        return json.loads(json_match.group())

    # ------------------------------------------------------------------
    # Fallback
    # ------------------------------------------------------------------

    def _fallback_feedback(
        self,
        transcript: str,
        role: str,
    ) -> Dict[str, Any]:
        """Compute basic heuristic scores when the model is unavailable."""
        messages = [line for line in transcript.split("\n") if line.strip()]
        user_msgs = [m for m in messages if m.lower().startswith("candidate:") or m.lower().startswith("user:")]
        avg_len = sum(len(m) for m in user_msgs) / max(len(user_msgs), 1)
        comm_score = min(90, max(40, int(avg_len / 3)))
        overall = min(85, max(45, int((comm_score + 60) / 2)))

        return {
            "overall_score": overall,
            "performance_metrics": {
                "communication": comm_score,
                "technical_knowledge": 60,
                "problem_solving": 60,
                "confidence": 65,
                "relevance": 65,
            },
            "strengths": [
                "Demonstrated relevant experience",
                "Clear communication throughout the interview",
                "Good engagement with the interviewer",
            ],
            "improvements": [
                "Provide more specific examples using the STAR method",
                "Elaborate further on technical implementation details",
                "Ask more clarifying questions about the role",
            ],
            "summary": (
                f"The candidate showed reasonable performance for the {role} role. "
                "With more structured answers and concrete examples, they could significantly "
                "improve their interview scores."
            ),
            "tags": [
                {"tag_name": "communication", "tag_category": "strength"},
                {"tag_name": "examples", "tag_category": "weakness"},
            ],
        }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate(
        self,
        transcript: str,
        role: str = "Software Engineer",
        interview_type: str = "technical",
    ) -> Dict[str, Any]:
        """
        Generate interview feedback.

        Returns a dict matching the Report schema:
        overall_score, performance_metrics, strengths, improvements, summary, tags
        """
        generator = get_question_generator()

        if not generator.is_loaded:
            logger.warning("Gemma 3 not loaded — using heuristic feedback.")
            return self._fallback_feedback(transcript, role)

        try:
            import torch

            prompt = self._build_prompt(transcript, role, interview_type)
            messages = [{"role": "user", "content": prompt}]
            formatted = generator.tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
            )

            inputs = generator.tokenizer(formatted, return_tensors="pt").to(
                generator.model.device
            )

            with torch.no_grad():
                outputs = generator.model.generate(
                    **inputs,
                    max_new_tokens=512,
                    do_sample=False,
                    pad_token_id=(
                        generator.tokenizer.pad_token_id
                        or generator.tokenizer.eos_token_id
                    ),
                )

            input_length = inputs["input_ids"].shape[1]
            generated_ids = outputs[0][input_length:]
            raw_output = generator.tokenizer.decode(
                generated_ids, skip_special_tokens=True
            )

            logger.info(f"Feedback raw output (first 300 chars): {raw_output[:300]}")
            result = self._parse_feedback(raw_output)

            # Validate and clamp scores
            result["overall_score"] = max(0, min(100, int(result.get("overall_score", 60))))
            metrics = result.get("performance_metrics", {})
            for key in ["communication", "technical_knowledge", "problem_solving", "confidence", "relevance"]:
                metrics[key] = max(0, min(100, int(metrics.get(key, 60))))
            result["performance_metrics"] = metrics
            result.setdefault("strengths", [])
            result.setdefault("improvements", [])
            result.setdefault("summary", "")
            result.setdefault("tags", [])

            return result

        except Exception as exc:
            logger.error(f"Gemma 3 feedback generation failed: {exc}")
            return self._fallback_feedback(transcript, role)


# Singleton
_feedback_service: Optional[FeedbackService] = None


def get_feedback_service() -> FeedbackService:
    global _feedback_service
    if _feedback_service is None:
        _feedback_service = FeedbackService()
    return _feedback_service
