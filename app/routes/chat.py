import json
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Body, Form
from fastapi.responses import JSONResponse
from PIL import Image
import pytesseract
from app.services.auth_utils import get_current_user
from app.schemas.user import UserInToken
from app.schemas.message import Message
from pydantic import BaseModel
from pathlib import Path
import logging
import boto3
import os
from botocore.exceptions import NoCredentialsError,  ClientError
#from dotenv import load_dotenv
from datetime import datetime
from app.models.user import User
from typing import List, Optional


#load_dotenv()

router = APIRouter()

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

#AWS S3 Storage
s3_client = boto3.client('s3')
bucket_name = 'toruchat'

# Define the ChatHistory model
class ChatHistory(BaseModel):
    userId: str
    sessionId: str
    userMessage: str
    botMessage: str
    timestamp: str

class Message(BaseModel):
    role: str
    content: str
    timestamp: str
    messageId: Optional[str] = None
    messageIds: Optional[List[str]] = None

    def to_dict(self):
        result = {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp,
        }
        if self.messageId:
            result["messageId"] = self.messageId
        if self.messageIds:
            result["messageIds"] = self.messageIds
        return result

class Conversation(BaseModel):
    userId: str
    sessionId: str
    messages: List[Message]

    def to_dict(self):
        return {
            "userId": self.userId,
            "sessionId": self.sessionId,
            "messages": [message.to_dict() for message in self.messages]
        }

class UserIdRequest(BaseModel):
    user_id: str

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
    if user_email is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    try:
        img = Image.open(image.file)
        text = pytesseract.image_to_string(img)
        return JSONResponse(content={"text": text})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/save_chat_history")
async def save_chat_history(conversation: Conversation, current_user: UserInToken = Depends(get_current_user)):
    logger.debug(f"Saving chat history for user ID: {current_user.user_id}")

    s3_key = f"messages/{current_user.user_id}/{conversation.sessionId}.json"

    try:
        conversation_dict = conversation.to_dict()
        conversation_dict['userId'] = current_user.user_id

        try:
            existing_data = s3_client.get_object(Bucket=bucket_name, Key=s3_key)
            existing_conversation = json.loads(existing_data['Body'].read().decode('utf-8'))
            existing_conversation['messages'].extend(conversation_dict['messages'])
            updated_conversation = existing_conversation
        except s3_client.exceptions.NoSuchKey:
            updated_conversation = conversation_dict

        s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=json.dumps(updated_conversation),
            ContentType='application/json'
        )
        return {"message": "Chat history saved successfully"}
    except Exception as e:
        logger.error(f"Failed to save chat history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save chat history: {str(e)}")

@router.post("/api/get_chat_history")
async def get_chat_history(current_user: UserInToken = Depends(get_current_user)):
    # Use the user ID from the token directly, no need for a separate request body
    prefix = f"messages/{current_user.user_id}/"
    try:
        objects = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=prefix)
        chat_history = []
        for obj in objects.get('Contents', []):
            file_data = s3_client.get_object(Bucket=bucket_name, Key=obj['Key'])
            conversation = json.loads(file_data['Body'].read().decode('utf-8'))
            chat_history.append(conversation)
        return chat_history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get chat history: {str(e)}")

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

@router.post("/api/upload_image")
async def upload_image(image: UploadFile = File(...), image_id: str = Form(...)):
    try:
        file_extension = os.path.splitext(image.filename)[1]
        s3_key = f"images/{image_id}{file_extension}"

        s3_client.upload_fileobj(image.file, bucket_name, s3_key)

        return JSONResponse(content={"message": "Image uploaded successfully", "image_id": image_id}, status_code=200)
    except ClientError as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
