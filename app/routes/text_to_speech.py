import os
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from fastapi.responses import  StreamingResponse
import requests
import logging
import io


router = APIRouter()

#Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class TextToSpeechRequest(BaseModel):
    text: str

@router.post("/api/synthesize_audio")
async def synthesize_audio_endpoint(request: TextToSpeechRequest):
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

        # Return the audio as a streaming response
        return StreamingResponse(io.BytesIO(response.content), media_type="audio/mpeg")

    except Exception as error:
        logger.error(f"Error in synthesize_audio_endpoint: {str(error)}")
        raise HTTPException(status_code=500, detail=str(error))
