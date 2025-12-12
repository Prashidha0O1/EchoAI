# EchoAI Interview Agent - Complete Plan

## Project Overview
EchoAI is an AI-powered interview practice platform that helps users prepare for job interviews. Users upload their CV and Job Description, and the system generates realistic interview questions with real-time voice interaction.

---

## System Architecture

### High-Level Flow
```
User Login → Create Interview → Upload CV/JD → Interview Session
                                                        ↓
                                            AI Interviewer (LLM)
                                                        ↓
                                        Real-time Voice Conversation
                                                        ↓
                                    Transcription + Feedback + Recording
```

### Technology Stack
- **Backend**: FastAPI (Python)
- **Database**: SQLite (dev) → PostgreSQL (production)
- **STT**: OpenAI Whisper → Faster Whisper
- **TTS**: pyttsx3 → Piper TTS / Coqui TTS
- **LLM**: Fine-tuned model for interview questions
- **Real-time**: WebSocket + WebRTC
- **Audio Processing**: VAD (Voice Activity Detection)

---

## Backend Architecture

### Current Structure
```
backend/
├── main.py              # FastAPI app with WebSocket & WebRTC endpoints
├── database/            # Database models and migrations
├── speech_pipeline/     # Speech processing modules
│   ├── interface.py     # Abstract Base Classes (STTProvider, TTSProvider)
│   ├── stt/
│   │   └── whisper_stt.py
│   ├── tts/
│   │   └── pyttsx3_tts.py
│   └── webrtc.py        # WebRTC media handling
├── routers/             # API routes (future)
├── models.py            # Database models
├── schemas.py           # Pydantic schemas
└── config.py            # Configuration
```

### API Endpoints
- `GET /` - Health check
- `POST /offer` - WebRTC signaling
- `WS /ws/interview` - WebSocket for real-time audio
- `POST /api/v1/auth/register` - User registration (planned)
- `POST /api/v1/auth/login` - User login (planned)
- `POST /api/v1/interview/create` - Create interview session (planned)

---

## Speech Pipeline Architecture

### Real-time Conversation Flow
```
User Speaks → WebRTC Audio Stream → VAD Detection → Buffer Audio
                                          ↓
                                    Speech Detected?
                                          ↓
                              Accumulate until Silence
                                          ↓
                                    STT Processing
                                          ↓
                                    Transcription Text
                                          ↓
                          LLM Question Generation (Context: CV + JD)
                                          ↓
                                    TTS Processing
                                          ↓
                              Audio Response Stream
                                          ↓
                                  Client Playback
```

### Pipeline Components

#### 1. Voice Activity Detection (VAD)
- **Purpose**: Detect when user starts/stops speaking
- **Current**: None (to be implemented)
- **Recommended**: Silero VAD
- **Latency**: <10ms
- **Benefits**: Reduces unnecessary STT processing, better user experience

#### 2. Audio Buffering
- **Strategy**: Accumulate audio frames until silence detected
- **Buffer Size**: 1-3 seconds (16kHz, 16-bit PCM)
- **Implementation**: Queue-based with async workers

#### 3. Speech-to-Text (STT)
- **Current**: OpenAI Whisper (base model)
- **Issues**: Slow (~2-5s for 3s audio), blocks event loop
- **Recommended**: Faster Whisper (CTranslate2)
- **Improvements**: 2-4x faster, same accuracy
- **Alternatives**:
  - Vosk (offline, fast, lower quality)
  - Wav2Vec 2.0 (specialized models)
  - Cloud APIs (Google Speech-to-Text, Deepgram)
- **Target Latency**: 500-1000ms

#### 4. Text-to-Speech (TTS)
- **Current**: pyttsx3 (system voices)
- **Issues**: Blocking, file-based, robotic quality
- **Recommended**: Piper TTS (fast, offline)
- **Alternatives**:
  - Coqui TTS (VITS) - high quality, 200-500ms
  - Bark - expressive, multilingual, slow
  - ElevenLabs API - cloud, highest quality
- **Target Latency**: 200-500ms

#### 5. LLM Integration
- **Purpose**: Generate contextual interview questions based on CV/JD
- **Options**:
  - Local: Llama 3.1 8B via Ollama
  - Cloud: OpenAI GPT-4, Claude 3.5 Sonnet
  - Fine-tuned: Custom model for interview scenarios
