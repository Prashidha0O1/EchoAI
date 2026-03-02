# 🚀 Complete Setup Guide - EchoAI Interview Platform

## What's Been Implemented

### ✅ Email Verification System
- 6-digit code generation and validation
- Beautiful HTML email template with gradient design
- SMTP integration via Gmail
- Email verification banner on dashboard
- Verification modal with auto-focus inputs
- Rate limiting (2 minutes between code requests)
- 10-minute code expiration

### ✅ Resume Builder
- Complete CRUD operations (Create, Read, Update, Delete)
- Multiple templates (Modern, Classic, Minimal, Creative)
- Sections: Personal Info, Experience, Education, Skills, Projects, Certifications
- Primary resume selection
- PDF export functionality
- HTML preview
- Full frontend UI with drag-drop future support

### ✅ Audio Streaming (Already Connected!)
- Frontend: MediaRecorder API captures audio
- WebSocket: Binary audio streaming
- Backend: Whisper STT processes audio
- Backend: Pyttsx3 TTS generates responses
- Real-time bidirectional communication

### ✅ Complete Backend
- User authentication with JWT
- Email verification endpoints
- Interview management
- Resume builder API
- WebSocket for live interviews
- Database migrations
- Redis caching

### ✅ Complete Frontend
- Next.js 15 app router
- Authentication context
- Email verification UI
- Resume builder (create/edit/list)
- Live interview interface
- Dashboard with verification banner

---

## 🏁 Quick Start (5 Steps)

### Step 1: Database Migration

Add new columns to existing database:

```bash
cd backend
python alembic_migration.py
```

**Expected output:**
```
🔧 Migrating users.email_verified...
   ✅ Success
🔧 Migrating users.verification_code...
   ✅ Success
🔧 Migrating resumes.table...
   ✅ Success
✅ Migration Complete!
```

---

### Step 2: Configure Gmail SMTP

Edit `backend/.env`:

```env
# Add these lines:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_gmail@gmail.com
SMTP_PASSWORD=your_app_password_here
SMTP_FROM_EMAIL=your_gmail@gmail.com
SMTP_FROM_NAME=EchoAI Interview Platform
VERIFICATION_CODE_EXPIRE_MINUTES=10
```

**Get Gmail App Password:**
See detailed guide in `SETUP_GMAIL_SMTP.md`

Quick steps:
1. Enable 2FA on Google account
2. Visit: https://myaccount.google.com/apppasswords
3. Create app password for "Mail"
4. Copy the 16-character code
5. Paste in `.env`

---

### Step 3: Install New Dependencies

```bash
cd backend
pip install -r requirements.txt
```

**New packages added:**
- `reportlab` - PDF generation
- `weasyprint` - HTML to PDF conversion (alternative)

---

### Step 4: Restart Backend

```bash
cd backend
uvicorn main:app --reload
```

**Verify it's working:**
- Open: http://localhost:8000/docs
- Should see new endpoints:
  - `/verification/send` (POST)
  - `/verification/verify` (POST)
  - `/verification/status` (GET)
  - `/resumes` (GET/POST)
  - `/resumes/{id}` (GET/PUT/DELETE)
  - `/resumes/{id}/export/pdf` (GET)

---

### Step 5: Test the Complete Flow

```bash
cd frontend
npm run dev
```

Open: http://localhost:3000

**Test Flow:**
1. ✅ Sign up with new account
2. ✅ Auto-redirected to dashboard
3. ✅ See "Verify Your Email" banner at top
4. ✅ Click "Verify Email" → Email sent
5. ✅ Check Gmail for 6-digit code
6. ✅ Enter code in modal
7. ✅ Email verified → Banner disappears
8. ✅ Create resume at `/resumes/create`
9. ✅ Create interview at `/interviews/create`
10. ✅ Start live interview with audio

---

## 📁 New Files Created

### Backend:

