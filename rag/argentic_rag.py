"""
This module implements a FastAPI application for an Argentic RAG chatbot.
It handles session management and processes chat inputs using a Chatbot instance.
"""

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
    """
        Pydantic model for chat input.

        Attributes:
            session_id (str): Unique identifier for the chat session.
            message (str): The user's input message.
    """
    session_id: str
    message: str

def get_or_create_session(session_id: str) -> Dict[str, Any]:
    """
    Retrieve an existing session or create a new one if it doesn't exist.

    Args:
        session_id (str): The unique identifier for the session.

    Returns:
        Dict[str, Any]: The session state dictionary.
    """
    if session_id not in sessions:
        sessions[session_id] = {"messages": [], "first_user_message": ""}
    return sessions[session_id]

@app.post("/api/argentic_chat")
async def chat(chat_input: ChatInput):
    """
    Process a chat input and return the chatbot's response.

    This endpoint handles the main chat functionality. It retrieves or creates a session,
    processes the user's input through the chatbot, and returns the response.

    Args:
        chat_input (ChatInput): The chat input containing session_id and message.

    Returns:
        dict: A dictionary containing the chatbot's response.

    Raises:
        HTTPException: If an error occurs during processing.
    """
    session = get_or_create_session(chat_input.session_id)

    # Reset end_conversation to False at the beginning of each call
    session["end_conversation"] = False

    if not session["first_user_message"]:
        session["first_user_message"] = chat_input.message

    try:
        print(f"Processing message: {chat_input.message}")
        updated_state = chatbot.process_input(chat_input.message, session)
        #print(f"Updated state after processing: {updated_state}")

        # Update the session with the new state
        sessions[chat_input.session_id] = updated_state

        # Get the last message, which should be the chatbot's response
        last_message = updated_state["messages"][-1]
        return {"response": last_message.content}
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/new_session")
async def new_session():
    """
    Create a new chat session.

    This endpoint generates a new unique session ID and initializes a new session state.

    Returns:
        dict: A dictionary containing the new session ID.
    """
    session_id = str(uuid4())
    sessions[session_id] = {"messages": [], "first_user_message": ""}
    return {"session_id": session_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
