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

        if not self.state["concept_understood"]:
            return self.build_concept_prompt()
        elif not self.state["need_lesson"]:
            return self.build_exercice_prompt()
        elif self.state["need_lesson"]:
            return self.build_lesson_prompt()

        return self.build_default_prompt()

    def select_template(self, prompt_key, placeholder_key):

        return PromptTemplate(
            input_variables=self.prompts["system_messages"][placeholder_key],
            template=self.prompts["system_messages"][prompt_key]
        )

    def build_concept_prompt(self):

        if "concept_asked" not in self.state or not self.state["concept_asked"]:
            self.state["concept_asked"] = True
            prompt_template = self.select_template("concept_guess", "concept_placeholder")
        else:
            prompt_template = self.select_template("concept_retry", "concept_placeholder")

        return prompt_template.format(
            concept=self.state["math_concepts"][0],
            chat_history=self.history
        )

    def build_exercice_prompt(self):

        prompt_template = self.select_template("exercice_resolution", "default_placeholder")
        return prompt_template.format(
            chat_history=self.history
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
