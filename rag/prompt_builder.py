import yaml
from config.argentic_rag_model import State
from langchain_core.prompts import PromptTemplate

class PromptBuilder:

    def __init__(self, state : State) -> None:

        with open('rag/config/contextualize_prompts.yaml', 'r') as file:
            self.prompts = yaml.safe_load(file)
        self.state = state
        self.history =  self.build_message_history()


    def build_message_history(self) -> str:

        return "\n".join([f"{message.type}: {message.content}" for message in self.state["messages"]])

    def build_prompt(self) -> PromptTemplate:

        # #print("START PROMPT BUILDER")
        # if self.state["response_count"] == 0:
        #     print("PROMPT INTRO")
        #     return self.build_introduction_prompt()
        # elif "concept_understood" not in self.state or not self.state["concept_understood"]:
        #     print("PROMPT CONCEPT")
        #     return self.build_concept_prompt()
        # elif "need_lesson" not in self.state or not self.state["need_lesson"]:
        #     print("PROMPT EXERCICE")
        #     return self.build_exercice_prompt()
        # elif self.state["need_lesson"]:
        #     print("PROMPT LECON")
        #     return self.build_lesson_prompt()
        # elif "good_answer" in self.state and self.state["good_answer"]:
        #     print("PROMPT GOOD REPONSE")
        #     return self.build_good_answer_prompt()

        # return self.build_default_prompt()

        return self.build_exercice_prompt()

    def select_template(self, prompt_key, placeholder_key):

        return PromptTemplate(
            input_variables=self.prompts["system_messages"][placeholder_key],
            template=self.prompts["system_messages"][prompt_key]
        )

    def build_concept_prompt(self):

        prompt_template = self.select_template("concept_guess", "concept_placeholder")

        return prompt_template.format(
            concept=self.state["math_concepts"][0],
            chat_history=self.history
        )

    def build_exercice_prompt(self):

        prompt_template = self.select_template("exercice_resolution", "lesson_placeholder")
        return prompt_template.format(
            lesson = self.state["lesson_example"],
            chat_history=self.history,
        )

    def build_lesson_prompt(self):

        prompt_template = self.select_template("lesson", "lesson_placeholder")
        return prompt_template.format(
            lesson = self.state["lesson_example"],
            chat_history=self.history
        )

    def build_default_prompt(self):

        prompt_template = self.select_template("default", "default_placeholder")

        return prompt_template.format(
            chat_history=self.history
        )

    def build_introduction_prompt(self):

        prompt_template = self.select_template("introduction", "concept_placeholder")
        return prompt_template.format(
            concept=self.state["math_concepts"][0],
            chat_history=self.history
        )

    def build_good_answer_prompt(self):

        prompt_template = self.select_template("good_answer", "good_answer_placeholder")
        return prompt_template.format(
            concept=self.state["math_concepts"][0]
        )
