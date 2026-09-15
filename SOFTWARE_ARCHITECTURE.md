# 🏛️ Divvy - Software Architecture & Technical Design Document

> **Document Version**: 1.0  
> **Project**: Divvy (Expense Splitting & Financial Management Platform)  
> **Tech Stack**: React 18, Vite, FastAPI (Python 3.12), Supabase PostgreSQL, Google Gemini AI, Docker  

---

## 📌 Executive Summary

Divvy is built on a **3-Tier Decoupled Micro-Architecture** designed for high throughput, sub-100ms response times, and maximum security. The application cleanly separates the **Client Presentation Layer**, **RESTful API & Business Logic Layer**, and **Database & External AI Services Layer**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          1. FRONTEND LAYER                              │
│  React 18 + Vite SPA | Zustand Stores | React Router v7 | Vanilla CSS   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │  HTTP / REST JSON (JWT Bearer Auth)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          2. BACKEND API LAYER                           │
│     FastAPI (Python 3.12) | Uvicorn ASGI | Pydantic | Bcrypt Auth      │
│  ┌───────────────────────┬──────────────────────┬────────────────────┐  │
│  │ Debt Simplification   │  Personal Finance    │  Google Gemini AI  │  │
│  │ Algorithm Engine      │  Budget Allocator    │  Advisor Engine    │  │
│  └───────────────────────┴──────────────────────┴────────────────────┘  │
└──────────────────┬──────────────────────────────────────┬───────────────┘
                   │ SQL Query Engine                     │ Async API Call
                   ▼                                      ▼
┌──────────────────────────────────────┐ ┌────────────────────────────────┐
│      3. DATABASE LAYER               │ │     4. EXTERNAL AI SERVICES    │
│  Supabase PostgreSQL Cloud Database  │ │    Google Gemini AI API        │
│  (Users, Groups, Splits, Budgets)    │ │    (gemini-flash-lite-latest)   │
└──────────────────────────────────────┘ └────────────────────────────────┘
```

---

## 💻 1. Frontend Architecture (Client Layer)

The frontend is a **Single Page Application (SPA)** built with React 18 and Vite.

### Key Architectural Components
- **State Management Engine (Zustand)**: Uses modular, decoupled stores to avoid unnecessary re-renders and prop-drilling:
  - `authStore.js`: Handles JWT session persistence, user profiles, login/logout logic.
  - `groupStore.js`: Manages group listings, member management, debt matrices, settlement logs.
  - `personalExpenseStore.js`: Controls personal transactions, monthly budget caps, and timezone-safe month navigation.
  - `aiChatStore.js`: Retains multi-turn conversation history in memory across page transitions.
  - `themeStore.js`: Manages global Cybertech Dark/Light theme modes.
- **Routing & Guards (`App.jsx`)**: Governed by React Router v7 with `<ProtectedRoute>` authorization wrappers.
- **HTTP Interceptor (`api.js`)**: Centralized Axios client that automatically intercepts requests to append `Authorization: Bearer <JWT_TOKEN>`.
- **UI & Aesthetics**: Built with a custom Vanilla CSS variable system, Glassmorphism backdrop filters (`backdrop-filter: blur()`), neon contrast accents, Recharts visual analytics, and custom toast notifications (`react-hot-toast`).

---

## ⚙️ 2. Backend Architecture (API & Business Logic Layer)

The backend is an asynchronous REST API built with **FastAPI (Python 3.12)** running on a Uvicorn ASGI server.

### Router & Endpoint Structure (`/app/routers`)
- `auth.py`: User registration, bcrypt password hashing, login token issuance, token refreshes.
- `groups.py`: Group CRUD operations, member invitations, net balance computations.
- `expenses.py`: Group bill-splitting calculation engines (**Equal**, **Percentage**, **Exact Amount**).
- `personal_expenses.py`: Personal transaction tracking, category filtering, monthly totals.
- `budgets.py`: Monthly target budget caps, category caps, and overflow calculations.
- `ai.py`: Gemini AI endpoint feeding real-time financial context into the LLM.

### Core Business Services & Algorithms (`/app/services`)
- ⚖️ **Debt Simplification Algorithm (`split_service.py`)**: Uses a Minimum Cash Flow Reduction algorithm to eliminate circular group debts (e.g., if User A owes User B ₹500, and User B owes User C ₹500, the algorithm simplifies the transfer so User A pays User C ₹500 directly).
- 🤖 **Divvy AI Advisor Engine (`ai_service.py`)**: Powered by the official `google-genai` SDK (`gemini-flash-lite-latest`). Dynamically extracts real-time user metrics (monthly spent, yearly totals, category caps, group balances) and injects them into a Certified Financial Planner (CFP) system prompt (`financial_advisor.py`).

---

## 🗄️ 3. Database Architecture (Data Layer)

Data is stored in a **Supabase PostgreSQL Cloud Database** using relational schemas:

- **`users`**: User credentials (`id`, `email`, `hashed_password`, `full_name`, `created_at`).
- **`groups` & `group_members`**: Group metadata and user-group junction mapping.
- **`expenses` & `expense_splits`**: Group transactions and individual member split breakdown records.
- **`personal_expenses`**: Individual non-group transactions tagged by category.
- **`budgets`**: Overall and category-specific monthly budget caps.
- **`settlements`**: Payment records when group members settle up debts.

---

## 🐳 4. Containerization & Infrastructure Layer

- **Docker & Docker Compose**:
  - `frontend` container: Builds and serves the React Vite application.
  - `backend` container: Hosts the FastAPI Uvicorn application.
  - `docker-compose.yml`: Orchestrates both containers with environment variable injection and automatic port mapping (`5173` ➔ Frontend, `8000` ➔ Backend API).
