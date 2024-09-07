import yaml
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import AIMessage
from config.argentic_rag_model import State, StudentState
from open_ai_client import OpenAILLMModel


class UserAnalysis(OpenAILLMModel):

    def __init__(self, model_name: str = "gpt-4o-mini") -> None:
        """
        Initialize the UserAnalysis class.

        Args:
            model_name (str): The name of the model to use for analysis.
        """
        super().__init__(model_name)
        with open('rag/config/prompts.yaml', 'r') as file:
            self.prompts = yaml.safe_load(file)

        self.prompt_analysis = PromptTemplate(
                    template=self.prompts["system_messages"]["user_analysis"],
                    input_variables=["content", "chat_history"]
                )

    def build_message_history(self, state: State) -> str:
        """
        Build the message history from the state.

        Args:
            state (State): The current state of the chat.

        Returns:
            str: The message history.
        """
        return "\n".join([f"{message.type}: {message.content}" for message in state["messages"]])

    def user_analysis(self, state: State) -> State:
        """
        Perform user analysis and update the state.

        Args:
            state (State): The current state of the chat.

        Returns:
            State: The updated state with user analysis.
        """
        llm_analysis = self.llm.with_structured_output(StudentState)
        chain = self.prompt_analysis | llm_analysis
        student_analysis = chain.invoke({"content": state["first_user_message"], "chat_history" : self.build_message_history(state)})

        return self.update_state(state, student_analysis)

    def update_state(self, state, student_analysis):
        """
        Update the state with user analysis results.

        Args:
            state (State): The current state of the chat.
            student_analysis (StudentState): The analysis results for the user.

        Returns:
            State: The updated state with user analysis.
        """
        state["clear_conversation"] = student_analysis.clear_conversation
        state["math_concepts"] = student_analysis.math_concepts
        state["end_conversation"] = student_analysis.clear_conversation
        state["concept_understood"] = student_analysis.concept_understood

        concept_string = ",".join(f"{i}. {concept}" for i, concept in enumerate(student_analysis.math_concepts, 1))
        new_message = AIMessage(content=f"Voici les conceptes de maths qui font référence à l'exercice : {concept_string}")
        state["messages"] = state["messages"] + [new_message]

        return state
