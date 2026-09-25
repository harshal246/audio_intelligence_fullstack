# 🎙️ AudioPulse AI — Audio Intelligence & Diarization Fullstack Platform

> A full-stack audio intelligence and transcription platform combining **FastAPI**, **PostgreSQL with pgvector**, **Redis / Celery**, **Google Gemini AI**, and a modern **React + Vite** single-page application.

---

## 🌟 Key Highlights

- **Multi-Speaker Diarization & Transcription:** Ingest any audio format (`.wav`, `.mp3`, `.m4a`, `.flac`, `.ogg`, `.webm`, `.mp4`) and extract speaker turns (`SPEAKER_01`, `SPEAKER_02`) with exact time intervals and clean formatting powered by Gemini.
- **Audio Intelligence RAG Assistant (Q&A Bot):** Ask natural-language questions across your entire audio archive. Answers are powered by pgvector semantic embeddings search and conversational context.
- **Executive Analyst Summaries:**
  - **Daily Aggregated Brief:** Generate structured executive summaries for any specific day across all meetings and discussions.
  - **Multi-Transcript Synthesis:** Select multiple recorded meetings to generate a cross-meeting analytical report.
- **Transcripts Library & Playback:** Manage, search, stream, and export your audio recordings and diarization turns.
- **Full Authentication Flow:** Secure JWT token authentication with automated refresh, OTP email password reset, and GDPR-compliant account deletion.

---

## 📁 Repository Structure

```
audio_intelligence_fullstack/
├── docker-compose.yml             # Fullstack container orchestration (DB, Redis, API, Worker, Web)
├── .gitignore                     # Monorepo ignore rules
├── README.md                      # Documentation
│
├── backend/                       # FastAPI REST API & Worker
│   ├── app/
│   │   ├── api/                   # API routers (auth, transcript, chat, summary, config)
│   │   ├── database/              # PostgreSQL & pgvector setup
│   │   ├── jobs/                  # Celery background embedding & cleanup tasks
│   │   ├── middleware/            # Token annotation & CORS middleware
│   │   ├── models/                # SQLAlchemy database models
│   │   ├── schemas/               # Pydantic request/response schemas
│   │   ├── services/              # Gemini, Diarization, S3, Whisper, Chat RAG services
│   │   └── utils/                 # Auth & email helpers
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/                      # Vite + React Glassmorphic SPA
    ├── src/
    │   ├── components/            # UI components (Navbar, Transcribe, Chat, Summary, Archive, Modals)
    │   ├── api.js                 # API client with token refresh & retry logic
    │   ├── App.jsx                # Main application orchestrator
    │   ├── App.css
    │   └── index.css              # Obsidian Deep Space Glassmorphism design system
    ├── package.json
    ├── Dockerfile
    └── vite.config.js
```

---

## 🚀 Quick Start Guide

### Option 1: Running with Docker Compose (Recommended)

1. **Configure Environment Variables:**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Add your `GEMINI_API_KEY`, `SECRET_KEY`, and database settings in `backend/.env`.

2. **Launch all services:**
   ```bash
   docker compose up --build
   ```

- **Frontend App:** [http://localhost:3000](http://localhost:3000)
- **Backend API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option 2: Running Locally for Development

#### 1. Start Database & Redis:
```bash
docker compose up -d db redis
```

#### 2. Start the Backend API & Celery Worker:
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
In a separate terminal, launch the Celery background worker:
```bash
celery -A app.celery_app worker --loglevel=info
```

#### 3. Start the Frontend App:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🛠️ API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register new user account |
| `POST` | `/auth/login` | Log in and receive JWT tokens |
| `POST` | `/auth/refresh` | Refresh expired access token |
| `POST` | `/auth/forgot-password` | Request 6-digit OTP reset code |
| `POST` | `/auth/verify-otp` | Verify 6-digit OTP code |
| `POST` | `/auth/reset-password` | Set new password |
| `POST` | `/transcribe/simple` | Upload audio for Gemini diarization or save text |
| `GET` | `/transcribe/` | List all user transcripts and summaries |
| `GET` | `/transcribe/{id}` | Inspect full speaker turns and diarized segments |
| `DELETE` | `/transcribe/{id}` | Delete transcript, vector embeddings, and audio |
| `POST` | `/chat/ask` | Ask conversational RAG question over audio recordings |
| `GET` | `/chat/sessions` | Fetch chat history and conversation sessions |
| `POST` | `/summary/preview` | Generate and save daily aggregated summary |
| `POST` | `/summary/custom` | Generate multi-transcript synthesized brief |

---

## 🛡️ License & Credits

Built with ❤️ using Google Gemini, FastAPI, pgvector, and React.
