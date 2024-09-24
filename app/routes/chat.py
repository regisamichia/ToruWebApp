import json
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Body
from fastapi.responses import JSONResponse
from PIL import Image
import pytesseract
from app.services.auth_utils import get_current_user
from app.schemas.user import UserInToken
from app.schemas.message import Message
from pydantic import BaseModel
from pathlib import Path
import logging
from dotenv import load_dotenv
from datetime import datetime
from app.models.user import User

load_dotenv()

router = APIRouter()

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Define the path where chat histories will be stored
CHAT_HISTORY_DIR = Path("chat_histories")
CHAT_HISTORY_DIR.mkdir(exist_ok=True)

# Define the ChatHistory model
class ChatHistory(BaseModel):
    userId: str
    sessionId: str
    userMessage: str
    botMessage: str
    timestamp: str

@router.post("/api/send_message")
async def send_message(message: Message, current_user: UserInToken = Depends(get_current_user)):
    user_email = current_user.email
    if user_email is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    response = f"You said: {message.message}"
    
    # Store the conversation
    await save_chat_history(ChatHistory(
        userId=str(current_user.id),
        sessionId=message.session_id,
        userMessage=message.message,
        botMessage=response,
        timestamp=datetime.utcnow().isoformat()
    ))
    
    return {"response": response}

@router.post("/api/extract_text")
async def extract_text_from_image(image: UploadFile = File(...), current_user: UserInToken = Depends(get_current_user)):
    logging.info(f"Extracting text for user: {current_user.email}")
    logging.info(f"Received image: {image.filename}, Content-Type: {image.content_type}")

    user_email = current_user.email
    print(f"this is user email : {user_email}")
    if user_email is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    try:
        img = Image.open(image.file)
        text = pytesseract.image_to_string(img)
        return JSONResponse(content={"text": text})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/save_chat_history")
async def save_chat_history(chat_history: ChatHistory):
    user_file = CHAT_HISTORY_DIR / f"{chat_history.userId}.json"
    
    try:
        if user_file.exists():
            with open(user_file, "r") as f:
                existing_history = json.load(f)
        else:
            existing_history = []

        existing_history.append(chat_history.dict())

        with open(user_file, "w") as f:
            json.dump(existing_history, f, indent=2)

        return {"message": "Chat history saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save chat history: {str(e)}")

from app.schemas.user import UserInToken
from app.services.auth_utils import get_current_user

@router.get("/api/get_chat_history/{user_id}")
async def get_chat_history(user_id: str, current_user: UserInToken = Depends(get_current_user)):
    print(f"Attempting to get chat history for user_id: {user_id}")
    print(f"Current user: {current_user.user_id}")

    if user_id == "undefined" or user_id == "null":
        raise HTTPException(status_code=400, detail="Invalid user ID")

    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this chat history")
    
    user_file = CHAT_HISTORY_DIR / f"{user_id}.json"
    
    if not user_file.exists():
        return []

    try:
        with open(user_file, "r") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve chat history: {str(e)}")

@router.delete("/api/delete_chat_history/{user_id}")
async def delete_chat_history(user_id: str, current_user: UserInToken = Depends(get_current_user)):
    if str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this chat history")
    
    user_file = CHAT_HISTORY_DIR / f"{user_id}.json"
    
    if not user_file.exists():
        return {"message": "No chat history found for this user"}

    try:
        user_file.unlink()
        return {"message": "Chat history deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete chat history: {str(e)}")
