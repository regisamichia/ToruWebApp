from pydantic import BaseModel

class Step(BaseModel):
    explanation: str
    reasoning_steps: str

class MathReasoning(BaseModel):
    is_geometry: bool
    explanation: str
    exercice_description : str