- **Context Management**:
  - Parse CV and JD on upload
  - Maintain conversation history
  - Generate follow-up questions
- **Target Latency**: 500-2000ms

---

## Implementation Phases

### ✅ Completed
- [x] FastAPI server setup
- [x] WebSocket endpoint for audio
- [x] WebRTC signaling endpoint
- [x] Basic STT with Whisper
- [x] Basic TTS with pyttsx3
- [x] Modular speech pipeline interface
- [x] Test clients (WebSocket & WebRTC)

### Phase 1: Optimize Speech Pipeline (1-2 days)
**Goal**: Reduce latency and improve real-time performance

- [ ] Install Faster Whisper
  ```bash
  pip install faster-whisper
  ```
- [ ] Create `faster_whisper_stt.py` provider
- [ ] Install Silero VAD
  ```bash
  pip install silero-vad
  ```
- [ ] Implement VAD in WebRTC handler
- [ ] Install Piper TTS
  ```bash
  pip install piper-tts
  ```
- [ ] Create `piper_tts.py` provider
- [ ] Implement async audio buffering
- [ ] Test end-to-end latency (target: <2s)

### Phase 2: Separate STT/TTS Services (2-3 days)
**Goal**: Decouple models for better scalability

- [ ] Create `stt_service.py` - standalone FastAPI app
  - Endpoint: `POST /transcribe` (audio bytes → text)
  - Health check: `GET /health`
- [ ] Create `tts_service.py` - standalone FastAPI app
  - Endpoint: `POST /synthesize` (text → audio bytes)
  - Health check: `GET /health`
- [ ] Update main backend to use HTTP clients
- [ ] Add retry logic and error handling
- [ ] Create Docker Compose for multi-service deployment
- [ ] Document service APIs

### Phase 3: Database & Authentication (2-3 days)
**Goal**: User management and session persistence

- [ ] Set up SQLAlchemy models
  - User (id, email, hashed_password, created_at)
  - Interview (id, user_id, job_description, cv_text, status, created_at)
  - Conversation (id, interview_id, transcript, created_at)
- [ ] Implement JWT authentication
  - `/api/v1/auth/register`
  - `/api/v1/auth/login`
  - `/api/v1/auth/me`
- [ ] Create interview CRUD endpoints
  - `POST /api/v1/interview/create`
  - `GET /api/v1/interview/{id}`
  - `GET /api/v1/interview/list`
- [ ] Add file upload for CV/JD (PDF, DOCX)
- [ ] Implement text extraction from files

### Phase 4: LLM Integration (3-5 days)
**Goal**: Intelligent interview question generation

- [ ] Set up Ollama with Llama 3.1 8B
  ```bash
  ollama pull llama3.1:8b
  ```
- [ ] Design interview prompts
  - System prompt: "You are an experienced interviewer..."
  - Include CV and JD context
  - Maintain conversation history
- [ ] Create `llm_service.py`
  - Function: `generate_question(cv, jd, history) → question`
  - Function: `generate_followup(context, user_answer) → question`
- [ ] Integrate LLM in WebRTC conversation loop
- [ ] Add streaming responses for faster perceived latency
- [ ] Implement conversation memory management

### Phase 5: Task Queue & Scaling (2-3 days)
**Goal**: Handle concurrent users and long-running tasks

- [ ] Install Redis
- [ ] Set up Celery workers
  ```bash
  pip install celery[redis]
  ```
- [ ] Move STT/TTS to async tasks
- [ ] Implement result caching (common responses)
- [ ] Add task monitoring (Flower)
- [ ] Load testing with locust

### Phase 6: Production Optimization (Ongoing)
**Goal**: Performance, reliability, monitoring

- [ ] GPU acceleration for models (CUDA)
- [ ] Model quantization (int8, int4)
- [ ] Implement rate limiting
- [ ] Add logging (structured JSON)
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Add error tracking (Sentry)
- [ ] Create deployment scripts (Docker + K8s)
- [ ] Write API documentation (Swagger)
- [ ] Security audit (OWASP)

---

## Model Serving Options

