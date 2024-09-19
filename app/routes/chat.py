from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from PIL import Image
import pytesseract
from app.services.auth import get_current_user
from app.schemas.user import  UserInToken
from app.schemas.message import Message
import logging
from dotenv import load_dotenv


load_dotenv()

router = APIRouter()

#Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


@router.post("/api/send_message")
async def send_message(message: Message, current_user: UserInToken = Depends(get_current_user)):
    user_email = current_user.email
    if user_email is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    response = f"You said: {message.message}"
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
