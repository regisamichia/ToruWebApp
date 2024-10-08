from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv("etc/secrets/.env")

class OpenAILLMModel:
    """Wrapper for the language model."""

    def __init__(self, model_name: str = "gpt-4o-mini"):
        """
        Initialize the LLM model.

        :param model_name: Name of the model to use.
        """
        self.llm = ChatOpenAI(model=model_name, temperature = 0.8)
