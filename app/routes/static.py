from fastapi import APIRouter
from fastapi.responses import FileResponse

router = APIRouter()

@router.get("/")
async def read_root():
    return FileResponse("static/login.html")

@router.get("/chat")
async def read_chat():
    return FileResponse("static/chat.html")

@router.get("/login")
async def read_login():
    return FileResponse("static/login.html")

@router.get("/settings")
async def read_settings():
    return FileResponse("static/settings.html")
