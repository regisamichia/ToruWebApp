from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from whisper import audio_to_text
import io
import tempfile
from pydub import AudioSegment
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000"],  # Allow requests from your main application
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    try:
        # Read the uploaded file into memory
        audio_bytes = await audio.read()
        logger.debug(f"Received audio file: {audio.filename}, size: {len(audio_bytes)} bytes")

        # Try to determine the format from the filename
        file_format = audio.filename.split('.')[-1].lower()
        logger.debug(f"Detected file format: {file_format}")

        # Convert the audio to wav format (which is more widely supported)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            try:
                audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=file_format)
                logger.debug("Successfully read audio file")
            except Exception as e:
                logger.error(f"Error reading audio file: {str(e)}")
                raise HTTPException(status_code=400, detail=f"Error reading audio file: {str(e)}")

            audio.export(temp_file.name, format="wav")
            logger.debug(f"Exported audio to WAV format: {temp_file.name}")

            # Read the converted wav file
            with open(temp_file.name, "rb") as wav_file:
                wav_bytes = wav_file.read()

        # Transcribe the audio
        transcription = audio_to_text(wav_bytes)
        logger.debug("Transcription completed successfully")
        return JSONResponse(content={"transcription": transcription})
    except Exception as e:
        logger.error(f"Error in transcribe_audio: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
