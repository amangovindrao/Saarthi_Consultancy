<div align="center">

# 🧭 Saarthi Consultancy

### _Your guide to the right expert — book doctors & teachers, chat with an AI, all in one place._

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.138-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img alt="Python" src="https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img alt="SQLAlchemy" src="https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img alt="JWT" src="https://img.shields.io/badge/Auth-JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-DB-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
</p>

<p>
  <img alt="Status" src="https://img.shields.io/badge/status-active-success?style=flat-square" />
  <img alt="Roles" src="https://img.shields.io/badge/RBAC-User%20%7C%20Expert%20%7C%20Admin-blueviolet?style=flat-square" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
  <img alt="PRs" src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" />
</p>

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Data Model (ERD)](#-data-model-erd)
- [Booking Flow](#-booking-flow)
- [Features by Role](#-features-by-role)
- [Feature Status](#-feature-status)
- [Project Stats](#-project-stats)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Default Credentials](#-default-credentials)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Overview

**Saarthi Consultancy** is a full-stack consultation marketplace that connects users with verified **doctors** and **teachers**. Users browse experts, book online or in-person sessions through a multi-step wizard, message their expert after booking, and get instant help from a built-in AI assistant. Experts manage their own workspace, and admins verify experts and oversee the whole platform.

> **Saarthi** (सारथी) means _"charioteer / guide"_ — the platform that steers you to the right expert. 🧭

```
┌──────────────┐      JWT / REST      ┌──────────────┐      SQLAlchemy ORM      ┌──────────────┐
│   Next.js    │  ───────────────────▶│   FastAPI    │  ──────────────────────▶ │    SQLite    │
│  (Frontend)  │ ◀─────────────────── │  (Backend)   │ ◀──────────────────────  │  (Database)  │
└──────────────┘      JSON            └──────────────┘                          └──────────────┘
```

---

## 🧰 Tech Stack

| Layer | Technology | Notes |
|------|-----------|-------|
| **Frontend** | Next.js 16 (App Router), React 19 | File-based routing, client components |
| **Styling** | Tailwind CSS 4 | Glassmorphism, gradients, `rounded-2xl`, CSS animations |
| **HTTP Client** | Axios | Interceptor injects JWT from `localStorage` |
| **Backend** | FastAPI 0.138 | Async-ready REST API + auto OpenAPI docs |
| **ORM** | SQLAlchemy 2.0 | Typed `Mapped[...]` models |
| **Database** | SQLite | Drop-in upgradeable to PostgreSQL via `DATABASE_URL` |
| **Auth** | JWT (`python-jose`) + `passlib`/`bcrypt` | Role-based access control (RBAC) |
| **Validation** | Pydantic 2 | Request/response schemas |
| **AI** | Rule-based engine | Keyword intent matching (LLM-ready) |

---

## 🏗 System Architecture

```mermaid
flowchart LR
    subgraph Client["🖥️ Frontend — Next.js"]
        UI[Pages & Components]
        AX[Axios + JWT Interceptor]
        UI --> AX
    end

    subgraph Server["⚙️ Backend — FastAPI"]
        R[routes.py]
        A[auth.py / JWT + RBAC]
        S[schemas.py / Pydantic]
        M[models.py / SQLAlchemy]
        R --> A
        R --> S
        R --> M
    end

    DB[(🗄️ SQLite)]

    AX -->|REST / JSON| R
    M --> DB

    classDef c fill:#1e293b,stroke:#3b82f6,color:#fff;
    classDef s fill:#0f766e,stroke:#14b8a6,color:#fff;
    classDef d fill:#7c2d12,stroke:#f97316,color:#fff;
    class UI,AX c
    class R,A,S,M s
    class DB d
```

---

## 🗃 Data Model (ERD)

```mermaid
erDiagram
    USERS ||--o| EXPERTS : "has profile"
    USERS ||--o{ BOOKINGS : "creates"
    EXPERTS ||--o{ BOOKINGS : "receives"
    BOOKINGS ||--o{ PAYMENTS : "generates"
    BOOKINGS ||--o{ MESSAGES : "contains"
    USERS ||--o{ MESSAGES : "sends"

    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        enum role "user|expert|admin"
        bool ai_access
    }
    EXPERTS {
        int id PK
        int user_id FK
        string category "doctor|teacher"
        string specialization
        int experience_years
        decimal consultation_fee
        float rating
        bool is_verified
    }
    BOOKINGS {
        int id PK
        int user_id FK
        int expert_id FK
        datetime booking_time
        enum status "pending|confirmed|cancelled|completed"
        string meeting_type "online|offline"
        string payment_method
        int rating
    }
    PAYMENTS {
        int id PK
        int booking_id FK
        decimal amount
        enum status "pending|paid|failed|refunded"
        string transaction_id
    }
    MESSAGES {
        int id PK
        int booking_id FK
        int sender_id FK
        text content
        datetime sent_at
    }
```

---

## 🔄 Booking Flow

```mermaid
sequenceDiagram
    actor U as 👤 User
    participant FE as 🖥️ Next.js
    participant BE as ⚙️ FastAPI
    participant DB as 🗄️ SQLite
    participant E as 👨‍⚕️ Expert

    U->>FE: Browse experts & open booking wizard
    FE->>BE: GET /experts/{id}
    BE->>DB: Fetch verified expert
    DB-->>FE: Expert details
    U->>FE: Step 1-3 (time, reason, meeting type, confirm)
    FE->>BE: POST /book (JWT)
    BE->>DB: Create booking (status=pending)
    DB-->>BE: video_room_id assigned
    BE-->>FE: Booking confirmed 🎉
    E->>BE: POST /expert-booking-status (confirm/complete)
    BE->>DB: Update status
    U->>BE: POST /messages (chat after confirm)
    U->>BE: POST /review (rate 1-5)
```

---

## ✨ Features by Role

### 👥 User
- 🔐 Sign up / sign in (JWT)
- 🔎 Browse & filter verified experts (doctors / teachers)
- 🧙 Multi-step booking wizard — reason, urgency, language, **online video** or **in-person clinic**
- 📊 Dashboard with upcoming appointments
- 💬 Post-booking messaging with the expert
- ⭐ Rate & review completed consultations
- 🤖 AI assistant for instant guidance

### 👨‍⚕️ Expert
- 📝 Specialized registration (starts in **Pending Approval**)
- 🧰 Expert workspace: total bookings, completed sessions, earnings, avg rating
- 📅 Appointment management (`pending → confirmed → completed`)
- 👤 Editable profile (category, specialization, fee, experience, bio)

### 🛡️ Admin
- 📈 Platform overview (users, experts, bookings, revenue)
- ✅ Expert verification queue (one-click approve)
- 📒 Master booking ledger across the entire platform

### 🤖 AI Assistant
- Animated canvas **AI orb** (`AICharacter.jsx`) with idle / thinking / speaking states
- Rule-based intent engine for booking help + general topics (career, health, study, finance…)
- Designed to be swappable with a real LLM

---

## 📊 Feature Status

| Module | Endpoint(s) | Status |
|--------|-------------|--------|
| Authentication (register / login / JWT) | `/register`, `/login`, `/me` | ✅ Working |
| Expert registration & verification | `/register/expert`, `/admin/approve-expert` | ✅ Working |
| Expert directory | `/experts`, `/experts/{id}` | ✅ Working |
| Booking creation & listing | `/book`, `/my-bookings` | ✅ Working |
| Expert panel (stats / bookings / status) | `/expert-stats`, `/expert-bookings`, `/expert-booking-status` | ✅ Working |
| Profiles (user & expert) | `/profile`, `/profile/user`, `/profile/expert` | ✅ Working |
| Messaging | `/messages`, `/messages/{id}` | ✅ Working |
| Reviews & ratings | `/review` | ✅ Working |
| Admin dashboard & ledger | `/admin/*` | ✅ Working |
| AI assistant | `/ai-help`, `/ai-chat`, `/unlock-ai` | ✅ Working (rule-based) |
| Online payments | `/create-order`, `/verify-payment` | 🟡 Mock (UI uses cash) |
| Video calls | `/video-token` | 🟡 Mock token (no WebRTC yet) |
| DB migrations (Alembic) | — | 🔴 Not set up (`create_all`) |

**Legend:** ✅ Production-ready · 🟡 Mock / placeholder · 🔴 Planned

---

## 📈 Project Stats

### Feature completion

```mermaid
pie showData
    title Feature Completion
    "Working" : 10
    "Mock / Placeholder" : 2
    "Planned" : 1
```

### Endpoint distribution by domain

```mermaid
pie showData
    title API Endpoints by Domain
    "Auth & Profile" : 6
    "Experts" : 3
    "Bookings" : 3
    "Expert Panel" : 4
    "Admin" : 4
    "Messaging" : 2
    "AI" : 3
    "Payments / Video" : 3
```

---

## 📡 API Reference

> Interactive docs available at **`http://localhost:8000/docs`** (Swagger UI) once the backend is running.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/register` | — | Register a user |
| `POST` | `/register/expert` | — | Register an expert (pending approval) |
| `POST` | `/login` | — | Login, returns JWT + role |
| `GET` | `/me` | 🔐 | Current user info |
| `GET` | `/experts` | — | List verified experts (`?category=`) |
| `GET` | `/experts/{id}` | — | Expert profile |
| `POST` | `/book` | 🔐 | Create a booking |
| `GET` | `/my-bookings` | 🔐 | User's bookings |
| `GET` | `/expert-stats` | 🔐 Expert | Expert dashboard stats |
| `GET` | `/expert-bookings` | 🔐 Expert | Expert's bookings |
| `POST` | `/expert-booking-status` | 🔐 Expert | Update booking status |
| `GET`/`PUT` | `/profile`, `/profile/user`, `/profile/expert` | 🔐 | View / update profile |
| `POST`/`GET` | `/messages`, `/messages/{id}` | 🔐 | Send / list messages |
| `POST` | `/review` | 🔐 | Submit a rating |
| `POST` | `/ai-help` | — | Rule-based help & booking intent |
| `POST` | `/ai-chat` | 🔐 + `ai_access` | Topic-based AI chat |
| `POST` | `/unlock-ai` | 🔐 | Grant AI access |
| `GET` | `/admin/dashboard-stats` | 🔐 Admin | Platform stats |
| `GET` | `/admin/pending-experts` | 🔐 Admin | Verification queue |
| `POST` | `/admin/approve-expert` | 🔐 Admin | Approve expert |
| `GET` | `/admin/bookings` | 🔐 Admin | Master booking ledger |
| `POST` | `/create-order`, `/verify-payment` | 🔐 | Payment (mock) |
| `GET` | `/video-token` | 🔐 | Video token (mock) |

---

## 📁 Project Structure

```
Saarthi_Consultancy/
├── backend/                  # FastAPI application
│   ├── main.py               # App entrypoint, CORS, exception handler
│   ├── routes.py             # All API routes
│   ├── models.py             # SQLAlchemy ORM models
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── auth.py               # JWT + password hashing + RBAC
│   ├── database.py           # Engine, session, DB URL resolution
│   ├── seed_experts.py       # Seeds 10 demo experts
│   ├── seed_admin.py         # Creates / promotes the admin account
│   └── requirements.txt
├── frontend/                 # Next.js application
│   ├── app/                  # App Router pages (admin, ai, booking, dashboard…)
│   ├── components/           # Navbar, ChatBot, ExpertCard, AICharacter
│   ├── lib/api.js            # Axios instance + JWT interceptor
│   └── package.json
├── PROJECT_CONTEXT.md        # Living design/context doc
└── README.md
```

---

## ⚡ Getting Started

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** and npm
- **Git**

### 1️⃣ Clone

```bash
git clone https://github.com/amangovindrao/Saarthi_Consultancy.git
cd Saarthi_Consultancy
```

### 2️⃣ Backend setup

```bash
# From the project root
python -m venv .venv
.venv\Scripts\activate          # Windows (PowerShell/CMD)
# source .venv/bin/activate     # macOS / Linux

pip install -r backend/requirements.txt

# (Optional) seed demo experts
python -m backend.seed_experts

# Create the default admin account
python -m backend.seed_admin

# Run the API (http://localhost:8000, docs at /docs)
uvicorn backend.main:app --reload
```

### 3️⃣ Frontend setup

```bash
cd frontend
npm install

# Optional: point the frontend at a non-default backend
# echo NEXT_PUBLIC_BACKEND_URL=http://localhost:8000 > .env.local

npm run dev      # http://localhost:3000
```

> 💡 The backend auto-creates tables on startup (`Base.metadata.create_all`). The default DB is `sqlite:///./consultant_ai.db`. Override with the `DATABASE_URL` env var (e.g. PostgreSQL) for production.

---

## 🔑 Default Credentials

After running `python -m backend.seed_admin`:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@example.com` | `admin123` |
| **Demo experts** (from `seed_experts`) | e.g. `aarav.sharma@example.com` | `password123` |

> Override admin defaults with env vars: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`.
> The seed script is **idempotent** — re-running it promotes an existing user to admin and resets the password.

⚠️ **Change these before any public deployment.** Also set a strong `JWT_SECRET_KEY` env var (defaults to a placeholder).

---

## 🗺 Roadmap

- [ ] 🔌 Re-integrate a real payment gateway (Razorpay) with correct payload keys
- [ ] 📹 Real video calls (Jitsi / Daily.co / Twilio + WebRTC)
- [ ] 🧠 Swap rule-based AI for an LLM (OpenAI / Gemini) + Hinglish STT/TTS
- [ ] 🗂 Alembic migrations
- [ ] 🖼️ Profile avatars & document sharing (S3 / Cloudinary)
- [ ] 📧 Email/SMS notifications (FastAPI BackgroundTasks / Celery)
- [ ] 🐘 Migrate SQLite → PostgreSQL for production
- [ ] ☁️ Deploy (Vercel for FE, container/VM for BE)

---

## 🤝 Contributing

Contributions are welcome! 

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/amazing-thing`
3. Commit your changes: `git commit -m "feat: add amazing thing"`
4. Push the branch: `git push origin feature/amazing-thing`
5. Open a Pull Request

---

## 📄 License

Released under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

**Built with ❤️ for better healthcare & education.**

⭐ _If this project helped you, consider giving it a star!_ ⭐

</div>