```
backend/
├── app/
│   └── services/
│       ├── email_service.py          ← Email & SMTP
│       └── resume_service.py         ← PDF generation
├── routers/
│   ├── verification.py               ← Email verification endpoints
│   └── resumes.py                    ← Resume CRUD endpoints
├── database/
│   ├── models.py                     ← Updated: email_verified, Resume model
│   ├── schemas.py                    ← All Pydantic schemas
│   └── crud.py                       ← Resume & verification CRUD
└── alembic_migration.py              ← Database migration script
```

### Frontend:

```
frontend/
├── components/
│   └── EmailVerificationBanner.tsx   ← Verification banner + modal
├── lib/
│   ├── api.ts                        ← Updated: email_verified field
│   └── resumeApi.ts                  ← Resume API client
├── app/
│   ├── dashboard/page.tsx            ← Updated: shows banner
│   ├── debug/page.tsx                ← Debug auth issues
│   ├── resumes/
│   │   ├── page.tsx                  ← List resumes
│   │   ├── create/page.tsx           ← Create resume
│   │   └── [id]/edit/page.tsx        ← Edit resume
│   └── interview/[id]/page.tsx       ← Updated: audio streaming
└── hooks/
    ├── useWebSocket.ts               ← WebSocket connection
    └── useAudioRecorder.ts           ← Audio capture
```

### Documentation:

```
COMPLETE_SETUP_GUIDE.md               ← This file
SETUP_GMAIL_SMTP.md                   ← Gmail configuration
QUICK_FIX_401.md                      ← Fix auth errors
FIX_INTERVIEW_404.md                  ← Fix interview creation
TESTING_GUIDE.md                      ← End-to-end testing
IMPLEMENTATION_SUMMARY.md             ← Technical details
```

---

## 🎯 Feature Breakdown

### 1. Email Verification Flow

**Backend (`/verification`):**
```
POST /verification/send
  → Generates 6-digit code
  → Saves to database with timestamp
  → Sends email via SMTP
  → Rate limited: 1 request per 2 minutes

POST /verification/verify
  → Validates code
  → Checks expiration (10 minutes)
  → Marks user.email_verified = True
  → Clears verification code

GET /verification/status
  → Returns verification status
  → Shows if code exists
  → Shows expiration time

GET /verification/debug/code (DEV ONLY)
  → Returns current code without email
  → Remove in production
```

**Frontend:**
- `EmailVerificationBanner`: Shows at top of dashboard if not verified
- Click "Verify Email" → Sends code via `/verification/send`
- Opens modal with 6 input boxes
- Auto-focus, paste support, keyboard navigation
- Submit code → `/verification/verify`
- Success → Reload page, banner disappears

**Email Template:**
- Gradient header with EchoAI branding
- Large, centered 6-digit code
- Expiration notice
- Features overview
- Professional footer
- Mobile-responsive

---

### 2. Resume Builder

**Database Model:**
```sql
resumes (
  id, user_id, title, template,
  full_name, email_contact, phone_contact, location,
  linkedin_url, github_url, portfolio_url, summary,
  education JSON,        -- [{institution, degree, field, ...}]
  experience JSON,       -- [{company, title, location, ...}]
  skills JSON,           -- {technical: [], soft: [], languages: [], tools: []}
  projects JSON,         -- [{title, description, technologies, ...}]
  certifications JSON,   -- [{name, issuer, date, ...}]
  is_primary BOOLEAN,
  pdf_url, created_at, updated_at
)
```

**Backend Endpoints:**
```
POST   /resumes                    Create resume
GET    /resumes                    List all user resumes
GET    /resumes/primary            Get primary resume
GET    /resumes/{id}               Get specific resume
PUT    /resumes/{id}               Update resume
DELETE /resumes/{id}               Delete resume
POST   /resumes/{id}/set-primary   Set as primary
GET    /resumes/{id}/export/pdf    Download PDF
GET    /resumes/{id}/preview       HTML preview
```

**Frontend Pages:**
- `/resumes` - List all resumes with actions
- `/resumes/create` - Multi-tab form builder
- `/resumes/[id]/edit` - Edit existing resume

