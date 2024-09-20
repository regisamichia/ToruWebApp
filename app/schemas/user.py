from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    first_name: str
    email: str
    password: str
    school_class: str

class UserInToken(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    school_class: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None

class ChangePassword(BaseModel):
    current_password: str
    new_password: str
