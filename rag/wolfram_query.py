import aiohttp
import json
import yaml
from typing import Dict, Any, Union, AsyncGenerator
from prompt_builder import PromptBuilder
from open_ai_client import OpenAILLMModel
from config.argentic_rag_model import MathState as State
from langchain_core.prompts import PromptTemplate
from langchain_community.utilities.wolfram_alpha import WolframAlphaAPIWrapper
import os
import asyncio
import re

from dotenv import load_dotenv

# Load environment variables
load_dotenv("etc/secrets/.env")

class WolframQuery(OpenAILLMModel):

    def __init__(self, model_name: str = "gpt-4o") -> None:
        super().__init__(model_name)

        with open('rag/config/contextualize_prompts.yaml', 'r') as file:
            self.prompts = yaml.safe_load(file)
        self.prompt = self.prompts["system_messages"]["wolfram"]
        self.wolfram = WolframAlphaAPIWrapper()

    def build_wolfram_prompt(self, state):
        prompt_template = PromptTemplate(
            input_variables=self.prompts["system_messages"]["wolfram_placeholder"],
            template=self.prompts["system_messages"]["wolfram"]
        )

        # Use the first user message in the session as the exercise
        exercise = state["first_user_message"]

        return prompt_template.format(
            exercice=exercise
        )

    def wolfram_query(self, state):

        prompt = self.build_wolfram_prompt(state)
        print(f"THIS IS THE WOLFRAM PROMPT : {prompt}")
        query = self.llm(prompt)
        print(f"THIS IS THE WOLFRAM QUERY : {query.content}")

        return query.content

    async def wolfram_solution(self, state):
        query = self.wolfram_query(state)

        # Use asyncio.to_thread to run the synchronous Wolfram Alpha query in a separate thread
        response = await asyncio.to_thread(self.wolfram.run, query)
        print(f"THIS IS THE WOLFRAM RESPONSE : {response}")
        match = re.search(r"Answer: (.+)", response)
        try:
            state["solution"] = match.group(1).replace("x = ","")
        except:
            pass
        return state
