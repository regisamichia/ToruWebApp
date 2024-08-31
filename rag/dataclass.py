from pydantic import BaseModel
from typing import List

class Step(BaseModel):

    statement: str
    explanation: str
    output: str

class HandsOnExercices(BaseModel):

    exercices: list[Step]

class Concept(BaseModel):

    name: str
    explanation: str
    example: str

class Summary(BaseModel):

    content: str

class Message(BaseModel):
    content: str
    is_user: bool

class ChatRequest(BaseModel):
    new_message: str
