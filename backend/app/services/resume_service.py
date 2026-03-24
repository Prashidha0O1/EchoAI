"""Resume PDF generation service"""
import asyncio
from typing import Dict, Any, List
from io import BytesIO
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.pdfgen import canvas


class ResumeService:
    """Service for generating resume PDFs and HTML previews"""
    
    @staticmethod
    def generate_html(resume: Any) -> str:
        """Generate HTML preview of resume"""
        template = resume.template or "modern"
        
        if template == "modern":
            return ResumeService._generate_modern_html(resume)
        elif template == "classic":
            return ResumeService._generate_classic_html(resume)
        elif template == "minimal":
            return ResumeService._generate_minimal_html(resume)
        else:
            return ResumeService._generate_modern_html(resume)
    
    @staticmethod
    def _generate_modern_html(resume: Any) -> str:
        """Generate modern template HTML"""
        education_html = ""
        if resume.education:
            education_html = "<h3>Education</h3>"
            for edu in resume.education:
                education_html += f"""
                <div class="section-item">
                    <div class="flex-between">
                        <strong>{edu.get('degree')} in {edu.get('field')}</strong>
                        <span class="date">{edu.get('start_date')} - {edu.get('end_date', 'Present')}</span>
                    </div>
                    <div class="institution">{edu.get('institution')}</div>
                    {f"<div>GPA: {edu.get('gpa')}</div>" if edu.get('gpa') else ""}
                    {f"<ul>{''.join([f'<li>{a}</li>' for a in edu.get('achievements', [])])}</ul>" if edu.get('achievements') else ""}
                </div>
                """
        
        experience_html = ""
        if resume.experience:
            experience_html = "<h3>Experience</h3>"
            for exp in resume.experience:
                experience_html += f"""
                <div class="section-item">
                    <div class="flex-between">
                        <strong>{exp.get('title')}</strong>
                        <span class="date">{exp.get('start_date')} - {exp.get('end_date', 'Present')}</span>
                    </div>
                    <div class="company">{exp.get('company')}</div>
                    {f"<div class='location'>{exp.get('location')}</div>" if exp.get('location') else ""}
                    {f"<p>{exp.get('description')}</p>" if exp.get('description') else ""}
                    {f"<ul>{''.join([f'<li>{a}</li>' for a in exp.get('achievements', [])])}</ul>" if exp.get('achievements') else ""}
                </div>
                """
        
        skills_html = ""
        if resume.skills:
            skills_html = "<h3>Skills</h3><div class='skills-grid'>"
            if resume.skills.get('technical'):
                skills_html += f"<div><strong>Technical:</strong> {', '.join(resume.skills['technical'])}</div>"
            if resume.skills.get('soft'):
                skills_html += f"<div><strong>Soft Skills:</strong> {', '.join(resume.skills['soft'])}</div>"
            if resume.skills.get('languages'):
                skills_html += f"<div><strong>Languages:</strong> {', '.join(resume.skills['languages'])}</div>"
            if resume.skills.get('tools'):
                skills_html += f"<div><strong>Tools:</strong> {', '.join(resume.skills['tools'])}</div>"
            skills_html += "</div>"
        
        projects_html = ""
        if resume.projects:
            projects_html = "<h3>Projects</h3>"
            for proj in resume.projects:
                projects_html += f"""
                <div class="section-item">
                    <strong>{proj.get('title')}</strong>
                    {f"<a href='{proj.get('link')}' target='_blank'>View Project</a>" if proj.get('link') else ""}
                    <p>{proj.get('description')}</p>
                    {f"<div class='tech-stack'>{', '.join(proj.get('technologies', []))}</div>" if proj.get('technologies') else ""}
                </div>
                """
        
        certifications_html = ""
        if resume.certifications:
            certifications_html = "<h3>Certifications</h3>"
            for cert in resume.certifications:
                certifications_html += f"""
                <div class="section-item">
                    <strong>{cert.get('name')}</strong> - {cert.get('issuer')} ({cert.get('date')})
                    {f"<div>ID: {cert.get('credential_id')}</div>" if cert.get('credential_id') else ""}
                </div>
                """
        
        html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{resume.title} - {resume.full_name or 'Resume'}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #27272a; background: #fafafa; padding: 40px 20px; }}
        .container {{ max-width: 850px; margin: 0 auto; background: white; padding: 60px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
        .header {{ text-align: center; padding-bottom: 30px; border-bottom: 3px solid #6366f1; margin-bottom: 30px; }}
        .header h1 {{ font-size: 36px; color: #18181b; margin-bottom: 8px; }}
        .header .subtitle {{ color: #71717a; font-size: 18px; margin-bottom: 16px; }}
        .contact-info {{ display: flex; justify-content: center; flex-wrap: wrap; gap: 20px; font-size: 14px; color: #52525b; }}
        .contact-info a {{ color: #6366f1; text-decoration: none; }}
        .summary {{ margin: 30px 0; padding: 20px; background: #f4f4f5; border-left: 4px solid #6366f1; }}
        h3 {{ color: #18181b; font-size: 22px; margin: 30px 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #e4e4e7; }}
        .section-item {{ margin-bottom: 24px; }}
        .flex-between {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }}
        .date {{ color: #71717a; font-size: 14px; }}
        .company, .institution {{ color: #52525b; font-size: 15px; margin-bottom: 8px; }}
        .location {{ color: #71717a; font-size: 14px; font-style: italic; }}
        ul {{ margin: 8px 0 8px 20px; }}
        li {{ margin: 4px 0; color: #3f3f46; }}
        .skills-grid {{ display: grid; grid-template-columns: 1fr; gap: 12px; }}
        .tech-stack {{ color: #6366f1; font-size: 14px; margin-top: 8px; }}
        @media print {{ body {{ padding: 0; background: white; }} .container {{ box-shadow: none; padding: 40px; }} }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{resume.full_name or 'Your Name'}</h1>
            <div class="subtitle">{resume.summary or 'Professional Summary'}</div>
            <div class="contact-info">
                {f'<span>{resume.email_contact}</span>' if resume.email_contact else ''}
                {f'<span>{resume.phone_contact}</span>' if resume.phone_contact else ''}
                {f'<span>{resume.location}</span>' if resume.location else ''}
                {f'<a href="{resume.linkedin_url}">LinkedIn</a>' if resume.linkedin_url else ''}
                {f'<a href="{resume.github_url}">GitHub</a>' if resume.github_url else ''}
                {f'<a href="{resume.portfolio_url}">Portfolio</a>' if resume.portfolio_url else ''}
            </div>
        </div>
        
        {f'<div class="summary">{resume.summary}</div>' if resume.summary else ''}
        
        {experience_html}
        {education_html}
        {skills_html}
        {projects_html}
        {certifications_html}
    </div>
</body>
</html>
"""
        return html
    
    @staticmethod
    def _generate_classic_html(resume: Any) -> str:
        """Generate classic template HTML (simplified version)"""
        return ResumeService._generate_modern_html(resume).replace(
            "border-left: 4px solid #6366f1;",
            "border: 1px solid #e4e4e7;"
        )
    
    @staticmethod
    def _generate_minimal_html(resume: Any) -> str:
        """Generate minimal template HTML (simplified version)"""
        return ResumeService._generate_modern_html(resume).replace(
            "background: #f4f4f5;",
            "background: white;"
        )
    
    @staticmethod
    def _generate_pdf_sync(resume: Any) -> bytes:
        """
        Synchronous ReportLab PDF build — runs in thread pool via generate_pdf().

        Args:
            resume: Resume model instance

        Returns:
            PDF as bytes
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                                rightMargin=72, leftMargin=72,
                                topMargin=72, bottomMargin=18)
        
        # Container for the 'Flowable' objects
        elements = []
        
        # Define styles
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#18181b'),
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#71717a'),
            spaceAfter=6,
            alignment=TA_CENTER
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#18181b'),
            spaceAfter=12,
            spaceBefore=20,
            fontName='Helvetica-Bold',
            borderWidth=1,
            borderColor=colors.HexColor('#e4e4e7'),
            borderPadding=5
        )
        
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#27272a'),
            spaceAfter=6
        )
        
        # Header
        name = Paragraph(resume.full_name or "Your Name", title_style)
        elements.append(name)
        
        # Contact info
        contact_parts = []
        if resume.email_contact:
            contact_parts.append(resume.email_contact)
        if resume.phone_contact:
            contact_parts.append(resume.phone_contact)
        if resume.location:
            contact_parts.append(resume.location)
        
        if contact_parts:
            contact = Paragraph(" | ".join(contact_parts), subtitle_style)
            elements.append(contact)
        
        # Links
        link_parts = []
        if resume.linkedin_url:
            link_parts.append(f'<link href="{resume.linkedin_url}">LinkedIn</link>')
        if resume.github_url:
            link_parts.append(f'<link href="{resume.github_url}">GitHub</link>')
        if resume.portfolio_url:
            link_parts.append(f'<link href="{resume.portfolio_url}">Portfolio</link>')
        
        if link_parts:
            links = Paragraph(" | ".join(link_parts), subtitle_style)
            elements.append(links)
        
        elements.append(Spacer(1, 0.3 * inch))
        
        # Summary
        if resume.summary:
            elements.append(Paragraph("Professional Summary", heading_style))
            elements.append(Paragraph(resume.summary, body_style))
            elements.append(Spacer(1, 0.2 * inch))
        
        # Experience
        if resume.experience:
            elements.append(Paragraph("Professional Experience", heading_style))
            for exp in resume.experience:
                exp_title = Paragraph(
                    f"<b>{exp.get('title')}</b> at {exp.get('company')} | {exp.get('start_date')} - {exp.get('end_date', 'Present')}",
                    body_style
                )
                elements.append(exp_title)
                
                if exp.get('description'):
                    elements.append(Paragraph(exp['description'], body_style))
                
                if exp.get('achievements'):
                    for achievement in exp['achievements']:
                        bullet = Paragraph(f"• {achievement}", body_style)
                        elements.append(bullet)
                
                elements.append(Spacer(1, 0.15 * inch))
        
        # Education
        if resume.education:
            elements.append(Paragraph("Education", heading_style))
            for edu in resume.education:
                edu_text = Paragraph(
                    f"<b>{edu.get('degree')} in {edu.get('field')}</b> - {edu.get('institution')} | {edu.get('start_date')} - {edu.get('end_date', 'Present')}",
                    body_style
                )
                elements.append(edu_text)
                
                if edu.get('gpa'):
                    gpa = Paragraph(f"GPA: {edu['gpa']}", body_style)
                    elements.append(gpa)
                
                elements.append(Spacer(1, 0.1 * inch))
        
        # Skills
        if resume.skills:
            elements.append(Paragraph("Skills", heading_style))
            skills_text = []
            
            if resume.skills.get('technical'):
                skills_text.append(f"<b>Technical:</b> {', '.join(resume.skills['technical'])}")
            if resume.skills.get('soft'):
                skills_text.append(f"<b>Soft Skills:</b> {', '.join(resume.skills['soft'])}")
            if resume.skills.get('languages'):
                skills_text.append(f"<b>Languages:</b> {', '.join(resume.skills['languages'])}")
            if resume.skills.get('tools'):
                skills_text.append(f"<b>Tools & Frameworks:</b> {', '.join(resume.skills['tools'])}")
            
            for skill_line in skills_text:
                elements.append(Paragraph(skill_line, body_style))
            
            elements.append(Spacer(1, 0.15 * inch))
        
        # Projects
        if resume.projects:
            elements.append(Paragraph("Projects", heading_style))
            for proj in resume.projects:
                proj_title = Paragraph(
                    f"<b>{proj.get('title')}</b>",
                    body_style
                )
                elements.append(proj_title)
                
                if proj.get('description'):
                    elements.append(Paragraph(proj['description'], body_style))
                
                if proj.get('technologies'):
                    tech = Paragraph(f"Technologies: {', '.join(proj['technologies'])}", body_style)
                    elements.append(tech)
                
                elements.append(Spacer(1, 0.1 * inch))
        
        # Certifications
        if resume.certifications:
            elements.append(Paragraph("Certifications", heading_style))
            for cert in resume.certifications:
                cert_text = Paragraph(
                    f"<b>{cert.get('name')}</b> - {cert.get('issuer')} ({cert.get('date')})",
                    body_style
                )
                elements.append(cert_text)
        
        # Build PDF
        doc.build(elements)

        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    @staticmethod
    async def generate_pdf(resume: Any) -> bytes:
        """
        Async wrapper around _generate_pdf_sync.
        Offloads blocking ReportLab PDF generation to the thread pool so the
        event loop stays free while the document is being built.
        """
        return await asyncio.to_thread(ResumeService._generate_pdf_sync, resume)

    @staticmethod
    def _generate_modern_html(resume: Any) -> str:
        """Modern resume template with gradient header"""
        
        # Helper functions
        def render_section_items(items, render_fn):
            if not items:
                return ""
            return "".join([render_fn(item) for item in items])
        
        def render_education(edu):
            achievements = ""
            if edu.get('achievements'):
                achievements = "<ul class='mt-2'>" + "".join([f"<li>{a}</li>" for a in edu['achievements']]) + "</ul>"
            
            return f"""
            <div class="mb-6">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold text-lg">{edu.get('degree')} in {edu.get('field')}</h4>
                        <p class="text-gray-600">{edu.get('institution')}</p>
                        {f'<p class="text-sm text-gray-500">GPA: {edu.get("gpa")}</p>' if edu.get('gpa') else ''}
                    </div>
                    <span class="text-sm text-gray-500 whitespace-nowrap">{edu.get('start_date')} - {edu.get('end_date', 'Present')}</span>
                </div>
                {achievements}
            </div>
            """
        
        def render_experience(exp):
            description = f"<p class='text-gray-600 mt-2'>{exp.get('description')}</p>" if exp.get('description') else ""
            achievements = ""
            if exp.get('achievements'):
                achievements = "<ul class='mt-2'>" + "".join([f"<li>{a}</li>" for a in exp['achievements']]) + "</ul>"
            
            return f"""
            <div class="mb-6">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold text-lg">{exp.get('title')}</h4>
                        <p class="text-gray-600">{exp.get('company')}</p>
                        {f'<p class="text-sm text-gray-500">{exp.get("location")}</p>' if exp.get('location') else ''}
                    </div>
                    <span class="text-sm text-gray-500 whitespace-nowrap">{exp.get('start_date')} - {exp.get('end_date', 'Present')}</span>
                </div>
                {description}
                {achievements}
            </div>
            """
        
        def render_project(proj):
            link = f'<a href="{proj.get("link")}" class="text-indigo-600 hover:underline text-sm" target="_blank">View Project →</a>' if proj.get('link') else ''
            tech_tags = "".join([f'<span class="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs">{t}</span>' for t in proj.get("technologies", [])])
            tech = f'<div class="flex flex-wrap gap-2 mt-2">{tech_tags}</div>' if proj.get('technologies') else ''
            
            return f"""
            <div class="mb-6">
                <div class="flex justify-between items-start">
                    <h4 class="font-semibold text-lg">{proj.get('title')}</h4>
                    {link}
                </div>
                <p class="text-gray-600 mt-2">{proj.get('description')}</p>
                {tech}
            </div>
            """
        
        def render_certification(cert):
            cred = f'<p class="text-sm text-gray-500">Credential ID: {cert.get("credential_id")}</p>' if cert.get('credential_id') else ''
            return f"""
            <div class="mb-4">
                <h4 class="font-semibold">{cert.get('name')}</h4>
                <p class="text-gray-600">{cert.get('issuer')} - {cert.get('date')}</p>
                {cred}
            </div>
            """
        
        # Build sections
        education_section = f'<section class="mb-8"><h3 class="text-2xl font-bold mb-4 text-indigo-600">Education</h3>{render_section_items(resume.education, render_education)}</section>' if resume.education else ''
        
        experience_section = f'<section class="mb-8"><h3 class="text-2xl font-bold mb-4 text-indigo-600">Professional Experience</h3>{render_section_items(resume.experience, render_experience)}</section>' if resume.experience else ''
        
        skills_section = ""
        if resume.skills:
            skills_html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">'
            if resume.skills.get('technical'):
                skills_html += f'<div><span class="font-semibold">Technical:</span> {", ".join(resume.skills["technical"])}</div>'
            if resume.skills.get('soft'):
                skills_html += f'<div><span class="font-semibold">Soft Skills:</span> {", ".join(resume.skills["soft"])}</div>'
            if resume.skills.get('languages'):
                skills_html += f'<div><span class="font-semibold">Languages:</span> {", ".join(resume.skills["languages"])}</div>'
            if resume.skills.get('tools'):
                skills_html += f'<div><span class="font-semibold">Tools & Frameworks:</span> {", ".join(resume.skills["tools"])}</div>'
            skills_html += '</div>'
            skills_section = f'<section class="mb-8"><h3 class="text-2xl font-bold mb-4 text-indigo-600">Skills</h3>{skills_html}</section>'
        
        projects_section = f'<section class="mb-8"><h3 class="text-2xl font-bold mb-4 text-indigo-600">Projects</h3>{render_section_items(resume.projects, render_project)}</section>' if resume.projects else ''
        
        certifications_section = f'<section class="mb-8"><h3 class="text-2xl font-bold mb-4 text-indigo-600">Certifications</h3>{render_section_items(resume.certifications, render_certification)}</section>' if resume.certifications else ''
        
        html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{resume.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <div class="max-w-4xl mx-auto bg-white shadow-xl my-8 print:shadow-none print:my-0">
        <!-- Header with Gradient -->
        <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-12 text-center">
            <h1 class="text-4xl font-bold mb-2">{resume.full_name or 'Your Name'}</h1>
            <p class="text-indigo-100 text-lg mb-4">{resume.summary or 'Professional Summary'}</p>
            <div class="flex justify-center flex-wrap gap-4 text-sm">
                {f'<span>{resume.email_contact}</span>' if resume.email_contact else ''}
                {f'<span>{resume.phone_contact}</span>' if resume.phone_contact else ''}
                {f'<span>{resume.location}</span>' if resume.location else ''}
            </div>
            <div class="flex justify-center flex-wrap gap-4 text-sm mt-2">
                {f'<a href="{resume.linkedin_url}" class="hover:underline">LinkedIn</a>' if resume.linkedin_url else ''}
                {f'<a href="{resume.github_url}" class="hover:underline">GitHub</a>' if resume.github_url else ''}
                {f'<a href="{resume.portfolio_url}" class="hover:underline">Portfolio</a>' if resume.portfolio_url else ''}
            </div>
        </div>
        
        <!-- Main Content -->
        <div class="p-12">
            {experience_section}
            {education_section}
            {skills_section}
            {projects_section}
            {certifications_section}
        </div>
    </div>
</body>
</html>
"""
        return html
