# Gmail SMTP Setup for Email Verification

## 📧 Configure Gmail for Sending Verification Codes

To enable email verification with 6-digit codes, you need to configure Gmail SMTP.

---

## 🔑 Step 1: Generate Gmail App Password

### Why App Password?
- Regular Gmail password won't work with SMTP
- Google requires "App Passwords" for third-party apps
- More secure than using your actual password

### How to Generate:

1. **Go to Google Account Settings:**
   - Visit: https://myaccount.google.com/
   - Or click your profile picture → "Manage your Google Account"

2. **Enable 2-Step Verification (Required):**
   - Go to: Security → 2-Step Verification
   - Click "Get Started" and follow the steps
   - Without 2FA, you can't create App Passwords

3. **Create App Password:**
   - Go to: Security → 2-Step Verification → App passwords
   - Or direct link: https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other (Custom name)" → Enter "EchoAI"
   - Click "Generate"
   - **Copy the 16-character password** (format: xxxx xxxx xxxx xxxx)

4. **Important:**
   - You'll only see this password ONCE
   - Save it securely
   - You can always generate a new one if lost

---

## ⚙️ Step 2: Update Backend `.env` File

Edit: `backend/.env`

```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_actual_email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
SMTP_FROM_EMAIL=your_actual_email@gmail.com
SMTP_FROM_NAME=EchoAI Interview Platform
VERIFICATION_CODE_EXPIRE_MINUTES=10
```

**Replace:**
- `your_actual_email@gmail.com` with your Gmail address
- `xxxx xxxx xxxx xxxx` with the App Password (keep or remove spaces, both work)

---

## 🧪 Step 3: Test Email Sending

### Option A: Using Backend Script

Create `backend/test_email.py`:

```python
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.email_service import EmailService

def test_email():
    """Test sending verification email"""
    print("🧪 Testing Email Service")
    print("=" * 60)
    
    # Generate test code
    code = EmailService.generate_verification_code()
    print(f"📝 Generated Code: {code}")
    
    # Send email
    print(f"📧 Sending email...")
    to_email = input("Enter email to send test to: ")
    
    success = EmailService.send_verification_code(
        to_email=to_email,
        code=code,
        user_name="Test User"
    )
    
    if success:
        print(f"✅ Email sent successfully to {to_email}")
        print(f"📬 Check your inbox for code: {code}")
    else:
        print(f"❌ Failed to send email")
        print("⚠️  Check your .env configuration:")
        print("   - SMTP_USERNAME: Your Gmail address")
        print("   - SMTP_PASSWORD: Your Gmail App Password")
        print("   - Make sure 2FA is enabled on your Google account")

if __name__ == "__main__":
    test_email()
```

Run it:
```bash
cd backend
python test_email.py
```

### Option B: Using API Endpoint

1. Start backend: `uvicorn main:app --reload`
2. Login to get token (via Swagger or frontend)
3. Call verification endpoint:

```bash
curl -X POST http://localhost:8000/verification/send \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

4. Check your email inbox!

---

## ❓ Common Issues & Solutions

### Issue 1: "Authentication failed"
```
SMTPAuthenticationError: (535, b'5.7.8 Username and Password not accepted')
```

**Causes:**
- Wrong App Password
- Using regular password instead of App Password
- 2FA not enabled

**Solution:**
- Generate a NEW App Password
- Make sure you copied it correctly (16 characters)
- Verify 2FA is enabled

---

### Issue 2: "Less secure app access"
```
SMTPAuthenticationError: Please log in via your web browser
```

**Solution:**
- This error means you're using the regular password
- You MUST use an App Password (see Step 1)
- Google deprecated "less secure apps" in 2022

---

### Issue 3: Email not arriving

**Check:**
1. **Spam folder** - Gmail might flag it
2. **Gmail filters** - Check if auto-filtered
3. **Correct email** - Verify email address is correct
4. **Backend logs** - Look for SMTP errors

**Debug:**
```python
# Add this to email_service.py for debugging
print(f"SMTP Config: {SMTP_HOST}:{SMTP_PORT}")
print(f"From: {SMTP_FROM_EMAIL}")
print(f"To: {to_email}")
```

---

### Issue 4: Connection timeout
```
TimeoutError: [Errno 110] Connection timed out
```

**Causes:**
- Firewall blocking port 587
- Network restrictions
- Corporate proxy

**Solution:**
- Try port 465 (SSL) instead of 587 (TLS)
- Check firewall settings
- Try from a different network

---

## 🔒 Security Best Practices

### ✅ DO:
- Use App Passwords (never regular password)
- Store credentials in `.env` (not in code)
- Add `.env` to `.gitignore`
- Rotate App Passwords periodically
- Use different App Password for each app

### ❌ DON'T:
- Commit `.env` file to Git
- Share your App Password
- Use the same password for multiple apps
- Hardcode credentials in source code

---

## 🚀 Alternative: Use SendGrid (Production)

For production, consider using SendGrid instead of Gmail:

### Why SendGrid?
- ✅ No daily send limits (Gmail: 500/day)
- ✅ Better deliverability
- ✅ Built-in analytics
- ✅ Professional email templates
- ✅ Free tier: 100 emails/day

### Setup SendGrid:
1. Sign up: https://sendgrid.com/
2. Get API key
3. Update `.env`:
```env
# Use SendGrid instead
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

4. Install: `pip install sendgrid`

---

## 📝 Environment Variables Summary

Add to `backend/.env`:

```env
# Gmail SMTP (Development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=youremail@gmail.com
SMTP_PASSWORD=your_16_char_app_password
SMTP_FROM_EMAIL=youremail@gmail.com
SMTP_FROM_NAME=EchoAI Interview Platform
VERIFICATION_CODE_EXPIRE_MINUTES=10
```

**Required:**
- `SMTP_USERNAME`: Your Gmail address
- `SMTP_PASSWORD`: Gmail App Password (16 chars)

**Optional:**
- `SMTP_FROM_NAME`: Sender name in email
- `VERIFICATION_CODE_EXPIRE_MINUTES`: Code validity (default: 10)

---

## ✅ Verification Checklist

Before testing email verification:

- [ ] 2FA enabled on Google account
- [ ] App Password generated
- [ ] `.env` file updated with correct credentials
- [ ] Backend restarted to load new env vars
- [ ] PostgreSQL running
- [ ] Database migrated (run `alembic_migration.py`)
- [ ] User account created
- [ ] User logged in

---

## 🎉 Success!

Once configured, users will receive beautiful branded emails like this:

```
From: EchoAI Interview Platform <youremail@gmail.com>
To: user@example.com
Subject: Your EchoAI Verification Code: 123456

┌─────────────────────────────────┐
│          🎙️ EchoAI              │
│ Your AI Interview Practice      │
│         Platform                │
└─────────────────────────────────┘

Hi User,

Welcome to EchoAI! Please use the verification
code below to verify your email address.

┌─────────────────────────────────┐
│   YOUR VERIFICATION CODE        │
│                                 │
│        1  2  3  4  5  6         │
│                                 │
└─────────────────────────────────┘

This code will expire in 10 minutes.
```

---

## 🔄 Testing the Full Flow

1. **Sign up** at `/signup`
2. **Redirected** to `/dashboard`
3. **See banner**: "Verify Your Email"
4. **Click** "Verify Email" button
5. **Email sent** with 6-digit code
6. **Check inbox** (or spam)
7. **Enter code** in modal
8. **Success** → Banner disappears! ✅

---

Need help? Check logs:
```bash
# Backend logs will show:
✅ Email sent successfully to user@example.com
# Or:
❌ Failed to send email: [error details]
```
