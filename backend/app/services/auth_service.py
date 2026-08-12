# ============================================================
# AUTH SERVICE — Password hashing & JWT token management
# ============================================================

from datetime import datetime, timedelta
from typing import Optional, Dict
import bcrypt
from jose import JWTError, jwt

from app.config import settings
from app.models.user import UserProfile
from app.database import get_supabase

# Local in-memory users fallback database
_local_users_db = {}


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt with 72-byte truncation safety.
    """
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a stored bcrypt hash.
    """
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False


def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[Dict]:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None


async def find_user_by_email(email: str) -> Optional[Dict]:
    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("profiles").select("*").eq("email", email).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            print(f"Supabase read notice: {e}")

    for u in _local_users_db.values():
        if u.get("email") == email:
            return u
    return None


async def find_user_by_username(username: str) -> Optional[Dict]:
    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("profiles").select("*").eq("username", username).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            print(f"Supabase read notice: {e}")

    for u in _local_users_db.values():
        if u.get("username") == username:
            return u
    return None


async def find_user_by_id(user_id: str) -> Optional[Dict]:
    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("profiles").select("*").eq("id", user_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            print(f"Supabase read notice: {e}")

    return _local_users_db.get(user_id)


async def save_user(user_data: Dict) -> Dict:
    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("profiles").insert(user_data).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            print(f"Supabase save notice: {e}")

    _local_users_db[user_data["id"]] = user_data
    return user_data


async def authenticate_user(email: str, password: str) -> Optional[Dict]:
    user = await find_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user.get("password_hash", "")):
        return None
    return user
