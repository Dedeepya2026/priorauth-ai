# PriorAuth AI

**AI-Powered Prior Authorization & Clinical Documentation Platform**

PriorAuth AI streamlines the prior authorization workflow for mid-sized outpatient healthcare groups. It combines document ingestion, AI-assisted packet generation, clinical note drafting, and denial analytics into a single HIPAA-sensitive platform.

---

## Features

| Feature | Description |
|---------|-------------|
| **PA Workbench** | Upload intake/referral documents (PDF), extract clinical data, generate payer-aligned PA packets |
| **Documentation Assistant** | Draft SOAP/H&P notes with AI-suggested ICD-10 and CPT codes |
| **Appeal Generator** | Auto-generate appeal letters with case/policy references for denied PAs |
| **Denial Analytics** | Track denial reasons, turnaround times, top denied procedures, and payer trends |
| **Role-Based Access** | Nurse coordinators, providers, and managers see role-appropriate views |
| **Error Handling** | Global error boundaries, structured API errors, toast notifications on every action |
| **Mobile Responsive** | Full responsive design with hamburger menu, adaptive grids, and touch-optimized tables |

---

## Architecture

```
Frontend (Next.js)         Backend (FastAPI)         Database
┌──────────────────┐       ┌──────────────────┐      ┌──────────┐
│ React 19 + TS    │──────▶│ Python 3.11+     │─────▶│ SQLite   │
│ Port 3000        │       │ Port 8000         │      │ (local)  │
│                  │       │                   │      └──────────┘
│ • Toast system   │       │ • Global error    │
│ • Error boundary │       │   handlers        │      Services
│ • Form validate  │       │ • Field validate  │      ┌──────────────┐
│ • Loading states │       │ • Request logging │      │ pdfplumber   │
│ • 3 breakpoints  │       │ • JWT + RBAC      │      │ Mock AI      │
└──────────────────┘       └──────────────────┘      │ Local files  │
                                                      └──────────────┘
```

---

## Quick Start

### Prerequisites

- **Python 3.11+** (for backend)
- **Node.js 18+** (for frontend)

### 1. Clone & Set Up Environment

```bash
cp .env.example .env
# Edit .env — at minimum set a strong JWT_SECRET
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt    # Install dependencies
python seed.py                     # Seed demo data (6 users, 8 patients, 20 PAs)
python -m uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Open

Navigate to **http://localhost:3000** and log in:

| Role | Email | Password |
|------|-------|----------|
| Nurse Coordinator | `nurse@clinic.com` | `password123` |
| Provider | `doctor@clinic.com` | `password123` |
| Manager | `manager@clinic.com` | `password123` |

---

## Project Structure

```
priorauth-ai/
├── .env.example                    # Environment template
├── .gitignore
├── README.md
├── backend/
│   ├── main.py                     # FastAPI app + global error handlers
│   ├── config.py                   # Pydantic settings
│   ├── database.py                 # SQLAlchemy setup
│   ├── models.py                   # ORM models (User, Patient, PA, etc.)
│   ├── schemas.py                  # Validated Pydantic schemas
│   ├── seed.py                     # Demo data seeder
│   ├── routers/
│   │   ├── auth.py                 # Register, login, RBAC
│   │   ├── documents.py            # Upload + PDF extraction
│   │   ├── pa_requests.py          # PA CRUD, packet/appeal generation
│   │   ├── clinical_notes.py       # SOAP/H&P notes + AI assist
│   │   └── analytics.py            # Denial analytics
│   └── services/
│       ├── auth_service.py         # JWT + password hashing
│       ├── document_service.py     # Local file store + pdfplumber
│       └── ai_service.py           # Mock AI (swap for real LLM)
└── frontend/
    ├── app/
    │   ├── layout.tsx              # Root layout (ErrorBoundary + Toast)
    │   ├── page.tsx                # Dashboard
    │   ├── login/page.tsx          # Login with demo accounts
    │   ├── pa-workbench/page.tsx   # PA Workbench
    │   ├── pa-requests/[id]/       # PA Detail (tabbed)
    │   ├── clinical-notes/page.tsx # Clinical documentation
    │   └── analytics/page.tsx      # Denial analytics dashboard
    ├── components/
    │   ├── AppShell.tsx            # Sidebar + mobile toggle
    │   ├── Toast.tsx               # Toast notification system
    │   ├── ErrorBoundary.tsx       # React error boundary
    │   └── LoadingState.tsx        # Loading/skeleton/empty reusables
    └── lib/
        └── api.ts                  # API client wrapper
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | No | Register new user |
| `POST` | `/api/auth/login` | No | Login, returns JWT |
| `GET` | `/api/auth/me` | Yes | Current user info |
| `POST` | `/api/documents/upload` | Yes | Upload document (PDF/image) |
| `GET` | `/api/documents/` | Yes | List documents |
| `POST` | `/api/pa-requests/` | Yes | Create PA request |
| `GET` | `/api/pa-requests/` | Yes | List PA requests (filter by status) |
| `PATCH` | `/api/pa-requests/{id}` | Yes | Update PA request |
| `POST` | `/api/pa-requests/{id}/generate-packet` | Yes | AI-generate PA packet |
| `POST` | `/api/pa-requests/{id}/generate-appeal` | Yes | AI-generate appeal letter |
| `GET` | `/api/pa-requests/patients` | Yes | List patients |
| `POST` | `/api/clinical-notes/` | Yes | Create clinical note |
| `POST` | `/api/clinical-notes/{id}/ai-assist` | Yes | Get AI suggestions + codes |
| `GET` | `/api/analytics/overview` | Yes | Denial analytics overview |

---

## Error Handling

### Backend
- **Global exception handlers** catch validation errors (422), value errors (400), and unhandled exceptions (500)
- **Field validators** on all Pydantic schemas enforce email format, password length, code format, valid enum values
- **Request logging** middleware logs all incoming/outgoing requests with status codes

### Frontend
- **Error Boundary** catches rendering crashes with a reload option
- **Toast notifications** on every user action (create, generate, upload, login)
- **Form validation** with inline error messages on all required fields
- **Loading skeletons** and spinner states on every data-fetching page
- **Error states** with retry buttons when API calls fail

---

## Mobile Responsive

Three responsive breakpoints ensure a great experience on any device:

| Breakpoint | Layout Changes |
|------------|----------------|
| `< 1024px` | Narrower sidebar, 2-column KPI grid, stacked clinical grid |
| `< 768px` | Sidebar collapses to hamburger menu, single-column layout, touch-optimized tables |
| `< 480px` | Full-width KPI cards, stacked action buttons, compact action row |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Vanilla CSS, Inter font, glassmorphism design |
| Backend | FastAPI, Python 3.11+, SQLAlchemy |
| Database | SQLite (local), PostgreSQL-ready |
| Auth | JWT (python-jose), bcrypt password hashing |
| Documents | pdfplumber PDF extraction, local file storage |
| AI | Mock service (designed for LLM API swap) |
