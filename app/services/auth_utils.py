import logging
import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, TokenData, UserInToken
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_user(db: Session, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = User(
        user_id=str(uuid.uuid4()),  # Generate a new UUID for user_id
        email=user.email,
        hashed_password=hashed_password,
        first_name=user.first_name,
        school_class=user.school_class
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, db: Session):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    user = db.query(User).filter(User.email == data["sub"]).first()
    if user:
        to_encode.update({
            "user_id": str(user.user_id),
            "email": user.email
        })
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        user_id: str = payload.get("user_id")
        if email is None or user_id is None:
            raise credentials_exception
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            raise credentials_exception
        token_data = UserInToken(email=email, user_id=user_id, first_name=user.first_name)
        return token_data
    except JWTError:
        raise credentials_exception

def change_user_password(db: Session, user: User, new_password: str) -> bool:
    hashed_password = pwd_context.hash(new_password)
    user.hashed_password = hashed_password
    db.commit()
    return True

def change_user_password(db: Session, user_email: str, new_password: str) -> bool:
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        return False
    hashed_password = pwd_context.hash(new_password)
    user.hashed_password = hashed_password
    db.commit()
    return True

def change_user_password(db: Session, user: User, new_password: str) -> bool:
    """
    Change the password for a user.

    Args:
        db (Session): The database session.
        user (User): The user whose password is being changed.
        new_password (str): The new password.

    Returns:
        bool: True if the password was changed successfully, False otherwise.
    """
    hashed_password = pwd_context.hash(new_password)
    user.hashed_password = hashed_password
    db.commit()
    return True

def get_user_by_email(email: str, db: Session):
    return db.query(User).filter(User.email == email).first()
