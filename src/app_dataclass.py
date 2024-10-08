from pydantic import BaseModel

class UserCreate(BaseModel):
    first_name: str
    email: str
    password: str
    school_class: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class Message(BaseModel):
    message: str
