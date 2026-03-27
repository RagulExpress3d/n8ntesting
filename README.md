# Solidworks & CAD Localization Tool

Full-stack application for translating technical `.docx` and `.pdf` documents with:
- Source language auto-detection
- Target language selection (English, German, Japanese, French, Chinese, and more)
- Output mode toggle (`Raw Text` or `Preserved Formatting`)
- CAD glossary-aware translation for Solidworks terminology
- Processing progress tracking via async jobs

## Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express + Gemini 1.5 Pro API

## Project Structure

- `frontend/`: UI for upload, translation controls, progress tracking, and results
- `backend/`: API for file ingestion, parsing, language detection, and translation jobs

## Prerequisites

- Node.js 20+
- npm 10+
- Gemini API key

## Setup

1. Install dependencies:

```bash
cd frontend && npm install
cd ../backend && npm install
```

2. Configure environment:

```bash
cp backend/.env.example backend/.env
```

Set `GEMINI_API_KEY` in `backend/.env`.

## Run

Start backend:

```bash
cd backend
npm run dev
```

Start frontend:

```bash
cd frontend
npm run dev
```

Frontend runs on Vite (default `http://localhost:5173`) and proxies `/api` to backend (`http://localhost:8080`).

## API Endpoints

- `POST /api/translation/translate`
  - `multipart/form-data` fields:
    - `document`: `.docx` or `.pdf`
    - `targetLanguage`: e.g. `German`
    - `mode`: `raw` or `preserved`
  - Returns: `{ "jobId": "..." }`

- `GET /api/translation/jobs/:id`
  - Returns job status, progress, and result when completed.

## Translation Logic

- `Raw Text` mode:
  - Extract plain text and translate directly.

- `Preserved Formatting` mode:
  - Extract structured source content (DOCX HTML / PDF text fallback),
  - Prompt Gemini to return structured Markdown preserving headings, lists, and tables.

- CAD glossary layer:
  - Enforces consistent technical terminology for terms such as Mates, Sketches, Assemblies, Drawings, and Simulation.
