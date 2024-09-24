import os
from openai import OpenAI
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import logging
import io
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

router = APIRouter()

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class TextToSpeechRequest(BaseModel):
    text: str

client = OpenAI()

@router.post("/api/synthesize_audio_openai")
async def synthesize_audio_openai_endpoint(request: TextToSpeechRequest):
    try:
        # Call OpenAI API for text-to-speech synthesis
        response = client.audio.speech.create(
            model="tts-1",
            voice="nova",
            input=request.text
        )

        # if response.status_code != 200:
        #     logger.error(f"OpenAI API error: {response.text}")
        #     raise HTTPException(status_code=response.status_code, detail="Error from OpenAI API")

        # Return the audio as a streaming response
        return StreamingResponse(io.BytesIO(response.content), media_type="audio/mpeg")

    except Exception as error:
        logger.error(f"Error in synthesize_audio_openai_endpoint: {str(error)}")
        raise HTTPException(status_code=500, detail=str(error))
