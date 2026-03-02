# EchoAI Testing Guide - Complete Workflow

## Pre-requisites Checklist

### Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

**Key packages installed:**
- FastAPI, Uvicorn (API server)
- SQLAlchemy, psycopg2-binary (Database)
- python-jose, passlib (Authentication)
- openai-whisper (Speech-to-text)
- pyttsx3 (Text-to-speech)
- PyPDF2, python-docx (Document parsing)
- redis (Caching)

### Frontend Dependencies
```bash
cd frontend
npm install
```

### Docker Services
```bash
# Start PostgreSQL, Redis, PgAdmin, RedisInsight
docker-compose up -d

# Verify services are running
docker-compose ps
```

**Services:**
- PostgreSQL: `localhost:5432`
- PgAdmin: `http://localhost:5050`
- Redis: `localhost:6379`
- RedisInsight: `http://localhost:5540`

---

## Testing Workflow - Step by Step

### Phase 1: Start Services

#### Terminal 1 - Docker Services
```bash
docker-compose up -d
```

**Verify:**
- Check `docker ps` shows 4 containers running
- PostgreSQL container: `echo_ai_postgres`
- Redis container: `echo_ai_redis`

#### Terminal 2 - Backend Server
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
INFO:     Loading Whisper model: base...
INFO:     Whisper model loaded.
INFO:     Models initialized successfully.
```

**Test API docs:** Open `http://localhost:8000/docs`

#### Terminal 3 - Frontend Server
```bash
cd frontend
npm run dev
```

**Expected output:**
```
▲ Next.js 16.1.1
- Local:        http://localhost:3000
```

---

### Phase 2: User Registration & Login

#### Step 1: Register New User

1. Open `http://localhost:3000`
2. Click "Sign Up" or navigate to `/signup`
3. Fill in registration form:
   - **Username:** testuser
   - **Email:** test@example.com
   - **Password:** Test123!@#
   - **First Name:** Test
   - **Last Name:** User
   - **CV Upload:** Upload a sample PDF/DOCX resume

**Backend verification:**
```bash
# Check logs for:
INFO:     POST /auth/register
INFO:     User created: test@example.com
```

**Database verification:**
```sql
-- Connect to PgAdmin (localhost:5050)
-- Server: echo_ai_postgres
-- Database: echo_ai_db
-- Username: postgres
-- Password: postgres

SELECT * FROM users WHERE email = 'test@example.com';
SELECT * FROM user_profiles WHERE user_id = 1;
```

#### Step 2: Login

1. Navigate to `/login`
2. Enter credentials:
   - **Email:** test@example.com
   - **Password:** Test123!@#
3. Click "Login"

**Expected result:**
- Redirected to `/dashboard`
- Token stored in localStorage
- User data fetched via `/auth/me`

**Browser DevTools check:**
```javascript
// Open Console (F12)
localStorage.getItem('access_token')
// Should return JWT token
```

---

### Phase 3: Create Interview

#### Step 1: Navigate to Dashboard
- URL: `http://localhost:3000/dashboard`
- Should see welcome message with username

#### Step 2: Create New Interview

Click "Create Interview" button (if available) or use API directly:

**Option A: Via Frontend (if UI exists)**
- Fill in job description
- Select interview type (technical/behavioral/mixed)
- Click "Create"

**Option B: Via API (Swagger UI)**
1. Go to `http://localhost:8000/docs`
2. Find `POST /interviews`
3. Click "Try it out"
4. Enter request body:
```json
{
  "interview_type": "mixed",
  "job_description": "We are looking for a Full Stack Developer with experience in React, Node.js, and PostgreSQL. The candidate should have strong problem-solving skills and experience with REST APIs."
}
```
5. Add Authorization header: `Bearer YOUR_TOKEN`
6. Execute

**Expected response:**
```json
{
  "id": 1,
  "user_id": 1,
  "interview_type": "mixed",
  "job_description": "We are looking for...",
  "status": "pending",
  "created_at": "2026-02-19T..."
}
```

**Database verification:**
```sql
SELECT * FROM interviews WHERE user_id = 1;
```

---

### Phase 4: Start Interview Session

#### Step 1: Start Interview via API
```bash
curl -X POST http://localhost:8000/interviews/1/start \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected response:**
```json
{
  "id": 1,
  "status": "in_progress",
  "started_at": "2026-02-19T..."
}
```

**Database check:**
```sql
SELECT id, status, started_at FROM interviews WHERE id = 1;
-- Should show status = 'in_progress'
```

#### Step 2: Navigate to Interview Session Page
- URL: `http://localhost:3000/interview/1`
- Should see split-screen transcript view
- Should see microphone button
- Should see connection status indicator

**Expected UI:**
```
┌─────────────────────────────────────────────────────┐
│ Interview Session #1              [Connected] [End] │
├──────────────────┬──────────────────────────────────┤
│      YOU         │        AI INTERVIEWER            │
├──────────────────┼──────────────────────────────────┤
│                  │ Hello! Welcome to the interview. │
│                  │ Let's start with a simple        │
│                  │ question: Can you tell me about  │
│                  │ yourself?                        │
│                  │                                  │
└──────────────────┴──────────────────────────────────┘
         [🎤 Click to start recording]
```

