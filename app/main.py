from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from app.routes import auth, chat, speech_to_text, text_to_speech, text_to_speech_openai, speech_to_text_manual
from app.config import settings
from app.database import create_tables

app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Set up Jinja2 templates
templates = Jinja2Templates(directory="static")

#create users db
@app.on_event("startup")
async def startup_event():
    create_tables()

# Include routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(speech_to_text.router)
app.include_router(speech_to_text_manual.router)
app.include_router(text_to_speech.router)
app.include_router(text_to_speech_openai.router)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
