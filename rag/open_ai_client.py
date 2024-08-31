from langchain_openai import ChatOpenAI


class OpenAILLMModel:
    """Wrapper for the language model."""

    def __init__(self, model_name: str = "chatgpt-4o-latest"):
        """
        Initialize the LLM model.

        :param model_name: Name of the model to use.
        """
        self.llm = ChatOpenAI(model=model_name)
