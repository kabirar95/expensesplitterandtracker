# ============================================================
# AUTH MIDDLEWARE — Protects routes that need login
# ============================================================
# Middleware sits between the request and your route handler.
# It intercepts every request and checks:
#   "Does this request have a valid JWT token?"
#
# If yes → let the request through and attach the user info
# If no  → block the request with a 401 Unauthorized error
#
# Usage in routes:
#   @router.get("/my-data")
#   async def get_my_data(current_user: User = Depends(get_current_user)):
#       # current_user is now the authenticated user
#       return {"hello": current_user.display_name}
# ============================================================

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.models.user import User
from app.services.auth_service import decode_token

# This tells FastAPI to look for "Authorization: Bearer <token>" in request headers
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """
    Extract and verify the JWT token from the request header.
    
    This function is used as a "dependency" in FastAPI routes.
    When you add `current_user: User = Depends(get_current_user)`,
    FastAPI automatically:
    1. Extracts the Bearer token from the Authorization header
    2. Calls this function to decode and verify it
    3. Looks up the user in the database
    4. Passes the User object to your route handler
    
    If anything fails, it raises a 401 error and the route never executes.
    """
    token = credentials.credentials

    # Decode the JWT token
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check that this is an access token (not a refresh token)
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type — use an access token",
        )

    # Get the user ID from the token
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user ID",
        )

    # Look up the user in the database
    user = await User.get(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found — account may have been deleted",
        )

    return user
