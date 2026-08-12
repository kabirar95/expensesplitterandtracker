# ============================================================
# AUTH ROUTER — API endpoints for signup, login, refresh, logout
# ============================================================

import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends

from app.models.user import UserProfile
from app.schemas.user import (
    UserSignup,
    UserLogin,
    UserUpdate,
    UserResponse,
    TokenResponse,
    TokenRefreshRequest,
)
from app.services.auth_service import (
    hash_password,
    authenticate_user,
    create_access_token,
    create_refresh_token,
    decode_token,
    find_user_by_email,
    find_user_by_username,
    find_user_by_id,
    save_user,
)
from app.middleware.auth import get_current_user
from app.database import get_supabase

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _user_dict_to_response(user_data: dict) -> UserResponse:
    return UserResponse(
        id=str(user_data.get("id")),
        email=user_data.get("email"),
        username=user_data.get("username"),
        display_name=user_data.get("display_name"),
        avatar_url=user_data.get("avatar_url"),
        default_currency=user_data.get("default_currency", "INR"),
        email_digest_enabled=user_data.get("email_digest_enabled", False),
        created_at=user_data.get("created_at") or datetime.utcnow(),
    )


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(data: UserSignup):
    """
    Create a new user account.
    """
    existing_email = await find_user_by_email(data.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    existing_username = await find_user_by_username(data.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This username is already taken",
        )

    user_id = str(uuid.uuid4())
    new_user = {
        "id": user_id,
        "email": data.email,
        "username": data.username,
        "password_hash": hash_password(data.password),
        "display_name": data.display_name,
        "default_currency": "INR",
        "email_digest_enabled": False,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

    saved_user = await save_user(new_user)

    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=_user_dict_to_response(saved_user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """
    Log in with email and password.
    """
    user_data = await authenticate_user(data.email, data.password)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    user_id = str(user_data.get("id"))
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=_user_dict_to_response(user_data),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: TokenRefreshRequest):
    """
    Get a new access token using a refresh token.
    """
    payload = decode_token(data.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = payload.get("sub")
    user_data = await find_user_by_id(user_id)
    if not user_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    new_access_token = create_access_token(user_id)
    new_refresh_token = create_refresh_token(user_id)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        user=_user_dict_to_response(user_data),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserProfile = Depends(get_current_user)):
    """
    Get the currently logged-in user's profile.
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
        default_currency=current_user.default_currency,
        email_digest_enabled=current_user.email_digest_enabled,
        created_at=current_user.created_at,
    )


@router.put("/me", response_model=UserResponse)
async def update_me(data: UserUpdate, current_user: UserProfile = Depends(get_current_user)):
    """
    Update profile fields.
    """
    user_data = await find_user_by_id(current_user.id)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    if data.display_name is not None:
        user_data["display_name"] = data.display_name
    if data.avatar_url is not None:
        user_data["avatar_url"] = data.avatar_url
    if data.default_currency is not None:
        user_data["default_currency"] = data.default_currency
    if data.email_digest_enabled is not None:
        user_data["email_digest_enabled"] = data.email_digest_enabled

    user_data["updated_at"] = datetime.utcnow().isoformat()
    updated = await save_user(user_data)

    return _user_dict_to_response(updated)