### Option 1: In-Process (Current)
```
FastAPI ← [STT, TTS, LLM in same process]
```
**Pros**: Simple, low latency  
**Cons**: Limited scale, single point of failure

### Option 2: Microservices (Recommended)
```
API Gateway (FastAPI)
    ├── STT Service (HTTP/gRPC)
    ├── TTS Service (HTTP/gRPC)
    └── LLM Service (HTTP/gRPC)
```
**Pros**: Scalable, independent deployment  
**Cons**: Network latency, complex infrastructure

### Option 3: Hybrid (Best for Production)
```
API Gateway + WebRTC
    ├── Redis Task Queue
    ├── Celery Workers (STT, TTS, LLM)
    └── PostgreSQL (sessions, users)
```
**Pros**: Best of both worlds  
**Cons**: Requires DevOps expertise

---

## Technical Specifications

### Audio Format
- **Sample Rate**: 16kHz (downsample from 48kHz WebRTC)
- **Channels**: Mono
- **Bit Depth**: 16-bit PCM
- **Chunk Size**: 20ms frames (320 samples @ 16kHz)

### Latency Budget
| Component | Target Latency |
|-----------|----------------|
| VAD       | <10ms          |
| STT       | 500-1000ms     |
| LLM       | 500-2000ms     |
| TTS       | 200-500ms      |
| **Total** | **1.5-3.5s**   |

### Model Recommendations

#### Development
- **STT**: Faster Whisper (base or small)
- **TTS**: Piper TTS (fast, offline)
- **VAD**: Silero VAD
- **LLM**: Llama 3.1 8B (Ollama)

#### Production
- **STT**: Faster Whisper (medium) with GPU
- **TTS**: Coqui TTS (VITS) or ElevenLabs API
- **VAD**: Silero VAD
- **LLM**: GPT-4 or Claude 3.5 Sonnet

---

## Deployment Strategy

### Development
```bash
cd backend
python -m uvicorn main:app --reload
```

### Staging (Docker Compose)
```yaml
services:
  api:
    build: ./backend
    ports: ["8000:8000"]
  stt:
    build: ./stt_service
  tts:
    build: ./tts_service
  redis:
    image: redis:alpine
  postgres:
    image: postgres:15
```

### Production (Kubernetes)
- API Gateway: 3 replicas (auto-scale)
- STT Service: GPU nodes (T4 or A10)
- TTS Service: CPU nodes (optimize with quantization)
- Database: Managed PostgreSQL (AWS RDS, Azure)
- Monitoring: Prometheus, Grafana, ELK stack

---

## Security Considerations
- [ ] HTTPS/WSS only (no HTTP)
- [ ] JWT token expiration (15 min access, 7 day refresh)
- [ ] Rate limiting (10 requests/min per user)
- [ ] Input validation (Pydantic schemas)
- [ ] SQL injection prevention (SQLAlchemy ORM)
- [ ] File upload scanning (virus, size limits)
- [ ] CORS configuration (whitelist domains)
- [ ] Secrets management (environment variables, Vault)

---

## Testing Strategy
- **Unit Tests**: pytest for services
- **Integration Tests**: Test WebRTC flow end-to-end
- **Load Tests**: locust for concurrent users
- **Audio Tests**: Sample recordings for STT/TTS quality
- **Manual Tests**: Real interview simulations

---

## Success Metrics
- **Latency**: <3s end-to-end response time
- **Accuracy**: >90% STT word accuracy
- **Quality**: TTS naturalness score >4/5
- **Uptime**: 99.5% availability
- **Users**: Support 100 concurrent users

---

## Next Immediate Steps
1. ✅ Review this plan
2. Start Phase 1: Install Faster Whisper
3. Implement VAD in WebRTC handler
4. Benchmark latency improvements
5. Move to Phase 2 if latency is acceptable

---

## Resources & Documentation
- [Faster Whisper GitHub](https://github.com/guillaumekln/faster-whisper)
- [Silero VAD](https://github.com/snakers4/silero-vad)
- [Piper TTS](https://github.com/rhasspy/piper)
- [Coqui TTS](https://github.com/coqui-ai/TTS)
- [Ollama](https://ollama.ai/)
- [aiortc](https://github.com/aiortc/aiortc)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
