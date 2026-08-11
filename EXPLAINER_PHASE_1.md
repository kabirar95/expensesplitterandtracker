# 📚 Full-Stack Architecture & Learning Guide (Phase 1)

Welcome to your complete full-stack reference guide! This document explains **every single file** created during **Phase 1 (Foundation & Authentication)**. It is written specifically for learners building production-grade web applications.

---

## 🏛️ High-Level Architecture Overview

Before diving into individual files, let's understand how all the pieces connect:

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
                         Async Motor / Beanie ODM
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │           MongoDB Database             │
                  │         NoSQL (Port 27017)             │
                  └────────────────────────────────────────┘
```

---

## 🐳 SECTION 1: Infrastructure & Docker Files

### 1. [`docker-compose.yml`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/docker-compose.yml)
- **What it does:** Orchestrates three separate Docker containers (Frontend, Backend, and MongoDB) so they can run together with a single command (`docker compose up`).
- **Key Concepts:**
  - **`services`**: Defines our 3 microservices (`frontend`, `backend`, `mongo`).
  - **`volumes`**: Mounts local folders into the containers so code edits instantly update without rebuilding (Hot Reloading). `mongo_data` ensures database records survive container restarts.
  - **`networks`**: Connects containers on an isolated virtual network (`app-network`) so `backend` can talk to `mongo` via `mongodb://mongo:27017`.

### 2. [`backend/Dockerfile`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/backend/Dockerfile)
- **What it does:** Blueprint for building the Python backend container.
- **Key Steps:** Starts from `python:3.12-slim`, copies `requirements.txt`, installs dependencies, and runs `uvicorn app.main:app --reload` on port `8000`.

### 3. [`frontend/Dockerfile`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/Dockerfile)
- **What it does:** Blueprint for building the React frontend container.
- **Key Steps:** Starts from `node:20-slim`, installs `node_modules`, copies Vite application files, and runs `npm run dev -- --host 0.0.0.0` on port `5173`.

### 4. [`.gitignore`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/.gitignore)
- **What it does:** Prevents sensitive files (`.env`), heavy build folders (`node_modules/`, `dist/`), and Python cache (`__pycache__/`) from being pushed to GitHub.

---

## 🐍 SECTION 2: Backend Files (Python / FastAPI / MongoDB)

### 1. [`backend/app/config.py`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/backend/app/config.py)
- **What it does:** Central configuration manager using `pydantic_settings.BaseSettings`.
- **Why it matters:** Reads settings from environment variables or `.env`. This ensures database credentials, JWT secrets, and API keys are never hardcoded in source files.

### 2. [`backend/app/database.py`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/backend/app/database.py)
- **What it does:** Initializes the MongoDB connection using **Motor** (async MongoDB driver) and **Beanie** (Object Document Mapper).
- **Key Concept:** `init_beanie` registers document models like `User` with MongoDB collections.

### 3. [`backend/app/models/user.py`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/backend/app/models/user.py)
- **What it does:** Defines the `User` document structure stored in the MongoDB `users` collection.
- **Key Fields:** `email`, `username`, `password_hash` (never plain text!), `display_name`, `default_currency`, `email_digest_enabled`, `created_at`.

### 4. [`backend/app/schemas/user.py`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/backend/app/schemas/user.py)
- **What it does:** Defines Pydantic validation models for HTTP requests and responses.
- **Why separate Models from Schemas?** 
  - `UserSignup`: Accepts plain text `password` from frontend.
  - `UserResponse`: Omits `password_hash` completely before returning data to frontend for maximum security.

### 5. [`backend/app/services/auth_service.py`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/backend/app/services/auth_service.py)
- **What it does:** The cryptography and security engine of the app.
- **Functions:**
  - `hash_password()`: Converts plain passwords into one-way Bcrypt hashes.
  - `verify_password()`: Safely checks if an entered password matches a hash.
  - `create_access_token()`: Generates short-lived (30 min) JWT access tokens.
  - `create_refresh_token()`: Generates long-lived (7 days) JWT refresh tokens.
  - `decode_token()`: Parses and verifies JWT signatures.

### 6. [`backend/app/middleware/auth.py`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/backend/app/middleware/auth.py)
- **What it does:** Dependency injection function (`get_current_user`) for protecting API routes.
- **How it works:** Inspects `Authorization: Bearer <token>` header, decodes the token, fetches the user from DB, or throws a `401 Unauthorized` HTTP error.

### 7. [`backend/app/routers/auth.py`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/backend/app/routers/auth.py)
- **What it does:** API endpoints for authentication.
- **Routes:**
  - `POST /api/auth/signup`: Registers a new user.
  - `POST /api/auth/login`: Validates credentials & returns JWT access + refresh tokens.
  - `POST /api/auth/refresh`: Issues a new access token using a valid refresh token.
  - `GET /api/auth/me`: Returns profile of the logged-in user.
  - `PUT /api/auth/me`: Updates profile settings.

