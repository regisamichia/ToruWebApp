from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    first_name: str
    email: str
    password: str
    school_class: str

class UserInToken(BaseModel):
    email: EmailStr

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None
