from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserCreate
from app.services.auth import get_current_user
from app.schemas.message import Message
router = APIRouter()


@router.post("/api/send_message")
async def send_message(message: Message, current_user: UserCreate = Depends(get_current_user)):
    # Decode the token to get the user's email
    user_email = current_user.email
    if user_email is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    # Here, instead of processing the message, we're just echoing it back
    response = f"You said: {message.message}"

    return {"response": response}
