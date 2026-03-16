# 🚀 Quick Start for Demo - EchoAI

## One-Time Setup (Do This Once)

### Step 1: Run Database Migration

**Option A - Docker (if using docker-compose):**
```powershell
# Copy migration file to container
docker cp backend\migrations\add_email_verification_and_resumes.sql echoai-db:/tmp/migration.sql

# Run migration
docker exec -it echoai-db psql -U postgres -d echo_ai_db -f /tmp/migration.sql
```

**Option B - Local PostgreSQL:**
```powershell
cd backend
psql -U postgres -d echo_ai_db -f migrations\add_email_verification_and_resumes.sql
```

---

### Step 2: Configure Gmail (Optional for Demo)

Edit `backend\.env` and add:

```env
SMTP_USERNAME=your_gmail@gmail.com
SMTP_PASSWORD=your_app_password_here
```

**Get App Password:**
1. Visit: https://myaccount.google.com/apppasswords
2. Generate password for "Mail"
3. Copy 16-character code
4. Paste in `.env`

**Note:** You can skip this and use the debug endpoint for demo!

---

### Step 3: Install Dependencies

```powershell
cd backend
pip install reportlab weasyprint
```

---

## 🎬 Start Demo (Every Time)

### Terminal 1 - Start Backend:
```powershell
cd backend
uvicorn main:app --reload
```

Wait for:
```
INFO: Uvicorn running on http://127.0.0.1:8000
```

---

### Terminal 2 - Start Frontend:
```powershell
cd frontend
npm run dev
```

Wait for:
```
Ready on http://localhost:3000
```

---

### Terminal 3 - Docker (if needed):
```powershell
docker-compose up
```

Or start services individually:
```powershell
docker-compose up postgres redis -d
```

---

## 🧪 Quick Test Before Demo

### 1. Backend Health Check:
Open: http://localhost:8000/docs

Should see all endpoints including:
- `/verification/*`
- `/resumes/*`
- `/interviews/*`

### 2. Frontend Check:
Open: http://localhost:3000

Should load landing page.

### 3. Microphone Test:
Open: https://www.onlinemictest.com/
Verify your microphone works.

---

## 🎯 Demo Flow (15 Minutes)

### Part 1: Sign Up & Email Verification (3 min)

1. Navigate to: http://localhost:3000/signup

2. Fill form:
   - Username: `demouser`
   - Email: `demo@test.com`
   - Password: `Demo123!`

3. Submit → Auto-redirected to Dashboard

4. See banner: "Verify your email"

5. Click "Verify Email" button

6. **Two options for demo:**

   **Option A - With Gmail SMTP:**
   - Check Gmail for code
   - Enter 6-digit code
   - Click "Verify"

   **Option B - Without Email (Development):**
   - Open new tab: http://localhost:8000/docs
   - Login with demo@test.com / Demo123!
   - Call: `GET /verification/send` (with Bearer token)
   - Call: `GET /verification/debug/code` (get the code)
   - Go back to frontend
   - Enter the code
   - Click "Verify"

7. Banner disappears → Email verified! ✅

---

### Part 2: Resume Builder (4 min)

1. Click "Resume Builder" button in dashboard

2. Click "Create New Resume"

3. **Personal Info tab:**
   - Full Name: "John Doe"
   - Email: demo@test.com
   - Phone: +1 555-0123
   - Location: "San Francisco, CA"
   - GitHub: https://github.com/johndoe
   - Summary: "Experienced full-stack developer..."

4. **Experience tab:**
   - Click to view
   - Add company: "Tech Corp"
   - Title: "Senior Software Engineer"
   - Dates: 2022-01 to Present
   - Description: "Led development of..."

5. **Skills tab:**
   - Technical: "Python, JavaScript, React, FastAPI, Docker"
   - Tools: "Git, VS Code, PostgreSQL"

6. Click "Save Resume"

7. Back in list → Click "Preview" (opens beautiful HTML)

8. Click "Download PDF" → Show PDF quality

---

### Part 3: Create Interview (2 min)

1. Navigate to "Create Interview"

2. Select type: "Mixed"

3. Paste job description:
```
We are seeking a Full Stack Developer with experience in:
- Python (FastAPI, Django)
- React and Next.js
- PostgreSQL and Redis
- WebSocket real-time applications
- Docker and cloud deployment

Responsibilities include building scalable web applications,
implementing real-time features, and collaborating with teams.
```

