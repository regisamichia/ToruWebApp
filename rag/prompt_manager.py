import yaml
from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate, PromptTemplate, MessagesPlaceholder

class PromptManager:
    """Manages the creation of prompts from a configuration file."""

    @staticmethod
    def load_config(config_path: str = 'rag/prompts_config.yaml') -> Dict[str, Any]:
        """
        Load the prompt configuration from a YAML file.

        :param config_path: Path to the configuration file.
        :return: Dictionary containing the prompt configurations.
        """
        with open(config_path, 'r') as file:
            return yaml.safe_load(file)

    @classmethod
    def create_chat_prompt(cls, prompt_name: str) -> ChatPromptTemplate:
        """
        Create a ChatPromptTemplate based on the specified name.

        :param prompt_name: Name of the chat prompt to create.
        :return: The created prompt as a ChatPromptTemplate.
        """
        config = cls.load_config()
        if prompt_name not in config['chat_prompts']:
            raise ValueError(f"Unknown chat prompt: {prompt_name}")

        prompt_config = config['chat_prompts'][prompt_name]
        messages = [
            ("system", prompt_config['system']),
            MessagesPlaceholder("chat_history"),
            ("human", prompt_config['human']),
        ]
        return ChatPromptTemplate.from_messages(messages)

    @classmethod
    def create_template_prompt(cls, prompt_name: str) -> PromptTemplate:
        """
        Create a PromptTemplate based on the specified name.

        :param prompt_name: Name of the template prompt to create.
        :return: The created prompt as a PromptTemplate.
        """
        config = cls.load_config()
        if prompt_name not in config['template_prompts']:
            raise ValueError(f"Unknown template prompt: {prompt_name}")

        template = config['template_prompts'][prompt_name]
        return PromptTemplate(template=template)

    @classmethod
    def create_prompts(cls) -> tuple[ChatPromptTemplate, ChatPromptTemplate, PromptTemplate]:
        """
        Create all necessary prompts.

        :return: A tuple containing contextualize_prompt, qa_prompt, and classification_prompt.
        """
        return (
            cls.create_chat_prompt('contextualize'),
            cls.create_chat_prompt('qa'),
            cls.create_template_prompt('classification')
        )
