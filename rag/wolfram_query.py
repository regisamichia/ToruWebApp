import aiohttp
import json
import yaml
from typing import Dict, Any, Union, AsyncGenerator
from prompt_builder import PromptBuilder
from open_ai_client import OpenAILLMModel
from config.argentic_rag_model import MathState as State
from langchain_core.prompts import PromptTemplate
from langchain_community.utilities.wolfram_alpha import WolframAlphaAPIWrapper
from config.argentic_rag_model import WolframIntermediateQuery
import os
import asyncio
import re
import httpx

#from dotenv import load_dotenv

# Load environment variables
#load_dotenv("etc/secrets/.env")

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
        query = self.llm(prompt)

        return query.content

    async def wolfram_solution(self, state):
        query = self.wolfram_query(state)
        try:
            # Use asyncio.to_thread to run the synchronous Wolfram Alpha query in a separate thread
            response = await asyncio.to_thread(self.wolfram.run, query)
            match = re.search(r"Answer: (.+)", response)
            try:
                state["solution"] = match.group(1).replace("x = ","")
            except:
                state["solution"] = "Unable to parse Wolfram Alpha response"
        except (httpx.RemoteProtocolError, Exception) as e:
            print(f"Error in wolfram_solution: {str(e)}")
            state["solution"] = "Wolfram Alpha service unavailable"
        return state

    async def wolfram_query_intermediate(self, state):

        prompt  = PromptTemplate(
            input_variables=self.prompts["system_messages"]["wolfram_intermediate_placeholder"],
            template=self.prompts["system_messages"]["wolfram_intermediate"]
        )

        llm_analysis = self.llm.with_structured_output(WolframIntermediateQuery)
        chain = prompt | llm_analysis
        query = chain.invoke({"last_message": state["messages"][-2]})

        state["intermediate_calculation"] = query.wolfram_queries
        state["intermediate_calculation_explanation"] = query.calculation_explanation
        list_solution = []
        for query in state["intermediate_calculation"]:
            try:
                response = await asyncio.to_thread(self.wolfram.run, query)
                match = re.search(r"Answer: (.+)", response)
                try:
                    list_solution.append(match.group(1))
                except:
                    list_solution.append("Unable to parse Wolfram Alpha response")
            except (httpx.RemoteProtocolError, Exception) as e:
                print(f"Error in wolfram_query_intermediate: {str(e)}")
                list_solution.append("Wolfram Alpha service unavailable")

        state["intermediate_solution"] = list_solution

        return state
