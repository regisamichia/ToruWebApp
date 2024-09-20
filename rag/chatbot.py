from open_ai_client import OpenAILLMModel
from config.argentic_rag_model import State
from vector_store import OpenAIChromaVectorStore
from prompt_builder import PromptBuilder
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph
from user_analysis import UserAnalysis
from typing import Dict, Any, Union
import aiohttp
from fastapi import UploadFile
import json
import tempfile
import os
import aiofiles


class Chatbot(UserAnalysis):

    def __init__(self, model_name: str = "gpt-4o-mini") -> None:
        super().__init__(model_name)
        self.graph = self.build_graph()
        self.vector_store = OpenAIChromaVectorStore(collection_name="toru_with_school_level")
        self.retriever = self.vector_store.as_retriever(filter_store={"school_level" : "6e"}) #modifier le niveau pour le récupérer depuis le profil utilisateur
        self.multimodal_api_url = "http://localhost:8003/api/multimodal"

    async def process_image(self, image_data: Dict[str, Any]) -> str:
        async with aiohttp.ClientSession() as session:
            data = aiohttp.FormData()
            
            # Use the image content directly
            data.add_field('image', 
                           image_data['content'],
                           filename=image_data['filename'],
                           content_type=image_data['content_type'])

            try:
                # Disable SSL verification for localhost
                async with session.post(self.multimodal_api_url, data=data, ssl=False) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result['response']
                    else:
                        error_text = await response.text()
                        raise Exception(f"Error from multimodal API: Status {response.status}, {error_text}")
            except aiohttp.ClientConnectorError as e:
                raise Exception(f"Unable to connect to multimodal API: {str(e)}")
            except Exception as e:
                raise

    async def generate_response(self, state: State) -> State:
        last_message = state["messages"][-1]
        if isinstance(last_message.content, str):
            try:
                content_dict = json.loads(last_message.content)
                if 'image' in content_dict and state.get("is_geometry", False):
                    image_description = content_dict['extracted_text']
                    state["image_description"] = image_description
                    state["messages"][-1] = HumanMessage(content=f"[Image Description]: {image_description}")
            except json.JSONDecodeError:
                # If it's not JSON, it's a regular text message, so we don't need to do anything special
                pass

        #ici la requête du doc retriever se fait avec le premier message uniquement, à modifier
        docs = self.retriever.invoke(state["messages"][0].content)

        lesson_example = ""
        for elt in range(len(docs)):
            lesson_example += docs[elt].page_content
        state["lesson_example"] = lesson_example

        prompt_builder = PromptBuilder(state)
        prompt = prompt_builder.build_prompt()
        #print(f"PROMPT : {prompt}")
        response = await self.llm.ainvoke(prompt)

        new_message = SystemMessage(content=response.content)
        print(f"LLM RESPONSE : {new_message}")
        state["messages"].append(new_message)
        state["end_conversation"] = True

        return state

    def get_user_input(self, state: State) -> State:
        if "response_count" not in state:
            state["response_count"] = 0
        else:
            state["response_count"] += 1
        return state

    def build_graph(self):
        print("Building graph...")
        graph_builder = StateGraph(State)

        graph_builder.add_node("user_input", self.get_user_input)
        graph_builder.add_node("user_analysis", self.user_analysis)
        graph_builder.add_node("chatbot", self.generate_response)

        graph_builder.set_entry_point("user_input")

        graph_builder.add_edge("user_input", "user_analysis")
        graph_builder.add_edge("user_analysis", "chatbot")

        compiled_graph = graph_builder.compile()
        return compiled_graph

    async def process_input(self, user_input: Union[str, Dict[str, Any]], state: Dict[str, Any]) -> Dict[str, Any]:
        if isinstance(user_input, str):
            state["messages"].append(HumanMessage(content=user_input))
        elif isinstance(user_input, dict) and 'image' in user_input and 'extracted_text' in user_input:
            # Process the image immediately
            image_description = await self.process_image(user_input['image'])

            # Convert the dictionary to a JSON string
            image_content = json.dumps({
                'image': user_input['image']['filename'],
                'extracted_text': user_input['extracted_text'],
                'image_description': image_description
            })
            state["messages"].append(HumanMessage(content=image_content))
        else:
            raise ValueError(f"Invalid input format: {type(user_input)}")

        async for event in self.graph.astream(state):
            if isinstance(event, dict):
                state = event[list(event.keys())[0]]
            if state.get("end_conversation", False):
                break

        return state
