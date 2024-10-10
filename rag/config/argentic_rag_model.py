from langchain_core.messages import  BaseMessage
from langchain_core.pydantic_v1 import BaseModel, Field
from typing import TypedDict

class MathState(TypedDict):

    messages: list[BaseMessage]
    first_user_message: str
    end_conversation: bool
    image_description : str
    is_geometry : bool
    lesson_example : str
    solution: str
    intermediate_calculation : list[str]
    intermediate_solution : list[str]
    intermediate_calculation_explanation : list[str]


class WolframIntermediateQuery(BaseModel):
    # This data class encapsulate the current state of the student to be used by the user_analysis_introduction step
    wolfram_queries: list[str] = Field(description="All the wolfram queries")
    calculation_explanation: list[str] = Field(description="the translation of wolfram query into natural language in French")


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
    lesson_understood : bool
    introduction : bool
    response_count : int
    good_answer : bool

class StudentStateIntroduction(BaseModel):
    # This data class encapsulate the current state of the student to be used by the user_analysis_introduction step
    math_concepts: list = Field(description="Concept of Math of the exercice")
    is_math_question : str = Field(description="is math the subject of the discussion score 'yes' or 'no'")
    is_geometry : bool = Field(description="does the student ask a question about a geometry problem ?")

class StudentStateConcept(BaseModel):
    # This data class encapsulate the current state of the student to be used by the user_analysis_introduction step
    concept_understood: bool = Field(description="Concept of Math of the exercice")

class StudentStateLesson(BaseModel):
    # This data class encapsulate the current state of the student to be used by the user_analysis_introduction step
    need_lesson : bool = Field(description="does the student need to review the lesson on the maths topic ?")
    lesson_understood : bool = Field(description="does the student need to review the lesson on the maths topic ?")

class StudentStateResolution(BaseModel):
    # This data class encapsulate the current state of the student to be used by the user_analysis_introduction step
    good_answer: bool = Field(description="Did the student find the result of the exercice")



class StudentState(BaseModel):
    # This data class encapsulate the current state of the student to be used by the user_analysis step
    clear_conversation: bool = Field(description="Bool to describe if the student wants clear history and start a new exercice")
    math_concepts: list = Field(description="Concept of Math of the exercice")
    is_math_question : str = Field(description="is math the subject of the discussion score 'yes' or 'no'")
    concept_understood : bool = Field(description="does the user already understood the math concept discussed in the exercice")
    need_lesson : bool = Field(description="does the student need to review the lesson on the maths topic ?")
    is_geometry : bool = Field(description="does the student ask a question about a geometry problem ?")
