import aiohttp
import json
import yaml
from typing import Dict, Any, Union, AsyncGenerator
from hosted_vector_store import ChromaAPI
from wolfram_query import WolframQuery
from prompt_builder import PromptBuilder
from langchain_core.messages import SystemMessage, HumanMessage
from open_ai_client import OpenAILLMModel
from config.argentic_rag_model import MathState as State
from langchain_core.prompts import PromptTemplate
import os


class Chatbot(OpenAILLMModel):

    def __init__(self, model_name: str = "gpt-4o-mini") -> None:
        super().__init__(model_name)

        self.vector_store = ChromaAPI()
        self.retriever = self.vector_store.as_retriever(filter={"school_level" : "6e"}) #modifier le niveau pour le récupérer depuis le profil utilisateur
        #self.multimodal_api_url = "http://localhost:8003/api/multimodal"
        self.multimodal_api_url = os.environ["MULTIMODAL_URL"]
        with open('rag/config/contextualize_prompts.yaml', 'r') as file:
            self.prompts = yaml.safe_load(file)


    def build_message_history(self, state) -> str:

        return "\n".join([f"{message.type}: {message.content}" for message in state["messages"]])

    async def get_solution_from_wolfram(self, state):
        query_wolfram = WolframQuery()
        state = await query_wolfram.wolfram_solution(state)
        return state

    async def build_exercice_prompt(self, state):

        if "solution" not in state or state["solution"] == "":

            state = await self.get_solution_from_wolfram(state)


        prompt_template = PromptTemplate(
            input_variables=self.prompts["system_messages"]["exercice_placeholder"],
            template=self.prompts["system_messages"]["exercice_resolution"]
        )
        return prompt_template.format(
            chat_history=self.build_message_history(state),
            solution=state["solution"]
        )

    async def process_image(self, image_data: Dict[str, Any]) -> str:
        async with aiohttp.ClientSession() as session:
            data = aiohttp.FormData()

            # Use the image content directly
            data.add_field('image',
                           image_data['content'],
                           filename=image_data['filename'],
                           content_type=image_data['content_type'])

            try:
                async with session.post(self.multimodal_api_url, data=data, ssl=False) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result
                    else:
                        error_text = await response.text()
                        raise Exception(f"Error from multimodal API: Status {response.status}, {error_text}")
            except aiohttp.ClientConnectorError as e:
                raise Exception(f"Unable to connect to multimodal API: {str(e)}")
            except Exception as e:
                raise

    async def generate_response(self, state: Dict[str, Any]) -> AsyncGenerator[str, None]:
        last_message = state["messages"][-1]
        if isinstance(last_message.content, str):
            try:
                content_dict = json.loads(last_message.content)
                if 'image' in content_dict and state.get("is_geometry", False):
                    image_description = content_dict['extracted_text']
                    state["image_description"] = image_description
                    state["messages"][-1] = HumanMessage(content=f"[Image Description]: {image_description}")
            except json.JSONDecodeError:
                pass

        #ici la requête du doc retriever se fait avec le premier message uniquement, à modifier
        #print("starting retriever")
        docs = self.retriever.invoke(state["messages"][0].content)

        state["lesson_example"] = docs

        prompt = await self.build_exercice_prompt(state)
        print(f"PROMPT : {prompt}")
        response_generator = self.llm.stream(prompt)

        accumulated_response = ""
        for chunk in response_generator:  # Synchronous iteration
            chunk_str = str(chunk.content)  # Convert chunk to string
            accumulated_response += chunk_str
            yield chunk_str  # Yield each chunk as it is received

        new_message = SystemMessage(content=accumulated_response)
        state["messages"].append(new_message)
        state["end_conversation"] = True

    async def process_input(self, user_input: Union[str, Dict[str, Any]], state: Dict[str, Any]) -> AsyncGenerator[str, None]:
        if isinstance(user_input, str):
            state["messages"].append(HumanMessage(content=user_input))
        elif isinstance(user_input, dict) and 'image' in user_input and 'extracted_text' in user_input:
            image_reasoning = await self.process_image(user_input['image'])

            # Convert the dictionary to a JSON string
            image_content = json.dumps({
                'image': user_input['image']['filename'],
                'extracted_text': user_input['extracted_text'],
                'image_description': image_reasoning["response"]
            })
            state["messages"].append(HumanMessage(content=image_content))

        else:
            raise ValueError(f"Invalid input format: {type(user_input)}")

        async for chunk in self.generate_response(state):
            yield chunk