### 8. [`backend/app/main.py`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/backend/app/main.py)
- **What it does:** FastAPI application entry point.
- **Key Features:** Configures CORS middleware (allowing `localhost:5173` calls), registers `auth.router`, manages startup/shutdown database hooks, and exposes `/api/health`.

---

## ⚛️ SECTION 3: Frontend Files (React / Vite / Zustand / CSS)

### 🎨 Styling System (`frontend/src/styles/`)

- [`variables.css`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/styles/variables.css): Defines design tokens (fonts, spacing, border radii, shadows, z-index scales).
- [`theme.css`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/styles/theme.css): Defines CSS color variables for Light Mode and Dark Mode (`[data-theme="dark"]`).
- [`reset.css`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/styles/reset.css): Resets browser default styles for consistent cross-browser rendering.
- [`global.css`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/styles/global.css): Sets base body typography, Inter font, heading scales, and custom scrollbars.
- [`animations.css`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/styles/animations.css): Reusable CSS keyframe animations (`fadeIn`, `fadeInUp`, `spin`, `pulse`, `shimmer`).

---

### 🧠 State Management & Services (`frontend/src/`)

- [`store/themeStore.js`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/store/themeStore.js): Zustand store managing dark/light theme state, OS preference detection (`prefers-color-scheme`), and `localStorage` persistence.
- [`store/authStore.js`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/store/authStore.js): Zustand store managing user profile state, JWT tokens, authentication status, and login/logout methods.
- [`services/api.js`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/services/api.js): Configured Axios instance with:
  - **Request Interceptor**: Auto-attaches `Authorization: Bearer <token>` to requests.
  - **Response Interceptor**: Catches `401 Unauthorized` errors and automatically calls `/api/auth/refresh` to maintain seamless user sessions.
- [`services/authService.js`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/services/authService.js): Wraps auth API endpoint requests (`loginUser`, `signupUser`, `fetchCurrentUser`, `logoutUser`).

---

### 🧩 UI Components & Layout (`frontend/src/components/`)

- [`common/Button.jsx`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/components/common/Button.jsx): Flexible button component supporting variants (`primary`, `secondary`, `outline`, `ghost`, `danger`), sizes (`sm`, `md`, `lg`), loading spinner state, and icon support.
- [`common/Input.jsx`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/components/common/Input.jsx): Reusable form input supporting labels, icons, error messages, and focus rings.
- [`common/Avatar.jsx`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/components/common/Avatar.jsx): Displays user profile image or generates two-letter initials with gradient background.
- [`common/Spinner.jsx`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/components/common/Spinner.jsx): Animated loading indicator.
- [`common/Modal.jsx`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/components/common/Modal.jsx): Accessible popup modal with backdrop blur, keyboard `ESC` dismissal, and body scroll-lock.
- [`layout/Navbar.jsx`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/components/layout/Navbar.jsx): Header featuring brand logo, theme toggle button, user avatar, and logout trigger.
- [`layout/Sidebar.jsx`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/components/layout/Sidebar.jsx): Side navigation menu with active state highlighting and AI feature badge.
- [`layout/AppLayout.jsx`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/components/layout/AppLayout.jsx): Shell component holding Navbar, Sidebar, and child route `<Outlet />`.
- [`auth/ProtectedRoute.jsx`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/components/auth/ProtectedRoute.jsx): Route guard ensuring unauthenticated users are redirected to `/login`.

---

### 📄 Pages & Application Core (`frontend/src/`)

- [`pages/LoginPage.jsx`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/pages/LoginPage.jsx): Login form page with input validation, authentication dispatch, and error toast alerts.
- [`pages/SignupPage.jsx`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/pages/SignupPage.jsx): Registration form page with full name, username, email, and password validation.
- [`pages/DashboardPage.jsx`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/pages/DashboardPage.jsx), [`GroupsPage.jsx`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/pages/GroupsPage.jsx), [`PersonalExpensesPage.jsx`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/pages/PersonalExpensesPage.jsx), [`AnalyticsPage.jsx`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/pages/AnalyticsPage.jsx), [`AIAssistantPage.jsx`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/pages/AIAssistantPage.jsx), [`ProfilePage.jsx`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/pages/ProfilePage.jsx): Core view pages.
- [`App.jsx`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/App.jsx): Configures React Router route mapping, toast notification provider (`react-hot-toast`), and initial session restoration check.
- [`main.jsx`](file:///Users/kabirramteke/Desktop/expense%20splitter%20and%20tracker/frontend/src/main.jsx): React 18 DOM mount entry point wrapping `App` with `BrowserRouter`.

---

## 🔑 Key Full-Stack Concepts Learnt

1. **JWT Auth Lifecycle:** Access tokens (short-lived) + Refresh tokens (long-lived) keep security high without bothering users to log in repeatedly.
2. **Component & Token System:** CSS variables allow zero-JS theme switching, while Zustand manages global state cleanly without prop-drilling.
3. **Pydantic Validation Layer:** Prevents bad or malicious data from reaching the database.
4. **Docker Container Isolation:** Guarantees that code runs identically on macOS, Windows, Linux, and cloud servers.
