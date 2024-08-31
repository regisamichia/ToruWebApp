from langchain.llms.base import LLM
from langchain.chains import RetrievalQA
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings
from langchain.prompts import PromptTemplate
from typing import Any, List, Mapping, Optional, Dict
from openai import OpenAI
from openai.types.chat import ChatCompletion
from pydantic import BaseModel, Field
import os

class FormattedResponse(BaseModel):
    answer: str = Field(..., description="The answer to the question")
    sources: List[str] = Field(..., description="Sources used to answer the question")

class ParsedOpenAILLM(LLM):

    def __init__(self, model: str = "gpt-4o-mini"):
        super().__init__()
        self.client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
        self.model = model

    def _call(self, prompt: str, role : str, response_format : BaseModel, stop: Optional[List[str]] = None) -> Dict[str, Any]:
        messages = [{"role": role, "content": prompt}]

        response: ChatCompletion = self.client.chat.completions.parse(
            model=self.model,
            messages=messages,
            response_format=response_format,
            timeout=10
        )

        return response.choices[0].message

    @property
    def _llm_type(self) -> str:
        return "parsed_openai"
