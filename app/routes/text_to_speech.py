import os
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import  StreamingResponse
import requests
import logging
import io
import boto3


router = APIRouter()

#Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class TextToSpeechRequest(BaseModel):
    text: str
    user_id: str
    message_id: str

s3_client = boto3.client('s3')
bucket_name = 'toruchat'

# Function to upload audio to S3 in the background
def upload_audio_to_s3(audio_bytes: bytes, s3_key: str):
    try:
        s3_client.upload_fileobj(io.BytesIO(audio_bytes), bucket_name, s3_key)
        print(f"File uploaded successfully to s3://{bucket_name}/{s3_key}")
    except Exception as e:
        print(f"Error uploading file to S3: {e}")

@router.post("/api/synthesize_audio")
async def synthesize_audio_endpoint(request: TextToSpeechRequest, background_tasks: BackgroundTasks):
    try:
        headers = {
            "xi-api-key": os.getenv("ELEVEN_API_KEY"),
            "Content-Type": "application/json"
        }
        payload = {
            "text": request.text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.8,
                    "style": 0.0,
                    "use_speaker_boost": True
                }
        }

        voice_id = os.getenv("ELEVEN_VOICE_ID")

        response = requests.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream",
            json=payload,
            headers=headers,
            stream=True
        )

        if response.status_code != 200:
            logger.error(f"Eleven Labs API error: {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Error from Eleven Labs API")

        # Add a background task to upload the audio to S3
        s3_key = f"audio/{request.user_id}/{request.message_id}.mp3"
        background_tasks.add_task(upload_audio_to_s3, response.content, s3_key)

        # Return the audio as a streaming response
        return StreamingResponse(io.BytesIO(response.content), media_type="audio/mpeg")

    except Exception as error:
        logger.error(f"Error in synthesize_audio_endpoint: {str(error)}")
        raise HTTPException(status_code=500, detail=str(error))
