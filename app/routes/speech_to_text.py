import logging
import asyncio
import os
from queue import Queue
from dotenv import load_dotenv
from threading import Thread
from fastapi import APIRouter, WebSocket, HTTPException
from starlette.websockets import WebSocketState, WebSocketDisconnect
from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    LiveTranscriptionEvents,
    LiveOptions,
)

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
