from langchain_core.messages import  BaseMessage
from langchain_core.pydantic_v1 import BaseModel, Field
from typing import TypedDict

class State(TypedDict):
    # This class encapsulate the state of the argentic rag

    messages: list[BaseMessage]
    #first_check: bool
    end_conversation: bool
    first_user_message: str
    math_concepts: list[str]
    concept_found : bool
    is_math_question: str
    retry : bool
    understood : bool
    clear_conversation : bool

class StudentState(BaseModel):
    # This data class encapsulate the current state of the student to be used by the user_analysis step
    clear_conversation: bool = Field(description="Bool to describe if the student wants clear history and start a new exercice")
    math_concept: list = Field(description="Concept of Math of the exercice")
    is_math_question : str = Field(description="is math the subject of the discussion score 'yes' or 'no'")
