from open_ai_client import OpenAILLMModel
from config.argentic_rag_model import State
from vector_store import OpenAIChromaVectorStore
from prompt_builder import PromptBuilder
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.prompts import PromptTemplate
from langgraph.graph import StateGraph
from user_analysis import UserAnalysis
from typing import Dict, Any

class Chatbot(UserAnalysis):

    def __init__(self, model_name: str = "gpt-4o-mini") -> None:
        super().__init__(model_name)
        self.graph = self.build_graph()
        self.prompt_template = PromptTemplate(
            input_variables=["history", "input"],
            template="Chat History:\n{history}\nHuman: {input}\nAI:"
        )
        self.vector_store = OpenAIChromaVectorStore(collection_name="toru_v2")
        self.retriever = self.vector_store.as_retriever()

    def generate_response(self, state: State) -> State:

        docs = self.retriever.invoke(state["messages"][0].content)
        doc_content = docs[0].page_content
        print(f"DOC IS : {docs[0]}")
        state["lesson_example"] = doc_content

        prompt_builder = PromptBuilder(state)
        prompt = prompt_builder.build_prompt()
        response = self.llm.invoke(prompt)

        # Create a new SystemMessage with the response content
        new_message = SystemMessage(content=response.content)

        # Append the new message to the state
        state["messages"].append(new_message)
        state["end_conversation"] = True

        return state

    def get_user_input(self, state: State) -> State:

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

    def process_input(self, user_input: str, state: Dict[str, Any]) -> Dict[str, Any]:

        state["messages"].append(HumanMessage(content=user_input))
        for event in self.graph.stream(state):
            if isinstance(event, dict):
                state = event[list(event.keys())[0]]
                #print(f"Updated state: {state}")
            if state.get("end_conversation", False):
                break

        return state
