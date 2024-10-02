from pydantic import BaseModel, EmailStr

class WaitingListEntry(BaseModel):
    name: str
    email: EmailStr
    school_class: str
    sourcing: str

class WaitingListResponse(BaseModel):
    message: str