---

### Phase 5: Live Conversation Testing

#### Step 1: Check WebSocket Connection

**Browser Console (F12):**
```javascript
// Should see WebSocket logs:
"Connecting to WebSocket: ws://localhost:8000/ws/interview?interview_id=1&token=..."
"WebSocket connected"
"WebSocket message received: {type: 'connected', ...}"
```

**Backend logs should show:**
```
INFO:     WebSocket connection accepted: interview_id=1
INFO:     Interview session initialized: interview_id=1
INFO:     Sent AI greeting for interview 1
```

#### Step 2: Test Audio Recording

1. Click the microphone button to start recording
2. **Grant microphone permission** when browser prompts
3. Speak clearly: *"Hello, my name is Test User. I am a full stack developer with 3 years of experience in React and Node.js."*
4. Audio should be captured and sent via WebSocket

**Browser Console should show:**
```
Recording started
Received audio: 24576 bytes
Sent audio data: 24576 bytes
```

**Backend logs should show:**
```
INFO:     Received audio: 24576 bytes
INFO:     Transcribing audio file: /tmp/tmpXXXXXX.webm (24576 bytes)
INFO:     Transcription result: Hello, my name is Test User. I am a full stack developer with 3 years of experience in React and Node.js.
INFO:     User transcription: Hello, my name is Test User...
INFO:     Generating AI response...
INFO:     Generating AI audio...
INFO:     Sent AI audio response: 45678 bytes
```

#### Step 3: Verify Live Transcript Display

**Left Column (YOU):**
```
┌────────────────────┐
│ Hello, my name is  │
│ Test User. I am a  │
│ full stack         │
│ developer with 3   │
│ years of           │
│ experience...      │
│                    │
│ 9:04:23 PM         │
└────────────────────┘
```

**Right Column (AI INTERVIEWER):**
```
┌────────────────────┐
│ That's             │
│ interesting. Can   │
│ you walk me        │
│ through your most  │
│ recent project     │
│ mentioned in your  │
│ CV?                │
│                    │
│ 9:04:25 PM         │
└────────────────────┘
```

#### Step 4: Verify AI Audio Playback

- AI response should play automatically through browser
- Status should show "AI is thinking..." while processing
- After audio plays, ready for next user input

---

### Phase 6: Database Persistence

#### Check Messages Table

```sql
SELECT 
  id, 
  interview_id, 
  sender, 
  content, 
  sequence_number, 
  timestamp 
FROM messages 
WHERE interview_id = 1 
ORDER BY sequence_number;
```

**Expected output:**
```
id | interview_id | sender | content                          | sequence_number | timestamp
---+-------------+--------+----------------------------------+-----------------+-------------------
1  | 1           | ai     | Hello! Welcome to the interview. | 1               | 2026-02-19 21:04:20
2  | 1           | user   | Hello, my name is Test User...   | 2               | 2026-02-19 21:04:23
3  | 1           | ai     | That's interesting. Can you...   | 3               | 2026-02-19 21:04:25
```

#### Check Redis Cache

**Using RedisInsight (localhost:5540):**
```
Connect to redis://localhost:6379

Keys:
- interview:1:transcript
- interview:1:context

Commands:
> LRANGE interview:1:transcript 0 -1
> GET interview:1:context
```

---

### Phase 7: End Interview & Download Transcript

#### Step 1: End Interview

1. Click "End Interview" button
2. Confirm in modal dialog

**Backend API call:**
```
POST /interviews/1/end
```

**Expected response:**
```json
{
  "id": 1,
  "status": "completed",
  "completed_at": "2026-02-19T21:05:30.123Z"
}
```

**Database verification:**
```sql
SELECT id, status, started_at, completed_at FROM interviews WHERE id = 1;
-- Should show status = 'completed' with timestamp
```

#### Step 2: Download Transcript

1. Click "Download" button in interview session
2. File should download: `interview-1-transcript.txt`

**Expected file content:**
```
[9:04:20 PM] AI: Hello! Welcome to the interview. Let's start with a simple question: Can you tell me about yourself?

[9:04:23 PM] USER: Hello, my name is Test User. I am a full stack developer with 3 years of experience in React and Node.js.

[9:04:25 PM] AI: That's interesting. Can you walk me through your most recent project mentioned in your CV?

[9:04:28 PM] USER: In my most recent project, I built a real-time chat application using React, Node.js, and Socket.io...
```

---

## Troubleshooting Common Issues

### Issue 1: WebSocket Connection Fails

**Symptoms:**
- Browser shows "Disconnected"
- Console error: "WebSocket connection failed"

**Solutions:**
1. Check backend is running: `http://localhost:8000/health`
2. Verify JWT token is valid: Check localStorage
3. Check interview status is "in_progress"
4. Restart backend server

### Issue 2: Microphone Permission Denied

**Symptoms:**
- "Microphone permission denied" error
- Recording button disabled