**Features:**
- Multiple resume templates
- Tabbed interface (Personal, Experience, Education, Skills, Projects, Certifications)
- Add/remove sections dynamically
- Auto-save on submit
- Primary resume selection (used for interviews)
- PDF download
- HTML preview in new tab

---

### 3. Audio Streaming Architecture

```
┌─────────────┐                    ┌──────────────┐
│   Browser   │                    │   Backend    │
│             │                    │              │
│ Microphone  │ ───────────────▶  │   Whisper    │
│             │  WebSocket Binary  │     STT      │
│ (MediaRec)  │    Audio Chunks    │              │
│             │                    │  Processes   │
│             │  ◀───────────────  │   Speech     │
│             │  JSON: transcript  │              │
│             │                    │      ↓       │
│             │                    │              │
│             │                    │  SimpleLLM   │
│             │                    │   Service    │
│             │                    │              │
│             │                    │      ↓       │
│             │                    │              │
│             │  ◀───────────────  │  Pyttsx3     │
│             │  JSON: AI audio    │     TTS      │
│   Speaker   │    (hex encoded)   │              │
│             │                    │              │
└─────────────┘                    └──────────────┘
```

**How It Works:**

1. **Frontend captures audio:**
   - `useAudioRecorder` hook uses `MediaRecorder API`
   - Captures chunks every 2 seconds
   - Format: WebM with Opus codec (fallback: WAV)
   - Sample rate: 16kHz optimized for Whisper

2. **Frontend sends via WebSocket:**
   - `useWebSocket` hook manages connection
   - `sendAudio(blob)` sends binary data
   - Auto-reconnection with exponential backoff
   - Heartbeat/ping to keep connection alive

3. **Backend receives and processes:**
   - WebSocket endpoint at `/ws/interview`
   - Receives binary: `message["bytes"]`
   - Passes to `WhisperSTT.transcribe()`
   - Returns text transcript

4. **Backend generates response:**
   - `SimpleLLMService` generates next question
   - Based on CV, JD, and conversation history
   - Context-aware follow-ups

5. **Backend converts to speech:**
   - `Pyttsx3TTS.speak()` converts text to audio
   - Returns WAV audio bytes
   - Hex-encodes for JSON transport

6. **Frontend receives and plays:**
   - Receives `{ type: "ai_audio", data: "hex..." }`
   - Converts hex to bytes
   - Creates audio blob
   - Plays through `<audio>` element
   - Queues multiple responses

**Debugging Audio:**
- Check browser console for: "Audio chunk received: X bytes"
- Check backend logs for: "Received audio: X bytes"
- Check backend logs for: "User transcription: [text]"
- If no transcription: Audio might be too quiet or wrong format

---

## 🔧 Database Schema Changes

### Users Table (Updated):
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_created_at TIMESTAMP WITH TIME ZONE;
```

### Resumes Table (New):
```sql
CREATE TABLE resumes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  template VARCHAR(50) DEFAULT 'modern',
  -- Personal info columns
  -- JSON columns for structured data
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Run migration:**
```bash
cd backend
python alembic_migration.py
```

---

## 🧪 Testing Procedures

### Test 1: Email Verification

**Prerequisites:**
- Gmail App Password configured in `.env`
- Backend running
- Frontend running

**Steps:**
1. Sign up at `/signup`
2. Should auto-redirect to `/dashboard`
3. Should see purple banner: "Verify your email to unlock all features"
4. Click "Verify Email" button
5. Check Gmail inbox for email from "EchoAI Interview Platform"
6. Copy 6-digit code
7. Enter in modal (or paste)
8. Click "Verify Email"
9. Banner should disappear
10. Refresh page - banner stays gone

**Debug:**
- If no email arrives: Check `SETUP_GMAIL_SMTP.md`
- If 401 error: See `QUICK_FIX_401.md`
- If code invalid: Check backend logs for the code
- Dev endpoint: `GET /verification/debug/code` (shows code without email)

---

### Test 2: Resume Builder

