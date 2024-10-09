import aiohttp
import json
import yaml
from typing import Dict, Any, Union, AsyncGenerator
from hosted_vector_store import ChromaAPI
from prompt_builder import PromptBuilder
from langchain_core.messages import SystemMessage, HumanMessage
from open_ai_client import OpenAILLMModel
from config.argentic_rag_model import MathState as State
from langchain_core.prompts import PromptTemplate
import os

from dotenv import load_dotenv

# Load environment variables
load_dotenv("etc/secrets/.env")

class MathLesson(OpenAILLMModel):

    def __init__(self, model_name: str = "gpt-4o") -> None:
        super().__init__(model_name)

        self.vector_store = ChromaAPI()
        self.retriever = self.vector_store.as_retriever(filter={"school_level" : "6e"}) #modifier le niveau pour le récupérer depuis le profil utilisateur
        with open('rag/config/contextualize_prompts.yaml', 'r') as file:
            self.prompts = yaml.safe_load(file)

    def build_lesson_prompt(self, state):
        prompt_template = PromptTemplate(
            input_variables=self.prompts["system_messages"]["lesson_placeholder"],
            template=self.prompts["system_messages"]["lesson"]
        )

        # Use the first user message in the session as the exercise
        #exercise = state["first_user_message"]
        #print(f"EXO {exercise}")
        lesson = state["lesson_example"]
        print(f"lesson {lesson}")

        return prompt_template.format(
            lesson=lesson
        )
    def build_message_history(self, state) -> str:

            return "\n".join([f"{message.type}: {message.content}" for message in state["messages"]])

    async def generate_lesson(self, state: Dict[str, Any]) -> AsyncGenerator[str, None]:

        #ici la requête du doc retriever se fait avec le premier message uniquement, à modifier
        docs = self.retriever.invoke(self.build_message_history(state))

        # docs = self.retriever.invoke("""
        #     Cet exercice concerne le concept des **aires**.
        #     """
        # )

        state["lesson_example"] = docs

        prompt = self.build_lesson_prompt(state)
        #print(f"prompt : {prompt}")
        response_generator = self.llm.stream(prompt)

        accumulated_response = ""
        for chunk in response_generator:
            chunk_str = str(chunk.content)
            accumulated_response += chunk_str
            yield chunk_str
        print(f"LLM RESPONSE LESSON  : {accumulated_response}")
        new_message = SystemMessage(content=accumulated_response)
        # if "lesson" not in state:
        #     state["lesson"] = []
        # state["lesson"].append(new_message)
