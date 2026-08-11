# ============================================================
# AUTH ROUTER — API endpoints for signup, login, refresh, logout
# ============================================================
# These are the URLs that the frontend calls for authentication.
# Each function handles one endpoint:
#
#   POST /api/auth/signup   → Create a new account
#   POST /api/auth/login    → Log in, get JWT tokens
#   POST /api/auth/refresh  → Get new access token using refresh token
#   POST /api/auth/logout   → (placeholder — JWT logout is client-side)
#   GET  /api/auth/me       → Get current user info
# ============================================================

from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends

from app.models.user import User
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
)
from app.middleware.auth import get_current_user

# Create the router — all routes here will be prefixed with /api/auth
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _user_to_response(user: User) -> UserResponse:
    """Convert a User database document to a UserResponse schema."""
    return UserResponse(
        id=str(user.id),
        email=user.email,
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        default_currency=user.default_currency,
        email_digest_enabled=user.email_digest_enabled,
        created_at=user.created_at,
    )


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(data: UserSignup):
    """
    Create a new user account.
    
    Steps:
    1. Check if email or username already exists
    2. Hash the password
    3. Create the user document in MongoDB
    4. Generate JWT tokens
    5. Return tokens + user info
    """
    # Check if email is taken
    existing_email = await User.find_one(User.email == data.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    # Check if username is taken
    existing_username = await User.find_one(User.username == data.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This username is already taken",
        )

    # Create the user
    user = User(
        email=data.email,
        username=data.username,
        password_hash=hash_password(data.password),
        display_name=data.display_name,
    )
    await user.insert()

    # Generate tokens
    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=_user_to_response(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """
    Log in with email and password.
    
    Returns JWT tokens if credentials are valid.
    """
    user = await authenticate_user(data.email, data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=_user_to_response(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: TokenRefreshRequest):
    """
    Get a new access token using a refresh token.
    
    Called when the access token expires (every 30 min).
    The frontend sends the refresh token, and we return
    a fresh access token — keeping the user logged in
    without making them re-enter their password.
    """
    payload = decode_token(data.refresh_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token — please log in again",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type — expected a refresh token",
        )

    user_id = payload.get("sub")
    user = await User.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # Generate new tokens
    new_access_token = create_access_token(str(user.id))
    new_refresh_token = create_refresh_token(str(user.id))

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        user=_user_to_response(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get the currently logged-in user's profile.
    
    Requires a valid access token in the Authorization header.
    """
    return _user_to_response(current_user)


@router.put("/me", response_model=UserResponse)
async def update_me(data: UserUpdate, current_user: User = Depends(get_current_user)):
    """
    Update the currently logged-in user's profile.
    
    Only updates fields that are provided (not None).
    """
    if data.display_name is not None:
        current_user.display_name = data.display_name
    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url
    if data.default_currency is not None:
        current_user.default_currency = data.default_currency
    if data.email_digest_enabled is not None:
        current_user.email_digest_enabled = data.email_digest_enabled

    current_user.updated_at = datetime.utcnow()
    await current_user.save()

    return _user_to_response(current_user)