**Steps:**
1. Login and verify email
2. Navigate to `/resumes`
3. Click "Create New Resume"
4. Fill out form (tabbed interface):
   - Personal Info: Name, email, phone, links, summary
   - Experience: Add jobs with achievements
   - Education: Add degrees with details
   - Skills: Technical, soft, languages, tools
   - Projects: Add with tech stack and links
   - Certifications: Add with credentials
5. Click "Save Resume"
6. Should redirect to `/resumes`
7. See your resume in grid
8. Actions:
   - **Edit** - Opens `/resumes/{id}/edit`
   - **Preview** - Opens HTML preview in new tab
   - **Download** - Downloads PDF
   - **Set Primary** - Sets as main resume (star icon)
   - **Delete** - Removes resume

**PDF Export:**
- Click download icon
- PDF generates with ReportLab
- Auto-downloads as `resume_{id}_{title}.pdf`
- Professional formatting with selected template

---

### Test 3: Audio Streaming in Interview

**Prerequisites:**
- Microphone permission granted
- Browser supports MediaRecorder (Chrome, Firefox, Edge)
- Backend STT/TTS models loaded

**Steps:**
1. Create interview at `/interviews/create`
2. Upload JD and start
3. On interview page, click large microphone button
4. Grant microphone permission if asked
5. Speak: "Hello, this is a test"
6. Watch transcript appear in real-time:
   - Left side: Your speech (USER)
   - Right side: AI response (AI)
7. AI audio plays automatically
8. Continue conversation
9. Click "End Interview" when done

**Console Logs (Expected):**

**Frontend:**
```
WebSocket connected
Audio chunk received: 8192 bytes
WebSocket message: {type: "user_transcript", text: "Hello, this is a test"}
WebSocket message: {type: "ai_transcript", text: "Thank you for that..."}
WebSocket message: {type: "ai_audio", data: "52494646..."}
```

**Backend:**
```
INFO: WebSocket connection accepted: interview_id=1
INFO: Received audio: 8192 bytes
INFO: User transcription: Hello, this is a test
INFO: Generating AI response...
INFO: Sent AI audio response: 45678 bytes
```

**If audio doesn't work:**
- Check microphone permission
- Try different browser (Chrome recommended)
- Check backend logs for STT errors
- Verify Whisper model loaded: `GET /health`

---

## 🎨 Email Template Preview

When users request verification, they receive:

**Subject:** Your EchoAI Verification Code: 123456

**Body:**
```
┌─────────────────────────────────────────┐
│              🎙️ EchoAI                  │
│     Your AI Interview Practice          │
│            Platform                     │
└─────────────────────────────────────────┘

Hi John,

Welcome to EchoAI! Please use the verification
code below to verify your email address and
start practicing your interviews.

╔═════════════════════════════════════════╗
║    YOUR VERIFICATION CODE               ║
║                                         ║
║         1    2    3    4    5    6      ║
║                                         ║
╚═════════════════════════════════════════╝

This code will expire in 10 minutes.

If you didn't create an account with EchoAI,
please ignore this email.

───────────────────────────────────────────

What's Next?

🎯 Build Your Resume
   Create professional resumes with our
   built-in resume builder

💼 Practice Interviews
   Upload job descriptions and practice
   with AI-powered interviews

📊 Get Detailed Feedback
   Receive AI-generated reports on your
   interview performance

───────────────────────────────────────────

© 2026 EchoAI. All rights reserved.
This is an automated email. Please do not reply.
```

**Features:**
- Gradient purple header
- Professional design
- Responsive (mobile-friendly)
- Includes features overview
- Clear call-to-action

---

## 🐛 Troubleshooting

### Problem 1: "Email service failed"

**Check `.env` configuration:**
```bash
cd backend
cat .env | grep SMTP
```

Should show:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=youremail@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
```

**Test SMTP connection:**
```bash
cd backend
python -c "from app.services.email_service import EmailService; print('✅ Import successful')"
```

---

### Problem 2: "Database migration failed"

**Reset and retry:**
```bash
cd backend

