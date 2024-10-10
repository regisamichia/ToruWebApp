import os
from openai import OpenAI
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
import logging
import io
#from dotenv import load_dotenv
import boto3
from botocore.exceptions import NoCredentialsError

# Load environment variables
#load_dotenv("etc/secrets/.env")

router = APIRouter()

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class TextToSpeechRequest(BaseModel):
    text: str
    user_id: str
    message_id: str

client = OpenAI()
s3_client = boto3.client('s3')
bucket_name = 'toruchat'

# Function to upload audio to S3 in the background
def upload_audio_to_s3(audio_bytes: bytes, s3_key: str):
    try:
        s3_client.upload_fileobj(io.BytesIO(audio_bytes), bucket_name, s3_key)
        print(f"File uploaded successfully to s3://{bucket_name}/{s3_key}")
    except Exception as e:
        print(f"Error uploading file to S3: {e}")

@router.post("/api/synthesize_audio_openai")
async def synthesize_audio_openai_endpoint(request: TextToSpeechRequest, background_tasks: BackgroundTasks):
    try:
        # Call OpenAI API for text-to-speech synthesis
        response = client.audio.speech.create(
            model="tts-1",
            voice="nova",
            input=request.text
        )

        # Add a background task to upload the audio to S3
        s3_key = f"audio/{request.user_id}/{request.message_id}.mp3"
        background_tasks.add_task(upload_audio_to_s3, response.content, s3_key)

        # Return the audio as a streaming response
        return StreamingResponse(io.BytesIO(response.content), media_type="audio/mpeg")

    except Exception as error:
        logger.error(f"Error in synthesize_audio_openai_endpoint: {str(error)}")
        raise HTTPException(status_code=500, detail=str(error))
