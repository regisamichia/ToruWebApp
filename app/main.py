from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from app.routes import auth, chat, speech_to_text, text_to_speech, text_to_speech_openai, speech_to_text_manual, waiting_list, get_presigned_url
from app.config import settings
from app.database import create_tables
import uvicorn
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Received request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Returning response: {response.status_code}")
    return response

# CORS setup
app.add_middleware(
    CORSMiddleware,
    #allow_origins=settings.allowed_origins_list,
    allow_origins=settings["*"], #à changer
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Set up Jinja2 templates
templates = Jinja2Templates(directory="static")

#create users db
# @app.on_event("startup")
# async def startup_event():
#     create_tables()

# Include routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(speech_to_text.router)
app.include_router(speech_to_text_manual.router)
app.include_router(text_to_speech.router)
app.include_router(text_to_speech_openai.router)
app.include_router(waiting_list.router)
app.include_router(get_presigned_url.router)

@app.get("/api/environment")
async def get_environment():
    return {"environment": os.getenv("ENVIRONMENT", "development")}

@app.get("/api/config")
async def get_config():
    return {
        "API_BASE_URL": os.getenv("API_BASE_URL", ""),
        "MATH_CHATBOT_URL": os.getenv("MATH_CHATBOT_URL", ""),
        "MULTIMODAL_URL": os.getenv("MULTIMODAL_URL", ""),
    }

# Serve HTML pages
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("html/homepage.html", {"request": request})

@app.get("/chat", response_class=HTMLResponse)
async def read_chat(request: Request):
    return templates.TemplateResponse("html/chat.html", {"request": request})

@app.get("/settings", response_class=HTMLResponse)
async def read_settings(request: Request):
    return templates.TemplateResponse("html/settings.html", {"request": request})

@app.get("/login", response_class=HTMLResponse)
async def read_login(request: Request):
    return templates.TemplateResponse("html/login.html", {"request": request})

@app.get("/chatHistory", response_class=HTMLResponse)
async def read_chat_history(request: Request):
    return templates.TemplateResponse("html/chatHistory.html", {"request": request})

@app.get("/homepage", response_class=HTMLResponse)
async def read_homepage(request: Request):
    return templates.TemplateResponse("html/homepage.html", {"request": request})

@app.get("/waiting-list", response_class=HTMLResponse)
async def read_waiting_list(request: Request):
    return templates.TemplateResponse("html/waiting-list.html", {"request": request})

@app.get("/health")
async def health_check():
    logger.info("Health check endpoint accessed")
    return {"status": "ok"}

if __name__ == "__main__":
    logger.info("Starting application")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
