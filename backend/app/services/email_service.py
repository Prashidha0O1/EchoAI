"""Email service for sending verification codes and notifications — async (aiosmtplib)"""
import aiosmtplib
import random
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
from typing import Optional
import os
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "noreply@echoai.com")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "EchoAI")
VERIFICATION_CODE_EXPIRE_MINUTES = int(os.getenv("VERIFICATION_CODE_EXPIRE_MINUTES", 10))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


class EmailService:
    """Service for sending emails via SMTP"""
    
    @staticmethod
    def generate_verification_code() -> str:
        """Generate a random 6-digit verification code"""
        return ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    @staticmethod
    def is_code_expired(created_at: datetime) -> bool:
        """Check if verification code is expired"""
        if not created_at:
            return True
        expiry_time = created_at + timedelta(minutes=VERIFICATION_CODE_EXPIRE_MINUTES)
        return datetime.now(timezone.utc) > expiry_time
    
    @staticmethod
    async def send_email(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> bool:
        """
        Send an email via SMTP (async).
        Returns True if sent successfully, False otherwise.
        """
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            logger.error("SMTP credentials not configured in .env (SMTP_USERNAME / SMTP_PASSWORD)")
            return False

        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            # Gmail SMTP requires FROM to match the authenticated account
            msg['From'] = f"{SMTP_FROM_NAME} <{SMTP_USERNAME}>"
            msg['To'] = to_email

            if text_body:
                msg.attach(MIMEText(text_body, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))

            await aiosmtplib.send(
                msg,
                hostname=SMTP_HOST,
                port=SMTP_PORT,
                username=SMTP_USERNAME,
                password=SMTP_PASSWORD,
                start_tls=True,
                timeout=10,
            )

            logger.info(f"✅ Email sent successfully to {to_email}")
            return True

        except aiosmtplib.SMTPAuthenticationError as e:
            logger.error(
                f"❌ SMTP Authentication failed for {SMTP_USERNAME}. "
                "Make sure you are using a Gmail App Password "
                "(myaccount.google.com → Security → 2-Step Verification → App passwords). "
                f"Error: {e}"
            )
            return False
        except aiosmtplib.SMTPException as e:
            logger.error(f"❌ SMTP error sending to {to_email}: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Failed to send email to {to_email}: {e}")
            return False
    
    @staticmethod
    def get_verification_email_template(code: str, user_name: str = "User") -> tuple[str, str]:
        """
        Get HTML and text templates for verification email
        
        Args:
            code: 6-digit verification code
            user_name: User's name for personalization
        
        Returns:
            Tuple of (html_body, text_body)
        """
        html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - EchoAI</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); width: 80px; height: 80px; border-radius: 20px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 36px; color: white;">🎙️</span>
            </div>
            <h1 style="color: #f4f4f5; margin: 0; font-size: 28px; font-weight: 700;">EchoAI</h1>
            <p style="color: #a1a1aa; margin: 8px 0 0 0; font-size: 14px;">Your AI Interview Practice Platform</p>
        </div>
        
        <!-- Main Content -->
        <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 40px; margin-bottom: 24px;">
            <h2 style="color: #f4f4f5; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Verify Your Email</h2>
            
            <p style="color: #d4d4d8; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                Hi {user_name},
            </p>
            
            <p style="color: #d4d4d8; margin: 0 0 32px 0; font-size: 16px; line-height: 1.6;">
                Welcome to EchoAI! Please use the verification code below to verify your email address and start practicing your interviews.
            </p>
            
            <!-- Verification Code Box -->
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; padding: 32px; text-align: center; margin: 32px 0;">
                <p style="color: rgba(255,255,255,0.8); margin: 0 0 12px 0; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                <div style="background-color: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 8px; padding: 20px; display: inline-block;">
                    <span style="color: white; font-size: 42px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">{code}</span>
                </div>
            </div>
            
            <p style="color: #a1a1aa; margin: 24px 0 0 0; font-size: 14px; line-height: 1.6;">
                This code will expire in <strong style="color: #f4f4f5;">{VERIFICATION_CODE_EXPIRE_MINUTES} minutes</strong>.
            </p>
            
            <p style="color: #a1a1aa; margin: 16px 0 0 0; font-size: 14px; line-height: 1.6;">
                If you didn't create an account with EchoAI, please ignore this email.
            </p>
        </div>
        
        <!-- Features Section -->
        <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 32px; margin-bottom: 24px;">
            <h3 style="color: #f4f4f5; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">What's Next?</h3>
            
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: start; margin-bottom: 12px;">
                    <span style="color: #6366f1; font-size: 24px; margin-right: 12px;">🎯</span>
                    <div>
                        <p style="color: #f4f4f5; margin: 0; font-size: 15px; font-weight: 500;">Build Your Resume</p>
                        <p style="color: #a1a1aa; margin: 4px 0 0 0; font-size: 13px;">Create professional resumes with our built-in resume builder</p>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: start; margin-bottom: 12px;">
                    <span style="color: #8b5cf6; font-size: 24px; margin-right: 12px;">💼</span>
                    <div>
                        <p style="color: #f4f4f5; margin: 0; font-size: 15px; font-weight: 500;">Practice Interviews</p>
                        <p style="color: #a1a1aa; margin: 4px 0 0 0; font-size: 13px;">Upload job descriptions and practice with AI-powered interviews</p>
                    </div>
                </div>
            </div>
            
            <div>
                <div style="display: flex; align-items: start;">
                    <span style="color: #ec4899; font-size: 24px; margin-right: 12px;">📊</span>
                    <div>
                        <p style="color: #f4f4f5; margin: 0; font-size: 15px; font-weight: 500;">Get Detailed Feedback</p>
                        <p style="color: #a1a1aa; margin: 4px 0 0 0; font-size: 13px;">Receive AI-generated reports on your interview performance</p>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 24px;">
            <p style="color: #71717a; margin: 0 0 8px 0; font-size: 13px;">
                © 2026 EchoAI. All rights reserved.
            </p>
            <p style="color: #71717a; margin: 0; font-size: 12px;">
                This is an automated email. Please do not reply.
            </p>
        </div>
        
    </div>
