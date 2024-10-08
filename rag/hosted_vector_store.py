from langchain.vectorstores import VectorStore
from langchain.schema import Document
import requests
from dotenv import load_dotenv
from langchain_core.retrievers import BaseRetriever
from openai import OpenAI
import os
from pydantic import BaseModel, Field
from typing import Optional, Type, Dict, Any

# Load environment variables
#load_dotenv("etc/secrets/.env")


class ChromaAPI(VectorStore):
    def __init__(self, base_url=os.environ["CHROMA_DB_URL"], api_key=os.environ["CHROMA_API_KEY"]):
        self.base_url = base_url
        self.api_key = api_key
        self.collection_id = os.environ["CHROMA_COLLECTION_ID"]
        self.headers = {
            "X-Chroma-Token": self.api_key,
            "Content-Type": "application/json"
        }
        self.client = OpenAI()

    def add_texts(self, texts, embeddings, metadatas=None):
        url = f"{self.base_url}/collections/{self.collection_id}/add"
        payload = {
            "documents": texts,
            "embeddings": embeddings,
            "metadatas": metadatas or [{} for _ in range(len(texts))]
        }
        response = requests.post(url, json=payload, headers=self.headers)
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Error adding texts: {response.text}")

    def from_texts(self, texts, embeddings, metadatas=None):
        """Store texts, embeddings, and metadata in the vector store."""
        self.add_texts(texts, embeddings, metadatas)

    def similarity_search(self, query_embedding, k=1, filter=None):
        url = f"{self.base_url}/collections/{self.collection_id}/query"
        payload = {
            "query_embeddings": [query_embedding],
            "n_results": k
        }
        if filter:
            payload["where"] = filter
        response = requests.post(url, json=payload, headers=self.headers)
        if response.status_code == 200:
            documents = response.json()["documents"]
            print(documents)
            return documents[0]
        else:
            raise Exception(f"Error querying: {response.text}")

    def as_retriever(self, search_kwargs=None, filter=None):
        search_kwargs = search_kwargs or {}
        k = search_kwargs.get('k', 4)
        return ChromaRetriever(vector_store=self, k=k, filter=filter)

# Custom retriever class
class ChromaRetriever(BaseRetriever):
    vector_store: ChromaAPI
    k: int = 4
    filter: Optional[dict] = None
    client: OpenAI = Field(default_factory=lambda: OpenAI())

    class Config:
        arbitrary_types_allowed = True

    def __init__(self, vector_store: ChromaAPI, k: int = 4, filter: Optional[dict] = None, **kwargs: Any):
        super().__init__(vector_store=vector_store, k=k, filter=filter, client=OpenAI(), **kwargs)

    def get_embeddings(self, texts):
        response = self.client.embeddings.create(
            input=texts,
            model= "text-embedding-ada-002"
        )
        data = response.data
        embeddings = [item.embedding for item in data]
        return embeddings

    def _get_relevant_documents(self, query: str):
        query_embedding = self.get_embeddings([query])[0]
        return self.vector_store.similarity_search(
            query_embedding,
            k=self.k,
            filter=self.filter
        )
