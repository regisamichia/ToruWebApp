from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserCreate, Token, ChangePassword, UserInToken
from app.models.user import User
from app.services.auth_utils import create_user, authenticate_user, create_access_token, get_current_user, change_user_password
from app.config import settings
from jose import JWTError, jwt
from datetime import datetime, timedelta

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


@router.post("/api/change_password")
async def change_password(
    change_password_data: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not authenticate_user(db, current_user.email, change_password_data.current_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    success = change_user_password(db, current_user, change_password_data.new_password)
    if success:
        return {"message": "Password changed successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to change password")

@router.post("/api/refresh")
async def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        # Create a new access token
        access_token = create_access_token(data={"sub": email}, db=db)
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
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    access_token = create_access_token(data={"sub": user.email}, db=db)
    refresh_token = create_refresh_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user_id": str(user.user_id)
    }

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
async def logout(response: Response, token: str = Depends(oauth2_scheme)):
    try:
        # Decode the token to get the user's information
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")

        # Here you could add the token to a blacklist if you want to invalidate it server-side
        # For example: await add_token_to_blacklist(token)

        # Clear the cookie if you're using cookie-based authentication
        response.delete_cookie(key="access_token")

        return {"message": "Logged out successfully"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/api/user_info")
async def get_user_info(current_user: UserInToken = Depends(get_current_user)):
    return {
        "user_id": current_user.user_id,
        "email": current_user.email,
        "first_name": current_user.first_name
    }
