from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
from uuid import uuid4
from chatbot import Chatbot

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize chatbot
chatbot = Chatbot()

# Store sessions
sessions: Dict[str, Dict[str, Any]] = {}

class ChatInput(BaseModel):
    session_id: str
    message: str

def get_or_create_session(session_id: str) -> Dict[str, Any]:
    if session_id not in sessions:
        sessions[session_id] = {"messages": [], "first_user_message": ""}
    return sessions[session_id]

@app.post("/api/argentic_chat")
async def chat(chat_input: ChatInput):
    session = get_or_create_session(chat_input.session_id)

    if not session["first_user_message"]:
        session["first_user_message"] = chat_input.message

    try:
        updated_state = chatbot.process_input(chat_input.message, session)
        sessions[chat_input.session_id] = updated_state
        return {"response": updated_state["messages"][-1].content}
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/new_session")
async def new_session():
    session_id = str(uuid4())
    sessions[session_id] = {"messages": [], "first_user_message": ""}
    return {"session_id": session_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
