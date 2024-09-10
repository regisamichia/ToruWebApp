from langchain_core.messages import  BaseMessage
from langchain_core.pydantic_v1 import BaseModel, Field
from typing import TypedDict

class State(TypedDict):
    # This class encapsulate the state of the argentic rag

    messages: list[BaseMessage]
    first_check: bool
    end_conversation: bool
    first_user_message: str
    math_concepts: list[str]
    concept_found : bool
    concept_asked : bool
    is_math_question: str
    retry : bool
    concept_understood : bool
    clear_conversation : bool
    lesson_example : str
    need_lesson : bool
    image_description : str
    is_geometry : bool

class StudentState(BaseModel):
    # This data class encapsulate the current state of the student to be used by the user_analysis step
    clear_conversation: bool = Field(description="Bool to describe if the student wants clear history and start a new exercice")
    math_concepts: list = Field(description="Concept of Math of the exercice")
    is_math_question : str = Field(description="is math the subject of the discussion score 'yes' or 'no'")
    concept_understood : bool = Field(description="does the user already understood the math concept discussed in the exercice")
    need_lesson : bool = Field(description="does the student need to review the lesson on the maths topic ?")
    is_geometry : bool = Field(description="does the student ask a question about a geometry problem ?")
