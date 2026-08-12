# ============================================================
# AUTH MIDDLEWARE — Protects routes that need login
# ============================================================

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.models.user import UserProfile
from app.services.auth_service import decode_token, find_user_by_id

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserProfile:
    token = credentials.credentials

    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type — use an access token",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user ID",
        )

    user_data = await find_user_by_id(user_id)
    if user_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found — account may have been deleted",
        )

    return UserProfile(
        id=str(user_data.get("id")),
        email=user_data.get("email"),
        username=user_data.get("username"),
        password_hash=user_data.get("password_hash", ""),
        display_name=user_data.get("display_name", ""),
        avatar_url=user_data.get("avatar_url"),
        default_currency=user_data.get("default_currency", "INR"),
        email_digest_enabled=user_data.get("email_digest_enabled", False),
    )
