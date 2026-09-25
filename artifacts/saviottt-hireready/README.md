# CAREERCOPE AI

> *"Understand where your career is heading."*

CAREERCOPE AI is an evidence-based career intelligence platform that aggregates real-time job-market data across multiple major job providers (**Adzuna**, **The Muse**, and **Remotive**), normalizes and extracts verified skills and compensation metrics, and synthesizes structured career-market insights using **Google Gemini AI**.

---

## 1. Project Overview

Modern job seekers face fragmented and biased job-market signals. CAREERCOPE AI bridges this gap by:
1. **Aggregating Live Market Evidence**: Concurrently queries Adzuna, The Muse, and Remotive for any job title.
2. **Normalizing & Deduplicating**: Merges duplicates across providers and extracts standardized skills and salary metrics.
3. **Statistical Engine**: Computes verifiable metrics (demand volume, top skills, salary benchmarks, hiring companies, geographic distribution).
4. **AI Market Synthesis**: Sends sanitized statistical summaries to Google Gemini for structured, evidence-grounded insights.
5. **Interactive Visualizations**: World demand map (Leaflet.js & OpenStreetMap) and dynamic analytics charts (Chart.js).

> **Important Evidence-Based Principle**: The system **never** claims to predict the future with certainty. All projections are explicitly labeled as *"AI-generated outlook based on currently available data"* with highlighted limitations and transparency.

---

## 2. Technology Stack

