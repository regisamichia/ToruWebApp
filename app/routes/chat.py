from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, StreamingResponse
from PIL import Image
import pytesseract
from app.services.auth import get_current_user
from app.schemas.user import UserCreate, UserInToken
from app.schemas.message import Message
import logging
from dotenv import load_dotenv
import os
import asyncio
from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    LiveTranscriptionEvents,
    LiveOptions,
)
from starlette.websockets import WebSocketState, WebSocketDisconnect
from queue import Queue
from threading import Thread
import requests
from pydub import AudioSegment
from pydub.playback import play
import io
from pydantic import BaseModel

load_dotenv()

router = APIRouter()

#Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

message_queue = Queue()
# Global variables for collecting final transcriptions
is_finals = []

def process_messages(websocket):
    while True:
        message = message_queue.get()
        if message is None:
            break
        asyncio.run(websocket.send_json(message))

async def on_open(self, open, **kwargs):
    logger.info("Deepgram Connection Open")

async def on_message(self, result):
    try:
        sentence = result.channel.alternatives[0].transcript
        logger.info(f"Received transcription: {sentence}")
        if len(sentence) == 0:
            return

        message_queue.put({
            "type": "transcription",
            "text": sentence,
            "is_final": result.is_final,
            "speech_final": result.speech_final,
        })

        if result.is_final:
            logger.info(f"Final transcription: {sentence}")
        else:
            logger.info(f"Interim Results: {sentence}")
    except Exception as e:
        logger.error(f"Error in on_message: {str(e)}")

async def on_metadata(self, metadata, **kwargs):
    logger.info(f"Metadata: {metadata}")

async def on_speech_started(self, speech_started, **kwargs):
    logger.info("Speech Started")

async def on_utterance_end(self, utterance_end, **kwargs):
    global is_finals
    logger.info("Utterance End")
    if len(is_finals) > 0:
        utterance = " ".join(is_finals)
        logger.info(f"Utterance End: {utterance}")
        is_finals = []

async def on_close(self, close, **kwargs):
    logger.info("Deepgram Connection Closed")

async def on_error(self, error, **kwargs):
    logger.error(f"Deepgram Error: {error}")

@router.websocket("/ws/audio")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection accepted")

    config = DeepgramClientOptions(options={"keepalive": "true"})
    deepgram = DeepgramClient(os.getenv("DEEPGRAM_API_KEY"), config)
    dg_connection = deepgram.listen.asyncwebsocket.v("1")

    dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)

    options = LiveOptions(
        model="nova-2",
        language="fr",
        smart_format=True,
        encoding="linear16",
        channels=1,
        sample_rate=16000,
        interim_results=True,
        punctuate=True,
        utterance_end_ms="1000",
        vad_events=True,
        endpointing=200,
    )

    addons = {"no_delay": "true"}
    message_thread = Thread(target=process_messages, args=(websocket,))
    message_thread.start()

    try:
        logger.info("Starting Deepgram connection...")
        if await dg_connection.start(options, addons=addons) is False:
            logger.error("Failed to connect to Deepgram")
            await websocket.close()
            return

        logger.info("Deepgram connection started successfully")

        while True:
                    try:
                        data = await websocket.receive_bytes()
                        logger.debug(f"Received audio data, size: {len(data)} bytes")
                        await dg_connection.send(data)
                        logger.debug("Sent audio data to Deepgram")
                    except WebSocketDisconnect:
                        logger.info("WebSocket disconnected")
                        break
                    except Exception as e:
                        logger.error(f"Error processing audio data: {str(e)}")

    except Exception as e:
        logger.error(f"WebSocket Error: {str(e)}")
    finally:
        logger.info("Closing Deepgram connection...")
        await dg_connection.finish()
        message_queue.put(None)  # Signal the message processing thread to stop
        message_thread.join()
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close()
        logger.info("WebSocket connection closed")

@router.get("/api/deepgram-key")
async def get_deepgram_key():
    key = os.getenv("DEEPGRAM_API_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="Deepgram API key not found")
    return {"key": key}

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
            "voice" : "Rachel",
            "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.8,
                    "style": 0.0,
                    "use_speaker_boost": True
                }
        }

        voice_id = "XrExE9yKIg1WjnnlVkGX" #à copier sur le site d'eleven labs'
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
