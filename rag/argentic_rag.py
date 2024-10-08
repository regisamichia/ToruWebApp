from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, Optional
from uuid import uuid4
from chatbot import Chatbot
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import time
import asyncio
from fastapi import Response
from uuid import uuid4

import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.config import settings



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

chatbot = Chatbot()
sessions: Dict[str, Dict[str, Any]] = {}

class ChatInput(BaseModel):
    """
        Pydantic model for chat input.

        Attributes:
            session_id (str): Unique identifier for the chat session.
            message (str): The user's input message.
    """
    session_id: str
    message: Optional[str]
    image : Optional[UploadFile]
    extracted_text: Optional[str]


def get_or_create_session(session_id: str) -> Dict[str, Any]:
    if session_id not in sessions:
        sessions[session_id] = {"messages": [], "first_user_message": ""}
    return sessions[session_id]

@app.post("/api/argentic_chat")
async def chat(
    request: Request,
    session_id: str = Form(...),
    message: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    extracted_text: Optional[str] = Form(None)
):
    print(f"Received request with session_id: {session_id}")
    print(f"Message: {message}")
    print(f"Image: {image}")
    print(f"Extracted text: {extracted_text}")

    # Log the raw form data
    form_data = await request.form()
    print("Raw form data:", form_data)

    session = get_or_create_session(session_id)
    session["end_conversation"] = False

    try:
        if message is not None:
            user_input = message
            if not session["first_user_message"]:
                session["first_user_message"] = message
        elif image is not None and extracted_text is not None:
            print("Processing image input")
            image_content = await image.read()
            user_input = {
                "image": {
                    "filename": image.filename,
                    "content": image_content,
                    "content_type": image.content_type
                },
                "extracted_text": extracted_text
            }
        else:
            raise HTTPException(status_code=400, detail="Either message or both image and extracted_text must be provided")

        print(f"Processing input type: {type(user_input)}")
        updated_state = await chatbot.process_input(user_input, session)
        sessions[session_id] = updated_state

        async def stream_response():
            # Get the last message, which should be the chatbot's response
            last_message = updated_state["messages"][-1]
            for word in last_message.content.split(" "):
                yield word + " "
                await asyncio.sleep(0.05)

        return StreamingResponse(stream_response(), media_type="text/plain")

    except Exception as e:
        print(f"Error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/new_session")
async def new_session(response: Response, request: Request):
    session_id = str(uuid4())
    sessions[session_id] = {"messages": [], "first_user_message": ""}

    origin = request.headers.get("Origin")

    if origin in settings.allowed_origins_list:
        response.headers["Access-Control-Allow-Origin"] = origin

    return {"session_id": session_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
