from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserCreate, Token
from app.services.auth import create_user, authenticate_user, create_access_token
from app.config import settings
from jose import JWTError, jwt
from datetime import datetime, timedelta

router = APIRouter()

@router.post("/api/refresh")
async def refresh_token(refresh_token: str):

    """
    Refresh the access token using a valid refresh token.

    Args:
        refresh_token (str): The refresh token to validate and use for creating a new access token.

    Returns:
        dict: A dictionary containing the new access token and its type.

    Raises:
        HTTPException: If the refresh token is invalid or expired.
    """
    try:
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        # Create a new access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": email}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@router.post("/api/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    """
        Register a new user.

        Args:
            user (UserCreate): The user data for registration.
            db (Session): The database session.

        Returns:
            dict: The created user information.

        Raises:
            HTTPException: If there's an error during user creation.
        """
    return create_user(db, user)

@router.post("/api/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
        Authenticate a user and provide access and refresh tokens.

        Args:
            form_data (OAuth2PasswordRequestForm): The login credentials.
            db (Session): The database session.

        Returns:
            dict: A dictionary containing access token, refresh token, and token type.

        Raises:
            HTTPException: If the login credentials are incorrect.
        """
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

def create_refresh_token(data: dict):
    """
        Create a refresh token.

        Args:
            data (dict): The payload to be encoded in the token.

        Returns:
            str: The encoded refresh token.
        """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)  # refresh token valid for 7 days
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

@router.post("/api/logout")
async def logout():
    """
        Log out the user.

        Returns:
            dict: A message indicating successful logout.
        """
    return {"message": "Logged out successfully"}
