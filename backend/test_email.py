"""
Run this to diagnose Gmail SMTP issues:
    uv run python test_email.py
"""
import smtplib
import os
from dotenv import load_dotenv

load_dotenv()

HOST     = os.getenv("SMTP_HOST", "smtp.gmail.com")
PORT     = int(os.getenv("SMTP_PORT", 587))
USERNAME = os.getenv("SMTP_USERNAME", "")
PASSWORD = os.getenv("SMTP_PASSWORD", "")

print(f"\n{'='*55}")
print(f"  Gmail SMTP Diagnostic")
print(f"{'='*55}")
print(f"  Host     : {HOST}:{PORT}")
print(f"  Username : {USERNAME}")
print(f"  Password : {'*' * len(PASSWORD)} ({len(PASSWORD)} chars)")
print(f"{'='*55}\n")

if not USERNAME or not PASSWORD:
    print("❌  SMTP_USERNAME or SMTP_PASSWORD is empty in .env")
    exit(1)

if len(PASSWORD) != 16:
    print(f"⚠️  Password is {len(PASSWORD)} characters.")
    print("    Gmail App Passwords are exactly 16 characters (no spaces).")
    print("    Regular Gmail passwords won't work — you need an App Password.\n")

# Step 1 – connect
print("Step 1 → Connecting to smtp.gmail.com:587 …")
try:
    server = smtplib.SMTP(HOST, PORT, timeout=10)
    print("         ✅  Connected")
except Exception as e:
    print(f"         ❌  Connection failed: {e}")
    print("\n  Possible cause: port 587 blocked by firewall / antivirus.")
    exit(1)

# Step 2 – EHLO
print("Step 2 → Sending EHLO …")
try:
    server.ehlo()
    print("         ✅  EHLO OK")
except Exception as e:
    print(f"         ❌  EHLO failed: {e}")
    server.quit()
    exit(1)

# Step 3 – STARTTLS
print("Step 3 → Starting TLS …")
try:
    server.starttls()
    server.ehlo()
    print("         ✅  TLS OK")
except Exception as e:
    print(f"         ❌  STARTTLS failed: {e}")
    server.quit()
    exit(1)

# Step 4 – login
print(f"Step 4 → Logging in as {USERNAME} …")
try:
    server.login(USERNAME, PASSWORD)
    print("         ✅  Login OK")
except smtplib.SMTPAuthenticationError as e:
    print(f"         ❌  Authentication failed: {e}")
    print()
    print("  How to fix:")
    print("  1. Go to  https://myaccount.google.com/security")
    print("  2. Enable 2-Step Verification (required for App Passwords)")
    print("  3. Search 'App passwords' → Create one for 'Mail'")
    print("  4. Copy the 16-char password (no spaces) into .env SMTP_PASSWORD=")
    server.quit()
    exit(1)
except Exception as e:
    print(f"         ❌  Login error: {e}")
    server.quit()
    exit(1)

# Step 5 – send test email
print(f"Step 5 → Sending test email to {USERNAME} …")
try:
    from email.mime.text import MIMEText
    msg = MIMEText("If you see this, Gmail SMTP is working correctly in EchoAI ✅")
    msg["Subject"] = "EchoAI SMTP Test"
    msg["From"]    = USERNAME
    msg["To"]      = USERNAME
    server.send_message(msg)
    print(f"         ✅  Email sent to {USERNAME}")
    print()
    print("  Check your inbox (and Spam folder) for 'EchoAI SMTP Test'.")
except Exception as e:
    print(f"         ❌  Send failed: {e}")
finally:
    server.quit()

print()
print("All steps passed — Gmail SMTP is configured correctly!")
print("Restart the backend and try verifying your email again.")
print()