- **Frontend**:
  - HTML5 & Vanilla CSS3 (Custom Dark Theme Design System, Glassmorphism)
  - Vanilla JavaScript (ES6+ modular architecture)
  - [Chart.js](https://www.chartjs.org/) for analytics charts
  - [Leaflet.js](https://leafletjs.com/) & [OpenStreetMap](https://www.openstreetmap.org/) for geographic demand mapping
- **Backend**:
  - Python 3.12+
  - [FastAPI](https://fastapi.tiangolo.com/) with asynchronous endpoint design
  - [HTTPX](https://www.python-httpx.org/) for high-concurrency non-blocking API requests
  - [Pydantic v2](https://docs.pydantic.dev/) for data schema validation and type safety
  - `python-dotenv` for secure environment variable management
  - Official Google GenAI SDK (`google-genai`) for Gemini AI integration
  - `pytest` & `pytest-asyncio` for comprehensive test coverage

---

## 3. Architecture & Data Flow

```
[ User Enters Job Title ]
           │
           ▼
[ FastAPI Backend: POST /api/career/analyze ]
           │
           ├───► Check 15-Minute In-Memory Cache
           │
           ├───► asyncio.gather() Concurrent API Queries
           │        ├── Adzuna API (with ADZUNA_APP_ID & ADZUNA_APP_KEY)
           │        ├── The Muse API (Public / MUSE_API_KEY)
           │        └── Remotive API (Public endpoint, no key required)
           │
           ├───► Normalization Service (Extract Skills, Salaries, Job Types)
           │
           ├───► Deduplication Engine (Cross-source matching by title & company)
           │
           ├───► Statistics Engine (Aggregates demand, percentages, medians)
           │
           ├───► Google Gemini API (Sends sanitized statistical summary)
           │        └── Structured JSON schema response
           │
           ▼
[ Frontend Career Market Dashboard ]
   ├── Key Metrics (Total Jobs, Salary, Top Skills)
   ├── Leaflet.js Interactive World Map
   ├── Chart.js Visualizations (Skills, Sources, Companies, Formats)
   ├── AI Signals (Observed, Opportunities, Risks/Uncertainties)
   ├── Future Outlook (1-Yr, 5-Yr, 10-Yr horizons with confidence score)
   └── Filterable Job Directory (Preserving original URLs and Remotive attribution)
```

---

## 4. Folder Structure

```
careercope-ai/
│
├── backend/
│   ├── main.py                     # FastAPI application entrypoint & static file server
│   ├── config.py                   # Environment loader & credential validator
│   ├── api/
│   │   └── career.py               # REST API endpoints (/api/career/analyze, /api/career/status)
│   ├── models/
│   │   └── schemas.py              # Pydantic schemas for requests, jobs, stats, AI report
│   ├── services/
│   │   ├── adzuna_service.py       # Official Adzuna API client
│   │   ├── muse_service.py         # The Muse API client
│   │   ├── remotive_service.py     # Remotive remote jobs client
│   │   ├── normalization_service.py# Data cleaning, salary parser, deduplication
│   │   ├── statistics_service.py   # Demand, salary, company, and skill aggregations
│   │   ├── career_analysis_service.py # Gemini GenAI SDK client & schema parser
│   │   └── cache_service.py        # 15-minute in-memory cache
│   └── utils/
│       └── text_processing.py      # HTML stripper, skill regex matcher, geo-coords
│
├── frontend/
│   ├── index.html                  # Responsive modern landing and dashboard view
│   ├── css/
│   │   ├── style.css               # Core styling, glassmorphism, radar loading animation
│   │   └── dashboard.css           # Metrics grid, map wrapper, charts, job cards
│   └── js/
│       ├── api.js                  # Frontend API client communicating with backend
│       ├── charts.js               # Chart.js renderers
│       ├── map.js                  # Leaflet.js map renderer
│       └── app.js                  # Application state, filters, and event orchestrator
│
├── tests/
│   ├── test_api.py                 # FastAPI endpoints & validation tests
│   ├── test_normalization.py       # Normalization, HTML stripping & deduplication tests
│   └── test_statistics.py          # Statistics calculation & salary math tests
│
├── requirements.txt                # Python dependencies
├── .env                            # Local environment variables (git-ignored)
├── .env.example                    # Template for required environment variables
├── .gitignore                      # Git exclusion rules
└── README.md                       # Complete documentation
```

---

## 5. Security & Credentials

### Absolute Security Policy
- **Zero API Secrets in Frontend**: Secrets are never present in HTML, JavaScript, CSS, or Git.
- **Frontend Isolation**: The frontend communicates **only** with the FastAPI backend. It never connects directly to Adzuna, The Muse, or Gemini.
- **Git Protection**: `.env` is permanently excluded via `.gitignore`.
- **Sanitized Prompts**: Gemini receives only aggregated statistical tables, never raw HTML or credentials.

### Environment Setup

Create `.env` using `.env.example` as a template:

```ini
ADZUNA_APP_ID=acc9c7cf
ADZUNA_APP_KEY=YOUR_NEW_ADZUNA_KEY

MUSE_API_KEY=YOUR_MUSE_KEY

GEMINI_API_KEY=YOUR_NEW_GEMINI_KEY
GEMINI_MODEL=gemini-2.5-flash

REMOTIVE_API_URL=https://remotive.com/api/remote-jobs
```

#### Credential Notes:
1. **Adzuna**:
   - Application ID: `acc9c7cf`
   - Application Key: Obtain or rotate from your [Adzuna Developer Dashboard](https://developer.adzuna.com/) and paste into `ADZUNA_APP_KEY`.
2. **The Muse**:
   - `MUSE_API_KEY` is optional for basic queries but recommended for higher rate limits.
3. **Remotive**:
   - Public API requires **no key**. Default URL: `https://remotive.com/api/remote-jobs`.
4. **Google Gemini**:
   - Obtain a key from [Google AI Studio](https://aistudio.google.com/) and paste into `GEMINI_API_KEY`.
   - `GEMINI_MODEL` defaults to `gemini-2.5-flash`.

---

## 6. Installation & Startup

### Prerequisites
- Python 3.12+ (or 3.10+)
- pip / virtualenv

### 1. Clone & Enter Project Directory
```bash
cd careercope-ai
```

### 2. Set Up Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Backend & Frontend
Launch the FastAPI application:
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

- **Backend API**: `http://localhost:8000`
- **Interactive API Docs (Swagger)**: `http://localhost:8000/docs`
- **Web Application**: Open `http://localhost:8000` in any web browser!
  *(The FastAPI backend automatically serves the frontend at the root path, while CORS also allows running the frontend independently on ports 5500 or 3000).*

---

## 7. Running Tests

Execute the automated test suite with pytest:

```bash
pytest tests/ -v
```

Tests cover:
- Health check and status validation endpoints
- Adzuna, The Muse, and Remotive job normalization
- Duplicate detection and source merging
- Statistical aggregations (total jobs, salary averages/medians, skill percentages)
- API validation and failure resilience

---

## 8. Source Attribution & Compliance

- **Adzuna**: Job listings link directly to Adzuna redirect URLs.
- **The Muse**: Listings link to original postings on The Muse platform.
- **Remotive**: Remotive listings explicitly display "Source: Remotive" and link to the canonical listing page on Remotive.com.

---

## 9. Known Limitations

1. **Employer Disclosures**: Salary averages are calculated strictly from postings that provide explicit compensation ranges.
2. **Sample Size**: The dataset reflects active listings returned by connected APIs during the search cycle and does not represent all jobs globally.
3. **Non-Predictive AI**: Gemini AI outputs represent strategic synthesis of current market evidence, not a guaranteed projection of future job counts.
