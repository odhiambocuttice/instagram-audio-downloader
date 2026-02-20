# 🎵 InstaAudio — Instagram Audio Downloader

A full-stack web app to extract high-quality MP3 audio from Instagram Reels & videos, with a Spotify-inspired UI, in-browser playback, and a visual waveform editor for trimming & merging clips.

![Stack](https://img.shields.io/badge/Django-REST_API-092E20?style=flat&logo=django)
![Stack](https://img.shields.io/badge/Next.js-Frontend-000000?style=flat&logo=next.js)
![Stack](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=flat&logo=postgresql)
![Stack](https://img.shields.io/badge/FFmpeg-Audio_Processing-007808?style=flat&logo=ffmpeg)

---

## ✨ Features

- **Paste & Extract** — Drop one or more Instagram URLs, get MP3s
- **Spotify-Style UI** — Dark theme, green accents, album art hero, track list layout
- **In-Browser Player** — Play/pause, seek bar, volume, skip, auto-advance
- **Waveform Editor** — Visual trimming with WaveSurfer.js drag handles
- **Multi-Clip Merge** — Select multiple regions, export as one merged MP3
- **Server-Side Processing** — FFmpeg handles cutting & stitching for quality
- **Real-Time Progress** — Live status polling with animated equalizer bars
- **Keyboard Shortcuts** — `⌘+Enter` to submit

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│  Next.js Frontend (:3000)       │
│  ├─ Spotify-style UI            │
│  ├─ Audio player bar            │
│  └─ WaveSurfer.js editor        │
└─────────────┬───────────────────┘
              │ REST API
┌─────────────▼───────────────────┐
│  Django Backend (:8000)         │
│  ├─ /api/download/   (extract)  │
│  ├─ /api/downloads/  (list)     │
│  ├─ /api/edit/       (cut/merge)│
│  ├─ yt-dlp           (download) │
│  └─ ffmpeg           (process)  │
└─────────────┬───────────────────┘
              │
┌─────────────▼───────────────────┐
│  PostgreSQL (instaaudio)        │
│  └─ download tasks & metadata   │
└─────────────────────────────────┘
```

---

## 📋 Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Python** | 3.9+ | Django backend |
| **Node.js** | 18+ | Next.js frontend |
| **PostgreSQL** | 14+ | Database |
| **FFmpeg** | 6+ | Audio extraction & editing |

---

## 🚀 Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/insta.git
cd insta
```

### 2. Backend (Django)

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install django djangorestframework django-cors-headers psycopg2-binary yt-dlp

# Download FFmpeg binaries (macOS Apple Silicon)
mkdir -p backend/bin
curl -L https://evermeet.cx/ffmpeg/getrelease/ffmpeg -o /tmp/ffmpeg.zip
curl -L https://evermeet.cx/ffmpeg/getrelease/ffprobe -o /tmp/ffprobe.zip
unzip /tmp/ffmpeg.zip -d backend/bin/
unzip /tmp/ffprobe.zip -d backend/bin/
chmod +x backend/bin/ffmpeg backend/bin/ffprobe
```

> **Linux/Intel Mac:** Download the appropriate FFmpeg static build from [ffmpeg.org](https://ffmpeg.org/download.html) and place binaries in `backend/bin/`.

### 3. Database

```bash
# Create the PostgreSQL database
createdb instaaudio

# Run migrations
python backend/manage.py migrate
```

> **Note:** Update `backend/backend/settings.py` if your PostgreSQL user, password, or host differs from the defaults.

### 4. Frontend (Next.js)

```bash
cd frontend
npm install
cd ..
```

### 5. Run the app

Open **two terminals**:

```bash
# Terminal 1 — Django backend
source .venv/bin/activate
python backend/manage.py runserver 8000
```

```bash
# Terminal 2 — Next.js frontend
cd frontend
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/download/` | Submit Instagram URLs for extraction |
| `GET` | `/api/download/<id>/` | Check download task status |
| `GET` | `/api/download/<id>/file/` | Download or stream the MP3 |
| `GET` | `/api/downloads/` | List recent download tasks |
| `POST` | `/api/edit/` | Cut & merge audio segments |
| `GET` | `/api/edit/<id>/file/` | Download or stream the edited MP3 |

### Submit Download

```bash
curl -X POST http://localhost:8000/api/download/ \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://www.instagram.com/reel/ABC123/"]}'
```

### Edit / Merge Audio

```bash
curl -X POST http://localhost:8000/api/edit/ \
  -H "Content-Type: application/json" \
  -d '{
    "segments": [
      {"task_id": "uuid-here", "start": 0, "end": 5.5},
      {"task_id": "uuid-here", "start": 10, "end": 18.3}
    ],
    "name": "my_mix"
  }'
```

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, TypeScript, WaveSurfer.js |
| **Styling** | Vanilla CSS (Spotify design system) |
| **Backend** | Django 4.2, Django REST Framework |
| **Database** | PostgreSQL 16 |
| **Audio** | yt-dlp (download), FFmpeg (processing) |
| **Font** | Plus Jakarta Sans |

---

## 📁 Project Structure

```
insta/
├── backend/
│   ├── backend/           # Django project settings
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── downloader/        # Main Django app
│   │   ├── models.py      # DownloadTask model
│   │   ├── views.py       # API views (download, edit, stream)
│   │   ├── tasks.py       # Background download with yt-dlp
│   │   ├── serializers.py # DRF serializers
│   │   └── urls.py        # API routing
│   ├── bin/               # ffmpeg & ffprobe (git-ignored)
│   ├── media/             # Downloaded MP3s (git-ignored)
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css    # Spotify design system
│   │   │   ├── editor.css     # Waveform editor styles
│   │   │   ├── layout.tsx     # Root layout
│   │   │   └── page.tsx       # Main page + player
│   │   ├── components/
│   │   │   └── AudioEditor.tsx # WaveSurfer waveform editor
│   │   └── lib/
│   │       └── api.ts         # API client functions
│   ├── package.json
│   └── tsconfig.json
├── instagram_audio_downloader.py  # Original standalone script
├── .gitignore
└── README.md
```

---

## 📝 License

MIT
