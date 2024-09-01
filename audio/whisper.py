from openai import OpenAI
import os
import io
from dotenv import load_dotenv
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

def audio_to_text(audio_bytes):
    buffer = io.BytesIO(audio_bytes)
    buffer.name = "audio.wav"  # Explicitly set the filename
    try:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=buffer,
            response_format="text"
        )
        logger.debug("Transcription successful")
        return transcript
    except Exception as e:
        logger.error(f"Error in audio_to_text: {str(e)}")
        raise