# Check current tables
python -c "from database.database import SessionLocal; from sqlalchemy import text; db = SessionLocal(); print([r[0] for r in db.execute(text('SELECT tablename FROM pg_tables WHERE schemaname = \\'public\\'')).fetchall()])"

# Run migration
python alembic_migration.py

# Verify new columns
python -c "from database.database import SessionLocal; from database.models import User; db = SessionLocal(); user = db.query(User).first(); print(f'email_verified: {user.email_verified if user else 'No users'}')"
```

---

### Problem 3: "Resume PDF export fails"

**Check dependencies:**
```bash
pip install reportlab
```

**Test PDF generation:**
```python
from reportlab.pdfgen import canvas
from io import BytesIO

buffer = BytesIO()
c = canvas.Canvas(buffer)
c.drawString(100, 750, "Test PDF")
c.save()
print(f"✅ PDF generated: {len(buffer.getvalue())} bytes")
```

---

### Problem 4: "Audio streaming not working"

**Frontend checks:**
- Open browser console
- Look for: "Audio chunk received: X bytes"
- If missing: Microphone not capturing

**Backend checks:**
- Look for: "Received audio: X bytes"
- If missing: WebSocket not connected
- Look for: "User transcription: [text]"
- If missing: STT model not processing

**Test microphone:**
```javascript
// In browser console
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    console.log('✅ Microphone access granted');
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(err => console.error('❌ Microphone error:', err));
```

---

## 📊 API Endpoints Summary

### Authentication
```
POST /auth/register       - Sign up
POST /auth/login          - Login (returns JWT)
GET  /auth/me             - Get current user
POST /auth/forgot-password- Request reset token
POST /auth/reset-password - Reset with token
```

### Email Verification
```
POST /verification/send   - Send 6-digit code
POST /verification/verify - Verify code
GET  /verification/status - Check status
GET  /verification/debug/code - Get code (DEV)
```

### Resumes
```
POST   /resumes                   - Create
GET    /resumes                   - List all
GET    /resumes/primary           - Get primary
GET    /resumes/{id}              - Get one
PUT    /resumes/{id}              - Update
DELETE /resumes/{id}              - Delete
POST   /resumes/{id}/set-primary  - Set primary
GET    /resumes/{id}/export/pdf   - Download PDF
GET    /resumes/{id}/preview      - HTML preview
```

### Interviews
```
POST   /interviews              - Create
GET    /interviews              - List all
GET    /interviews/{id}         - Get one
PUT    /interviews/{id}         - Update
DELETE /interviews/{id}         - Delete
POST   /interviews/{id}/start   - Start interview
POST   /interviews/{id}/end     - End interview
GET    /interviews/{id}/messages- Get transcript
```

### WebSocket
```
WS /ws/interview?interview_id={id}&token={jwt}
  - Real-time audio streaming
  - STT/TTS processing
  - Bidirectional communication
