from typing import List, Tuple, Dict, Any

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain_core.retrievers import BaseRetriever
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class OpenAIChromaVectorStore:
    """Manages the vector store for document retrieval."""

    def __init__(self, collection_name: str, persist_directory: str = "./chroma_db", model="text-embedding-ada-002"):
        """
        Initialize the VectorStore.

        :param collection_name: Name of the collection in the vector store.
        :param persist_directory: Directory to persist the vector store.
        :param model: Embedding model to be used for vector store.
        """

        self.vectorstore = Chroma(
            persist_directory=persist_directory,
            embedding_function=OpenAIEmbeddings(model=model),
            collection_name=collection_name
        )

    def as_retriever(self, filter_store: Dict[str, Any] = {}) -> BaseRetriever:
        """
        Create a retriever from the vector store.

        :param filter_store: Filter to apply to the retriever.
        :return: A retriever object.
        """
        return self.vectorstore.as_retriever(search_kwargs={'filter': filter_store})
