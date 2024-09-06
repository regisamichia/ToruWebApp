from open_ai_client import OpenAILLMModel
from config.argentic_rag_model import State
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

    def build_message_history_chatbot(self, messages: dict) -> str:
        return "\n".join([f"{message.type}: {message.content}" for message in messages["messages"]])

    def generate_response(self, state: State) -> State:
        """ 
        Generate a response based on the current state.

        Args:
            state (State): The current state of the chat.

        Returns:
            State: The updated state with the generated response.
        """
        
        # Get the last 10 messages (or all if less than 10)
        last_messages = state["messages"][-10:]

        # Build the history string from these messages
        history = self.build_message_history_chatbot({"messages": last_messages})

        history = self.build_message_history(state)
        prompt = self.prompt_template.format(
            history=history,
            input=state["messages"][-1].content
        )
        response = self.llm.invoke(prompt)

        # Create a new SystemMessage with the response content
        new_message = SystemMessage(content=response.content)

        # Append the new message to the state
        state["messages"].append(new_message)
        state["end_conversation"] = True

        return state

    def get_user_input(self, state: State) -> State:
        """ 
        Get user input from the state.

        Args:
            state (State): The current state of the chat.

        Returns:
            State: The updated state with user input.
        """

        return state

    def build_graph(self):

        """
        Build the state graph for the chatbot.

        Returns:
            StateGraph: The compiled state graph.
        """

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

        """
        Process user input and generate a response.

        Args:
            user_input (str): The user's input message.
            state (Dict[str, Any]): The current state of the chat.

        Returns:
        """
        state["messages"].append(HumanMessage(content=user_input))
        for event in self.graph.stream(state):
            if isinstance(event, dict):
                state = event[list(event.keys())[0]]
            if state.get("end_conversation", False):
                break

        return state