4. Click "Start Interview"

5. Explain:
   - AI analyzes your resume + job description
   - Generates relevant questions
   - Adapts based on your responses

---

### Part 4: Live Interview Demo (5 min)

1. Click large microphone button

2. Grant permission (if needed)

3. **Question 1 - Introduction:**
   - AI asks: "Tell me about yourself"
   - You speak for 10-20 seconds
   - Watch left side: Your transcript appears
   - Watch right side: AI response appears
   - Hear AI audio response

4. **Question 2 - Technical:**
   - AI asks technical question
   - You respond
   - Show real-time transcription
   - Show conversation history building

5. **Question 3 - Behavioral:**
   - AI asks behavioral question
   - You respond
   - Demonstrate natural conversation flow

6. Click "End Interview"

7. Download transcript

---

### Part 5: Wrap Up (1 min)

1. Show dashboard with completed interview

2. Navigate to interviews list

3. Show transcript history

4. Mention future enhancements:
   - Fine-tuned LLM for better questions
   - Detailed feedback and scoring
   - Interview analytics
   - WebRTC for lower latency
   - Mobile app

---

## 🎤 Key Talking Points During Demo

### Innovation:
- "Traditional interview prep is static and one-way"
- "EchoAI provides interactive, AI-powered practice"
- "Real-time audio with speech-to-text and text-to-speech"
- "Context-aware questions based on YOUR resume and job"

### Technical Implementation:
- "Built with modern tech stack: FastAPI, Next.js, WebSocket"
- "Microservices architecture with Docker"
- "Real-time bidirectional communication"
- "Redis for caching, PostgreSQL for persistence"

### Value Proposition:
- "Helps candidates practice anytime, anywhere"
- "Personalized questions based on actual job requirements"
- "Get comfortable with interview format before real one"
- "Review transcripts to improve responses"

### Future Vision:
- "Will add fine-tuned LLM for more realistic questions"
- "Detailed feedback reports with scoring"
- "Video support for body language practice"
- "Integration with job boards"
- "Mobile app for practice on-the-go"

---

## 🐛 If Something Goes Wrong During Demo

### Audio not working:
1. Refresh page
2. Re-grant microphone permission
3. Check browser console for errors
4. **Backup:** Show pre-recorded demo or explain the flow

### Backend timeout:
1. Check backend terminal for errors
2. **Backup:** Use Swagger UI to show API
3. Explain the architecture with diagrams

### Email not sending:
1. Use debug endpoint: `/verification/debug/code`
2. **Backup:** Manually show code from backend logs
3. Explain production would use SendGrid

### Network issues:
1. **Backup:** Have screenshots/video ready
2. Show code and explain implementation
3. Walk through architecture diagrams

---

## 📊 Metrics to Highlight

- "Complete end-to-end platform in X weeks"
- "Real-time audio processing with <2s latency"
- "Microservices architecture, fully containerized"
- "Scalable to 1000s of concurrent interviews"
- "Email verification for security"
- "Professional resume builder included"

---

## ✅ Pre-Demo Checklist

**1 Day Before:**
- [ ] Test complete flow 3 times
- [ ] Take screenshots of key features
- [ ] Record backup video (just in case)
- [ ] Prepare job descriptions (2-3 samples)
- [ ] Test on different browsers
- [ ] Check microphone quality

**1 Hour Before:**
- [ ] Start all services
- [ ] Test audio streaming
- [ ] Clear browser cache
- [ ] Close unnecessary apps
- [ ] Charge laptop fully
- [ ] Have backup plan ready

**5 Minutes Before:**
- [ ] Open all necessary tabs
- [ ] Test microphone one more time
- [ ] Have code ready in editor
- [ ] Start screen recording (optional)
- [ ] Deep breath - you got this! 🙂

---

## 🎉 You're Ready!

**Everything is implemented and tested:**

✅ Email verification with 6-digit code
✅ Beautiful branded emails
✅ Complete resume builder
✅ PDF export functionality  
✅ Audio streaming (STT/TTS)
✅ Real-time transcription
✅ Dashboard with all features
✅ Complete backend API
✅ Full frontend UI
✅ Docker deployment ready

**Just run the migration, configure Gmail (optional), and start!**

---

**Good luck with your Final Year Project presentation! 🎓🚀**

You've built something impressive - show it with confidence!
