import yaml
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import AIMessage
from config.argentic_rag_model import (State,
    StudentState,
    StudentStateIntroduction,
    StudentStateConcept,
    StudentStateLesson,
    StudentStateResolution)
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


    def build_prompt(self, prompt_key):

        return PromptTemplate(
                    template=self.prompts["system_messages"][prompt_key],
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

        if state["response_count"] == 0:
            return self.user_analysis_intro(state)
        elif not state["introduction"] and ("concept_understood" not in state or state["concept_understood"] == False):
            return self.user_analysis_concept(state)
        elif state["concept_understood"] and ("lesson_understood" not in state or not state["lesson_understood"]):
            return self.user_analysis_lesson(state)
        else:
            return state

        # llm_analysis = self.llm.with_structured_output(StudentState)
        # chain = self.prompt_analysis | llm_analysis
        # student_analysis = chain.invoke({"content": state["first_user_message"], "chat_history" : self.build_message_history(state)})

        # return self.update_state(state, student_analysis)

    def user_analysis_intro(self, state: State) -> State:

        prompt = self.build_prompt("user_analysis_introduction")
        llm_analysis = self.llm.with_structured_output(StudentStateIntroduction)
        chain = prompt | llm_analysis
        student_analysis = chain.invoke({"content": state["first_user_message"], "chat_history" : self.build_message_history(state)})
        state["math_concepts"] = student_analysis.math_concepts
        state["is_geometry"] = student_analysis.is_geometry
        state["is_math_question"] = student_analysis.is_math_question
        state["introduction"] = False

        return state

    def user_analysis_concept(self, state: State) -> State:
        #print("START USER ANALYSIS CONCEPT")
        prompt = self.build_prompt("user_analysis_concept")
        llm_analysis = self.llm.with_structured_output(StudentStateConcept)
        chain = prompt | llm_analysis
        student_analysis = chain.invoke({"content": state["first_user_message"], "chat_history" : self.build_message_history(state)})
        #print(f"STUDENT ANALYSIS : {student_analysis}")
        state["concept_understood"] = student_analysis.concept_understood

        return state

    def user_analysis_lesson(self, state: State) -> State:

        #print("START USER ANALYSIS LESSON")
        prompt = self.build_prompt("user_analysis_lesson")
        llm_analysis = self.llm.with_structured_output(StudentStateLesson)
        chain = prompt | llm_analysis
        student_analysis = chain.invoke({"content": state["first_user_message"], "chat_history" : self.build_message_history(state)})

        state["need_lesson"] = student_analysis.need_lesson
        state["lesson_understood"] = student_analysis.lesson_understood

        return state

    def user_analysis_resolution(self, state: State) -> State:

        #print("START USER ANALYSIS RESOLUTION")
        prompt = self.build_prompt("user_analysis_resolution")
        llm_analysis = self.llm.with_structured_output(StudentStateResolution)
        chain = prompt | llm_analysis
        student_analysis = chain.invoke({"chat_history" : self.build_message_history(state)})

        state["good_answer"] = student_analysis.good_answer

        return state