```

---

## 🔐 Security Features

### Implemented:
- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ Rate limiting on login
- ✅ Rate limiting on verification codes
- ✅ Email verification required
- ✅ Code expiration (10 minutes)
- ✅ User ownership checks on all resources
- ✅ CORS configured
- ✅ SQL injection protection (SQLAlchemy)
- ✅ App Passwords for SMTP (not plain password)

### Best Practices:
- Store secrets in `.env`
- Never commit `.env` to git
- Use HTTPS in production
- Rotate JWT secrets regularly
- Set strong ACCESS_TOKEN_EXPIRE_MINUTES
- Validate all user inputs
- Sanitize file uploads

---

## 📈 Performance Considerations

### Database:
- Indexes on: user.email, user.username, interview.user_id, resume.user_id
- Cascade deletes configured
- Connection pooling (SQLAlchemy default)

### Redis:
- Transcript caching during interviews
- Rate limiting counters
- Session management
- Auto-expiring keys

### WebSocket:
- Binary transfer for audio (efficient)
- Hex encoding only for JSON compatibility
- Chunk processing (2-second intervals)
- Auto-reconnection on disconnect

### Frontend:
- Code splitting with Next.js
- Lazy loading components
- Optimistic UI updates
- Client-side caching

---

## 🎬 Demo Presentation Flow

### 1. Introduction (1 min)
"EchoAI is an AI-powered interview practice platform that helps candidates prepare for real interviews."

### 2. Sign Up & Email Verification (2 min)
- Show sign-up form
- Submit and redirect to dashboard
- Show verification banner
- Explain email sent with 6-digit code
- Enter code and verify
- Banner disappears

### 3. Resume Builder (3 min)
- Navigate to Resume Builder
- Create new resume
- Show tabbed interface
- Add experience, education, skills
- Save and show in list
- Download PDF
- Show professional formatting

### 4. Create Interview (2 min)
- Navigate to Create Interview
- Upload job description
- Show how JD is parsed
- Explain CV + JD context
- Create and start interview

### 5. Live Interview Demo (5 min)
- Show split-screen interface
- Speak into microphone
- Show real-time transcription (left side)
- Show AI response transcript (right side)
- Play AI audio response
- Demonstrate back-and-forth conversation
- Show transcript building up
- End interview

### 6. View Results (1 min)
- Show interview list
- View completed interview transcript
- Download transcript

### 7. Architecture Overview (1 min)
- Show tech stack
- Explain WebSocket for real-time
- Mention Docker for deployment
- Future: WebRTC, fine-tuned LLM, pgvector

**Total: ~15 minutes**

---

## 🚀 Deployment Checklist

Before production:

### Backend:
- [ ] Change SECRET_KEY in `.env`
- [ ] Set strong database password
- [ ] Configure production Redis
- [ ] Remove debug endpoints (`/verification/debug/code`)
- [ ] Set up proper logging
- [ ] Configure SendGrid (instead of Gmail)
- [ ] Set CORS to specific origins
- [ ] Enable HTTPS
- [ ] Set up monitoring (Sentry, etc.)

### Frontend:
- [ ] Update API URLs to production
- [ ] Enable analytics
- [ ] Configure error tracking
- [ ] Optimize bundle size
- [ ] Add meta tags for SEO
- [ ] Set up CDN for static assets

### Infrastructure:
- [ ] Deploy with Docker Compose
- [ ] Set up reverse proxy (Nginx)
- [ ] Configure SSL certificates
- [ ] Set up database backups
- [ ] Configure log rotation
- [ ] Set up health checks

---

## 📞 Need Help?

### Email not sending?
→ See `SETUP_GMAIL_SMTP.md`

### 401 Unauthorized?
→ See `QUICK_FIX_401.md`

### Interview creation failing?
→ See `FIX_INTERVIEW_404.md`

### General testing?
→ See `TESTING_GUIDE.md`

### Architecture details?
→ See `IMPLEMENTATION_SUMMARY.md`

---

## ✅ Success Criteria

Your platform is ready when:

- [x] User can sign up
- [x] User redirected to dashboard after signup
- [x] Email verification banner appears
- [x] User receives 6-digit code via email
- [x] User can verify email successfully
- [x] Banner disappears after verification
- [x] User can create/edit/delete resumes
- [x] User can download resume as PDF
- [x] User can create interviews
- [x] User can start live interview
- [x] Audio is captured and transcribed
- [x] AI responds with text and voice
- [x] Full transcript displayed in real-time
- [x] Interview can be ended and saved

---

## 🎉 You're All Set!

Everything is now implemented:

1. ✅ **Email Verification** - 6-digit code via SMTP
2. ✅ **Resume Builder** - Full CRUD with PDF export
3. ✅ **Audio Streaming** - Already connected and working
4. ✅ **Dashboard Redirect** - After signup
5. ✅ **Complete Backend** - All endpoints ready
6. ✅ **Complete Frontend** - All UI components ready

**Next Steps:**
1. Run database migration: `python alembic_migration.py`
2. Configure Gmail SMTP (see `SETUP_GMAIL_SMTP.md`)
3. Restart backend
4. Test email verification
5. Create a resume
6. Start an interview
7. Present to your review panel! 🎓

---

Good luck with your demo tomorrow! 🚀
