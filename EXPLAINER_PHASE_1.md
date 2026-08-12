# 📚 Full-Stack Architecture & Learning Guide (Phase 1 — Supabase Edition)

Welcome to your complete full-stack reference guide! This document explains **every single file** created during **Phase 1 (Foundation, Authentication & Supabase Integration)**.

---

## 🏛️ High-Level Architecture Overview

```
                  ┌────────────────────────────────────────┐
                  │           Browser (Client)             │
                  │  React 18 + Vite (Port 5173)           │
                  └───────────────────┬────────────────────┘
                                      │
                         HTTP Requests (REST API)
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │           FastAPI Backend              │
                  │       Python 3.12 (Port 8000)          │
                  └───────────────────┬────────────────────┘
                                      │
                       Supabase Python Client (SDK)
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │       Supabase (PostgreSQL Cloud)      │
                  │       Auth + Database + Realtime       │
                  └────────────────────────────────────────┘
```

---

## 🐳 SECTION 1: Infrastructure & Docker Files

### 1. [`docker-compose.yml`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/docker-compose.yml)
- **What it does:** Orchestrates Frontend (React + Vite) and Backend (FastAPI) containers.
- **Database:** Connects seamlessly to **Supabase Cloud (PostgreSQL)** via environment variables (`SUPABASE_URL` and `SUPABASE_KEY`).

### 2. [`backend/Dockerfile`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/backend/Dockerfile)
- **What it does:** Blueprint for building the Python backend container (`python:3.12-slim` + `uvicorn app.main:app`).

### 3. [`frontend/Dockerfile`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/Dockerfile)
- **What it does:** Blueprint for building the React frontend container (`node:20-slim` + Vite dev server).

---

## 🐍 SECTION 2: Backend Files (Python / FastAPI / Supabase)

### 1. [`backend/app/config.py`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/backend/app/config.py)
- **What it does:** Configuration manager reading `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`, and `GEMINI_API_KEY` from `.env`.

### 2. [`backend/app/database.py`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/backend/app/database.py)
- **What it does:** Initializes and exports the `supabase` client connection using `create_client(settings.supabase_url, settings.supabase_key)`.

### 3. [`backend/app/models/user.py`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/backend/app/models/user.py)
- **What it does:** `UserProfile` model representing the Supabase PostgreSQL `profiles` table.

### 4. [`backend/app/schemas/user.py`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/backend/app/schemas/user.py)
- **What it does:** Pydantic validation models for HTTP requests/responses (with UUIDs and password safety).

### 5. [`backend/app/services/auth_service.py`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/backend/app/services/auth_service.py)
- **What it does:** Handles password hashing (Bcrypt) and JWT access (30m) + refresh (7d) token security.

### 6. [`backend/app/middleware/auth.py`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/backend/app/middleware/auth.py)
- **What it does:** Route protection dependency (`get_current_user`) verifying Bearer tokens.

### 7. [`backend/app/routers/auth.py`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/backend/app/routers/auth.py)
- **What it does:** Authentication API routes (`/api/auth/signup`, `/login`, `/refresh`, `/me`).

### 8. [`backend/app/main.py`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/backend/app/main.py)
- **What it does:** FastAPI entry point with CORS middleware, Supabase startup connection, and health check.

---

## ⚛️ SECTION 3: Frontend & Design System (React / Vite / Cyber-Tech CSS)

- **Cyber-Tech CSS System**: [`variables.css`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/styles/variables.css), [`theme.css`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/styles/theme.css), [`global.css`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/styles/global.css), [`animations.css`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/styles/animations.css).
- **Zustand Stores**: `themeStore.js` (Dark/Light mode switch), `authStore.js` (User session & JWT management).
- **Axios Interceptor**: `api.js` (Auto-attaches Bearer token & auto-refreshes 401s).
- **UI Components**: `Button`, `Input`, `Avatar`, `Spinner`, `Modal`, `Navbar`, `Sidebar`, `AppLayout`, `ProtectedRoute`.
- **Pages**: `LoginPage`, `SignupPage`, `DashboardPage`, `GroupsPage`, `PersonalExpensesPage`, `AnalyticsPage`, `AIAssistantPage`, `ProfilePage`.