</body>
</html>
"""
        
        text = f"""
EchoAI - Verify Your Email

Hi {user_name},

Welcome to EchoAI! Please use the verification code below to verify your email address.

Your Verification Code: {code}

This code will expire in {VERIFICATION_CODE_EXPIRE_MINUTES} minutes.

If you didn't create an account with EchoAI, please ignore this email.

---
What's Next?

🎯 Build Your Resume
   Create professional resumes with our built-in resume builder

💼 Practice Interviews
   Upload job descriptions and practice with AI-powered interviews

📊 Get Detailed Feedback
   Receive AI-generated reports on your interview performance

---
© 2026 EchoAI. All rights reserved.
This is an automated email. Please do not reply.
"""
        
        return html, text
    
    @classmethod
    async def send_password_reset_email(
        cls,
        to_email: str,
        reset_token: str,
        user_name: str = "User",
    ) -> bool:
        """Send a password reset email with a CTA button linking to the reset page."""
        reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"
        subject = "Reset Your EchoAI Password"

        html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - EchoAI</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#0a0a0a;">
    <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <!-- Header -->
        <div style="text-align:center;margin-bottom:40px;">
            <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);width:80px;height:80px;border-radius:20px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
                <span style="font-size:36px;color:white;">🔐</span>
            </div>
            <h1 style="color:#f4f4f5;margin:0;font-size:28px;font-weight:700;">EchoAI</h1>
            <p style="color:#a1a1aa;margin:8px 0 0 0;font-size:14px;">Your AI Interview Practice Platform</p>
        </div>
        <!-- Main Content -->
        <div style="background-color:#18181b;border:1px solid #27272a;border-radius:16px;padding:40px;margin-bottom:24px;">
            <h2 style="color:#f4f4f5;margin:0 0 16px 0;font-size:24px;font-weight:600;">Reset Your Password</h2>
            <p style="color:#d4d4d8;margin:0 0 16px 0;font-size:16px;line-height:1.6;">Hi {user_name},</p>
            <p style="color:#d4d4d8;margin:0 0 32px 0;font-size:16px;line-height:1.6;">
                We received a request to reset the password for your EchoAI account.
                Click the button below to choose a new password. This link will expire in <strong style="color:#f4f4f5;">1 hour</strong>.
            </p>
            <!-- CTA Button -->
            <div style="text-align:center;margin:32px 0;">
                <a href="{reset_url}"
                   style="display:inline-block;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:600;letter-spacing:0.5px;">
                    Reset Password
                </a>
            </div>
            <p style="color:#a1a1aa;margin:24px 0 0 0;font-size:13px;line-height:1.6;">
                Or copy and paste this link into your browser:<br>
                <span style="color:#10b981;word-break:break-all;">{reset_url}</span>
            </p>
            <hr style="border:none;border-top:1px solid #27272a;margin:32px 0;">
            <p style="color:#71717a;margin:0;font-size:13px;line-height:1.6;">
                If you didn't request a password reset, you can safely ignore this email — your password will not change.
            </p>
        </div>
        <!-- Footer -->
        <div style="text-align:center;padding:24px;">
            <p style="color:#71717a;margin:0 0 8px 0;font-size:13px;">© 2026 EchoAI. All rights reserved.</p>
            <p style="color:#71717a;margin:0;font-size:12px;">This is an automated email. Please do not reply.</p>
        </div>
    </div>
</body>
</html>"""

        text = f"""EchoAI — Reset Your Password

Hi {user_name},

We received a request to reset the password for your EchoAI account.
Click the link below to choose a new password. This link expires in 1 hour.

{reset_url}

If you didn't request a password reset, you can safely ignore this email.

---
© 2026 EchoAI. All rights reserved.
"""
        return await cls.send_email(to_email, subject, html, text)

    @classmethod
    async def send_verification_code(cls, to_email: str, code: str, user_name: str = "User") -> bool:
        """
        Send verification code email (async).

        Args:
            to_email: Recipient email
            code: 6-digit verification code
            user_name: User's name for personalization

        Returns:
            True if sent successfully
        """
        subject = f"Your EchoAI Verification Code: {code}"
        html_body, text_body = cls.get_verification_email_template(code, user_name)

        return await cls.send_email(to_email, subject, html_body, text_body)
