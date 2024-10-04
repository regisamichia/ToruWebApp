from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    first_name: str
    email: str
    password: str
    school_class: str

class UserInToken(BaseModel):
    email: str
    user_id: str
    first_name: str
    id: int | None = None
    school_class: str | None = None

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None
    user_id: str | None = None

class ChangePassword(BaseModel):
    current_password: str
    new_password: str
