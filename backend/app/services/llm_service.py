"""LLM service for generating interview questions"""
import logging
from typing import List, Dict
import random

logger = logging.getLogger(__name__)


class SimpleLLMService:
    """
    Simple template-based question generation for demo.
    Later replace with OpenAI API or fine-tuned model.
    """
    
    def __init__(self, cv_text: str, jd_text: str):
        """
        Initialize LLM service with interview context.
        
        Args:
            cv_text: Parsed CV text content
            jd_text: Job description text
        """
        self.cv_text = cv_text
        self.jd_text = jd_text
        self.question_index = 0
        self.conversation_history = []
        
        # Template questions for demo
        self.questions = [
            "Hello! Welcome to the interview. Let's start with a simple question: Can you tell me about yourself?",
            "That's interesting. Can you walk me through your most recent project mentioned in your CV?",
            "How do you handle challenges when working on a team project?",
            "What technologies are you most comfortable with based on your experience?",
            "Can you describe a situation where you had to learn a new technology quickly?",
            "How would you approach solving a complex technical problem?",
            "What interests you most about this role based on the job description?",
            "Can you explain a technical concept from your CV in simple terms?",
            "How do you stay updated with the latest industry trends?",
            "Do you have any questions for us about the role or the company?"
        ]
        
        # Generate some contextual questions from CV/JD
        self._generate_contextual_questions()
    
    def _generate_contextual_questions(self):
        """Generate basic contextual questions from CV/JD text"""
        try:
            # Extract keywords from CV
            cv_keywords = self._extract_keywords(self.cv_text)
            jd_keywords = self._extract_keywords(self.jd_text)
            
            # Add contextual questions
            if cv_keywords:
                self.questions.append(
                    f"I see you have experience with {', '.join(cv_keywords[:3])}. "
                    f"Can you tell me more about your work with {cv_keywords[0]}?"
                )
            
            if jd_keywords:
                self.questions.append(
                    f"This role requires {', '.join(jd_keywords[:3])}. "
                    f"How would you apply your experience to meet these requirements?"
                )
                
        except Exception as e:
            logger.error(f"Error generating contextual questions: {e}")
    
    def _extract_keywords(self, text: str, max_keywords: int = 5) -> List[str]:
        """Extract relevant keywords from text"""
        common_tech = [
            "python", "java", "javascript", "typescript", "react", "angular", "vue",
            "node.js", "django", "flask", "fastapi", "express", "spring boot",
            "sql", "postgresql", "mysql", "mongodb", "redis",
            "docker", "kubernetes", "aws", "azure", "gcp",
            "git", "ci/cd", "agile", "scrum",
            "rest api", "graphql", "microservices", "machine learning", "ai"
        ]
        
        text_lower = text.lower()
        found_keywords = []
        
        for keyword in common_tech:
            if keyword in text_lower:
                found_keywords.append(keyword)
                if len(found_keywords) >= max_keywords:
                    break
        
        return found_keywords
    
    async def generate_question(self, conversation_history: List[Dict[str, str]]) -> str:
        """
        Generate the next interview question based on conversation history.
        
        Args:
            conversation_history: List of previous messages with 'sender' and 'content'
            
        Returns:
            AI interviewer's next question
        """
        try:
            # Update internal history
            self.conversation_history = conversation_history
            
            # First question (greeting)
            if len(conversation_history) == 0:
                return self.questions[0]
            
            # Get the next question based on conversation progress
            if self.question_index < len(self.questions) - 1:
                self.question_index += 1
                return self.questions[self.question_index]
            
            # If we've run out of questions, generate follow-up
            return self._generate_followup(conversation_history)
            
        except Exception as e:
            logger.error(f"Error generating question: {e}")
            return "That's interesting. Can you tell me more about that?"
    
    def _generate_followup(self, conversation_history: List[Dict[str, str]]) -> str:
        """Generate a follow-up question based on recent conversation"""
        followups = [
            "That's a great point. Can you elaborate on that?",
            "Interesting. How did that experience prepare you for this role?",
            "I see. What challenges did you face in that situation?",
            "Can you give me another example of that?",
            "How would you apply that knowledge to this position?",
            "What did you learn from that experience?",
            "Thank you for sharing. Let's move on to another topic. What are your career goals?",
            "That's helpful. Is there anything else you'd like to highlight from your experience?"
        ]
        return random.choice(followups)
    
    async def generate_feedback(self, conversation_history: List[Dict[str, str]]) -> Dict[str, any]:
        """
        Generate feedback for the interview session.
        
        Args:
            conversation_history: Full conversation transcript
            
        Returns:
            Feedback dictionary with scores and suggestions
        """
        try:
            user_responses = [msg for msg in conversation_history if msg.get('sender') == 'user']
            
            # Simple metrics for demo
            total_responses = len(user_responses)
            avg_response_length = sum(len(msg.get('content', '')) for msg in user_responses) / max(total_responses, 1)
            
            feedback = {
                "total_questions": len(conversation_history) // 2,
                "total_responses": total_responses,
                "avg_response_length": int(avg_response_length),
                "confidence_score": min(100, int(avg_response_length / 10 * 100)),
                "strengths": [
                    "Clear communication",
                    "Relevant experience mentioned",
                    "Good understanding of technical concepts"
                ],
                "improvements": [
                    "Consider providing more specific examples",
                    "Elaborate on your problem-solving process",
                    "Ask more questions about the role"
                ],
                "overall_rating": "Good"
            }
            
            return feedback
            
        except Exception as e:
            logger.error(f"Error generating feedback: {e}")
            return {
                "error": "Could not generate feedback",
                "total_questions": 0,
                "total_responses": 0
            }