**Solutions:**
1. Browser settings → Privacy → Microphone → Allow for localhost
2. Chrome: `chrome://settings/content/microphone`
3. Firefox: Permissions for `http://localhost:3000`
4. Reload page after granting permission

### Issue 3: No Audio Transcription

**Symptoms:**
- Audio sends but no transcript appears
- Backend logs show "Empty transcription"

**Solutions:**
1. Check Whisper model loaded: Backend startup logs
2. Speak louder and clearer
3. Check audio format: Should be WebM
4. Verify temporary file creation in backend
5. Check backend has ffmpeg installed (Whisper dependency)

### Issue 4: AI Response Not Playing

**Symptoms:**
- Transcript shows but no audio plays
- Console error on audio playback

**Solutions:**
1. Check browser audio permissions
2. Verify pyttsx3 TTS initialized successfully
3. Check audio data received in browser console
4. Try different browser (Chrome recommended)

### Issue 5: Database Connection Error

**Symptoms:**
- Backend error: "could not connect to server"
- API requests fail with 500 error

**Solutions:**
1. Verify Docker containers running: `docker ps`
2. Check PostgreSQL logs: `docker logs echo_ai_postgres`
3. Verify connection string in `.env`
4. Restart Docker: `docker-compose restart postgres`

---

## Performance Testing

### Latency Measurements

Test end-to-end latency from speech to response:

1. **User speaks** (t=0s)
2. **Audio buffered** (t=0-2s)
3. **STT processing** (t=2-4s) - Whisper transcription
4. **LLM generation** (t=4-4.5s) - Template-based
5. **TTS synthesis** (t=4.5-5.5s) - Pyttsx3
6. **Audio playback** (t=5.5s+)

**Target:** <6 seconds total latency

**Measure in browser:**
```javascript
const startTime = Date.now();
// ... after AI response received
console.log(`Latency: ${Date.now() - startTime}ms`);
```

---

## Success Criteria Checklist

### Backend ✅
- [ ] Docker services running (PostgreSQL, Redis)
- [ ] Backend server starts without errors
- [ ] Whisper STT model loads successfully
- [ ] Pyttsx3 TTS initializes
- [ ] WebSocket endpoint accepts connections
- [ ] JWT authentication works
- [ ] Messages saved to database
- [ ] Redis caching functional

### Frontend ✅
- [ ] Frontend builds and runs
- [ ] Login/Register works
- [ ] JWT token stored
- [ ] Interview creation successful
- [ ] Interview session page loads
- [ ] WebSocket connects
- [ ] Microphone permission granted
- [ ] Audio recording works
- [ ] Live transcript displays
- [ ] AI audio plays
- [ ] Download transcript works

### Data Flow ✅
- [ ] User audio → Backend
- [ ] STT transcription → Database
- [ ] LLM question generation
- [ ] TTS synthesis → Frontend
- [ ] Messages persisted in PostgreSQL
- [ ] Transcript cached in Redis
- [ ] Interview status updates correctly

---

## Demo Presentation Flow

### 1. Architecture Overview (2 minutes)
- Show docker-compose.yml
- Explain FastAPI + Next.js + PostgreSQL + Redis stack
- Mention WebSocket for real-time communication

### 2. Live Demo (5 minutes)

**Part A: User Journey**
1. Register → Login
2. Create interview with job description
3. Start interview session

**Part B: Real-time Conversation**
1. Click record → Speak
2. Show live transcription appearing
3. AI responds with voice + text
4. Continue conversation (2-3 exchanges)
5. End interview

**Part C: Data Persistence**
1. Show PgAdmin with messages table
2. Show RedisInsight with cached transcript
3. Download transcript file

### 3. Technical Deep Dive (3 minutes)
- Show WebSocket handler code
- Explain STT/TTS pipeline
- Discuss LLM integration (template-based for now)
- Future: pgvector for semantic search

---

## Future Enhancements

### Phase 2 (After Demo)
1. **WebRTC Integration** - Lower latency audio
2. **PGVector** - Semantic CV/JD matching
3. **Advanced LLM** - Fine-tuned interview model
4. **Emotion Analysis** - Voice prosody detection
5. **Analytics Dashboard** - Interview performance metrics

### Phase 3 (Production)
1. **Dockerize** backend + frontend
2. **CI/CD** pipeline
3. **Cloud deployment** (AWS/GCP)
4. **Monitoring** (Prometheus + Grafana)
5. **Load testing** (100+ concurrent users)

---

## Quick Reference Commands

```bash
# Start everything
docker-compose up -d && cd backend && uvicorn main:app --reload

# Stop everything
docker-compose down

# Reset database
docker-compose down -v
docker-compose up -d

# View logs
docker-compose logs -f postgres
docker-compose logs -f redis

# Backend logs
tail -f backend.log

# Frontend build
cd frontend && npm run build

# Run tests (when added)
cd backend && pytest
cd frontend && npm test
```

---

## Contact & Support

**Project:** EchoAI Interview Agent  
**Repository:** (Add GitHub URL)  
**Documentation:** See README.md  
**Issues:** Report in GitHub Issues

---

**Last Updated:** February 19, 2026  
**Version:** v0.1.0 (Demo)
