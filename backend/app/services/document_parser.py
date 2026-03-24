"""Document parsing service for CV and Job Description extraction"""
import asyncio
import logging
from typing import Dict, Optional
import PyPDF2
import docx
import re

logger = logging.getLogger(__name__)


class DocumentParser:
    """Service for parsing PDF and DOCX documents"""
    
    @staticmethod
    def parse_pdf(file_path: str) -> str:
        """
        Extract text from a PDF file.
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Extracted text content
        """
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            
            return text.strip()
        except Exception as e:
            logger.error(f"Error parsing PDF {file_path}: {e}")
            return ""
    
    @staticmethod
    def parse_docx(file_path: str) -> str:
        """
        Extract text from a DOCX file.
        
        Args:
            file_path: Path to the DOCX file
            
        Returns:
            Extracted text content
        """
        try:
            doc = docx.Document(file_path)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text.strip()
        except Exception as e:
            logger.error(f"Error parsing DOCX {file_path}: {e}")
            return ""
    
    @staticmethod
    def parse_document(file_path: str) -> str:
        """
        Parse a document based on its extension.

        Args:
            file_path: Path to the document file

        Returns:
            Extracted text content
        """
        if file_path.lower().endswith('.pdf'):
            return DocumentParser.parse_pdf(file_path)
        elif file_path.lower().endswith('.docx'):
            return DocumentParser.parse_docx(file_path)
        else:
            logger.warning(f"Unsupported file type: {file_path}")
            return ""

    @staticmethod
    async def parse_document_async(file_path: str) -> str:
        """
        Async wrapper around parse_document.
        Offloads blocking file I/O and CPU parsing to the thread pool so the
        event loop stays free while the document is being read.
        """
        return await asyncio.to_thread(DocumentParser.parse_document, file_path)
    
    @staticmethod
    def extract_cv_sections(text: str) -> Dict[str, str]:
        """
        Extract structured sections from CV text.
        
        Args:
            text: Raw CV text
            
        Returns:
            Dictionary with sections like education, experience, skills, etc.
        """
        sections = {
            "raw_text": text,
            "education": "",
            "experience": "",
            "skills": "",
            "projects": ""
        }
        
        try:
            text_lower = text.lower()
            
            # Simple pattern matching for common CV sections
            patterns = {
                "education": r"(?:education|academic|qualification)(.*?)(?=experience|skills|projects|\Z)",
                "experience": r"(?:experience|employment|work history)(.*?)(?=education|skills|projects|\Z)",
                "skills": r"(?:skills|technical skills|competencies)(.*?)(?=education|experience|projects|\Z)",
                "projects": r"(?:projects|portfolio)(.*?)(?=education|experience|skills|\Z)"
            }
            
            for section_name, pattern in patterns.items():
                match = re.search(pattern, text_lower, re.DOTALL | re.IGNORECASE)
                if match:
                    # Extract from original text to preserve case
                    start_idx = match.start(1)
                    end_idx = match.end(1)
                    sections[section_name] = text[start_idx:end_idx].strip()
            
        except Exception as e:
            logger.error(f"Error extracting CV sections: {e}")
        
        return sections
    
    @staticmethod
    def extract_job_requirements(jd_text: str) -> Dict[str, any]:
        """
        Extract key information from job description.
        
        Args:
            jd_text: Job description text
            
        Returns:
            Dictionary with requirements, qualifications, responsibilities
        """
        requirements = {
            "raw_text": jd_text,
            "required_skills": [],
            "preferred_skills": [],
            "responsibilities": []
        }
        
        try:
            # Extract skills mentioned (simple keyword matching)
            common_skills = [
                "python", "java", "javascript", "typescript", "react", "angular", "vue",
                "node.js", "django", "flask", "fastapi", "sql", "nosql", "mongodb",
                "postgresql", "mysql", "docker", "kubernetes", "aws", "azure", "gcp",
                "git", "agile", "scrum", "rest api", "graphql", "microservices"
            ]
            
            jd_lower = jd_text.lower()
            for skill in common_skills:
                if skill in jd_lower:
                    requirements["required_skills"].append(skill)
            
        except Exception as e:
            logger.error(f"Error extracting job requirements: {e}")
        
        return requirements
