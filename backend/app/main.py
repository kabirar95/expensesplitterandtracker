# ============================================================
# MAIN — FastAPI application entry point
# ============================================================
# This is where the FastAPI app is created and configured.
# It's like the "main()" of the backend — everything starts here.
#
# What happens when the server starts:
# 1. FastAPI app is created
# 2. CORS middleware is added (allows frontend to call API)
# 3. Database connection is established
# 4. All routers (auth, groups, expenses, etc.) are registered
# 5. Server starts listening for requests
# ============================================================

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import auth, groups, expenses, personal_expenses, budgets, ai


# ── Lifespan — runs on startup and shutdown ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs when the app starts and stops.
    """
    print("🚀 Starting up — connecting to Supabase...")
    init_db()
    print("✅ Application ready!")
    
    yield
    
    print("👋 Shutting down...")


# ── Create the FastAPI app ──
app = FastAPI(
    title=settings.app_name,
    description="A production-grade expense splitting and personal finance tracking app with AI.",
    version="1.0.0",
    lifespan=lifespan,
)


# ── CORS Middleware ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,    # Which URLs can call us
    allow_credentials=True,                  # Allow cookies/auth headers
    allow_methods=["*"],                     # Allow all HTTP methods
    allow_headers=["*"],                     # Allow all headers
)


# ── Register Routers ──
app.include_router(auth.router)
app.include_router(groups.router)
app.include_router(expenses.router)
app.include_router(personal_expenses.router)
app.include_router(budgets.router)
app.include_router(ai.router)


# ── Health Check ──
@app.get("/api/health", tags=["Health"])
async def health_check():
    """Simple endpoint to verify the API is running."""
    return {"status": "healthy", "app": settings.app_name}
