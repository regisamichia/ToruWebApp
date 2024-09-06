import yaml
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import AIMessage
from config.argentic_rag_model import State, StudentState
from open_ai_client import OpenAILLMModel


class UserAnalysis(OpenAILLMModel):

    def __init__(self, model_name: str = "gpt-4o-mini") -> None:

        super().__init__(model_name)
        with open('rag/config/prompts.yaml', 'r') as file:
            self.prompts = yaml.safe_load(file)

        self.prompt_analysis = PromptTemplate(
                    template=self.prompts["system_messages"]["user_analysis"],
                    input_variables=["content", "chat_history"]
                )

    def build_message_history(self, state: State) -> str:
            return "\n".join([f"{message.type}: {message.content}" for message in state["messages"]])

    def user_analysis(self, state: State) -> State:
        print(f"STARTING USER ANALYSIS with prompt")
        llm_analysis = self.llm.with_structured_output(StudentState)
        # prompt_analysis = PromptTemplate(
        #             template=self.prompt_analysis,
        #             input_variables=["content", "chat_history"]
        #         )
        print("PROMPT ANALYSIS BUILT")
        chain = self.prompt_analysis | llm_analysis
        print("chain is ok")
        print(f"content : {state["first_user_message"]}")
        print(f"content : {self.build_message_history(state)}")
        student_analysis = chain.invoke({"content": state["first_user_message"], "chat_history" : self.build_message_history(state)})

        return self.update_state(state, student_analysis)

    def update_state(self, state, student_analysis):

        state["clear_conversation"] = student_analysis.clear_conversation
        state["math_concept"] = student_analysis.math_concept
        state["end_conversation"] = student_analysis.clear_conversation

        concept_string = ",".join(f"{i}. {concept}" for i, concept in enumerate(student_analysis.math_concept, 1))
        new_message = AIMessage(content=f"Voici les conceptes de maths qui font référence à l'exercice : {concept_string}")
        state["messages"] = state["messages"] + [new_message]

        return state
