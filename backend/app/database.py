# ============================================================
# DATABASE — Supabase / PostgreSQL Client
# ============================================================

from supabase import create_client, Client
from app.config import settings

# Global Supabase client instance
supabase: Client = None


def init_db() -> Client:
    """
    Initialize the Supabase client connection.
    Called once when the FastAPI app starts up.
    """
    global supabase
    if not settings.supabase_url or not settings.supabase_key:
        print("⚠️ Warning: SUPABASE_URL or SUPABASE_KEY not set. Local DB mock mode active.")
        return None

    supabase = create_client(settings.supabase_url, settings.supabase_key)
    print("✅ Connected to Supabase (PostgreSQL)!")
    return supabase


def get_supabase() -> Client:
    """
    Get the active Supabase client instance.
    """
    global supabase
    if supabase is None and settings.supabase_url and settings.supabase_key:
        supabase = create_client(settings.supabase_url, settings.supabase_key)
    return supabase
