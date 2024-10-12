import sys
import os
from uuid import uuid4
import asyncio

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.config import settings
from config.argentic_rag_model import MathState as State

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Response
from math_chatbot import Chatbot
from math_lesson import MathLesson
from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv("/etc/secrets/.env")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions: Dict[str, State] = {}
chatbot = Chatbot()
math_lesson = MathLesson()

class ChatInput(BaseModel):
    session_id: str
    message: Optional[str]
    image: Optional[UploadFile]
    extracted_text: Optional[str]

def get_or_create_session(session_id: str) -> State:
    if session_id not in sessions:
        sessions[session_id] = State(
            messages=[],
            first_user_message="",
            end_conversation=False,
            image_description="",
            is_geometry=False,
            lesson_example="",
            solution="",
            intermediate_solution=[""],
            intermediate_calculation=[""],
            intermediate_calculation_explanation=[""]
        )
    return sessions[session_id]


@app.post("/api/math_lesson")
async def lesson(
    request: Request,
    session_id: str = Form(...),
    message: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    extracted_text: Optional[str] = Form(None)
):
    print(f"Received lesson request with session_id: {session_id}")
    session = get_or_create_session(session_id)
    print(f"Lesson Session: {session}")

    async def stream_response():
        async for chunk in math_lesson.generate_lesson(session):
            yield chunk

    return StreamingResponse(stream_response(), media_type="text/plain")

@app.post("/api/math_chat")
async def chat(
    request: Request,
    session_id: str = Form(...),
    message: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    extracted_text: Optional[str] = Form(None)
):
    form_data = await request.form()
    session = get_or_create_session(session_id)

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

        async def stream_response():
            try:
                async for chunk in chatbot.process_input(user_input, session):
                    yield chunk.replace("system: ", "")
            except Exception as e:
                print(f"Error in stream_response: {str(e)}")
                yield "Je suis désolé, mais je rencontre des difficultés pour traiter votre demande en ce moment. Veuillez réessayer plus tard."

        return StreamingResponse(stream_response(), media_type="text/plain")

    except Exception as e:
        print(f"Error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/new_session")
async def new_session(response: Response, request: Request):
    session_id = str(uuid4())
    sessions[session_id] = State(
        messages=[],
        first_user_message="",
        end_conversation=False,
        image_description="",
        is_geometry=False,
        lesson_example="",
        solution="",
        intermediate_solution=[""],
        intermediate_calculation=[""],
        intermediate_calculation_explanation=[""]
    )

    origin = request.headers.get("Origin")

    if origin in settings.allowed_origins_list:
        response.headers["Access-Control-Allow-Origin"] = origin

    return {"session_id": session_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
