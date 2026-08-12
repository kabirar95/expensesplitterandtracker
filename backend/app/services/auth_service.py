# ============================================================
# AUTH SERVICE — Password hashing & JWT token management
# ============================================================

from datetime import datetime, timedelta
from typing import Optional, dict
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings
from app.models.user import UserProfile
from app.database import get_supabase

# Password Hashing with bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Local in-memory users fallback database
_local_users_db = {}


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


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


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None


async def find_user_by_email(email: str) -> Optional[dict]:
    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("profiles").select("*").eq("email", email).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            print(f"Supabase read error: {e}")

    for u in _local_users_db.values():
        if u.get("email") == email:
            return u
    return None


async def find_user_by_username(username: str) -> Optional[dict]:
    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("profiles").select("*").eq("username", username).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            print(f"Supabase read error: {e}")

    for u in _local_users_db.values():
        if u.get("username") == username:
            return u
    return None


async def find_user_by_id(user_id: str) -> Optional[dict]:
    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("profiles").select("*").eq("id", user_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            print(f"Supabase read error: {e}")

    return _local_users_db.get(user_id)


async def save_user(user_data: dict) -> dict:
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


async def authenticate_user(email: str, password: str) -> Optional[dict]:
    user = await find_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user.get("password_hash", "")):
        return None
    return user
