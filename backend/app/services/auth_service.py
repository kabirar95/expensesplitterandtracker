# ============================================================
# AUTH SERVICE — Password hashing & JWT token management
# ============================================================
# This is the "brain" of authentication. It handles:
# 1. Hashing passwords (so we never store plain text)
# 2. Verifying passwords (checking if login is correct)
# 3. Creating JWT tokens (the "keys" that prove you're logged in)
# 4. Decoding JWT tokens (reading who the token belongs to)
#
# JWT = JSON Web Token. It's a signed string that contains
# user info. The frontend sends it with every request to
# prove "hey, I'm logged in as Kabir."
# ============================================================

from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings
from app.models.user import User

# ── Password Hashing Setup ──
# bcrypt is the industry standard for password hashing.
# It's intentionally slow — this makes brute-force attacks impractical.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Convert a plain text password into a bcrypt hash.
    
    Example:
        "mypassword123" → "$2b$12$LJ3m4ys5Xz..."
    
    The hash is different every time (due to random salt),
    but verify_password() can still check if they match.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Check if a plain text password matches a hashed password.
    
    Used during login:
        verify_password("mypassword123", "$2b$12$LJ3m4ys5Xz...") → True
        verify_password("wrongpassword", "$2b$12$LJ3m4ys5Xz...") → False
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str) -> str:
    """
    Create a short-lived JWT access token (default: 30 minutes).
    
    This token is sent with every API request in the header:
        Authorization: Bearer <this_token>
    
    The token contains:
        - sub: user ID (who this token belongs to)
        - exp: expiration time (when it becomes invalid)
        - type: "access" (to distinguish from refresh tokens)
    """
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": user_id,             # "sub" = subject = who this token is for
        "exp": expire,              # When the token expires
        "type": "access",           # Token type
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: str) -> str:
    """
    Create a long-lived JWT refresh token (default: 7 days).
    
    When the access token expires, the frontend uses this
    refresh token to get a NEW access token — without
    making the user log in again.
    
    Flow:
    1. User logs in → gets access token (30 min) + refresh token (7 days)
    2. Access token expires after 30 min
    3. Frontend sends refresh token to /api/auth/refresh
    4. Backend returns a NEW access token
    5. User stays logged in seamlessly!
    """
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT token.
    
    Returns the payload (user_id, type, exp) if valid.
    Returns None if the token is expired, tampered, or invalid.
    """
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None


async def authenticate_user(email: str, password: str) -> Optional[User]:
    """
    Verify email + password and return the User if valid.
    
    Steps:
    1. Find user by email in the database
    2. Check if the password matches the stored hash
    3. Return the User object if both checks pass, None otherwise
    """
    user = await User.find_one(User.email == email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
