import time
from typing import List, Tuple, Dict, Any, AsyncGenerator
from open_ai_client import OpenAILLMModel
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.retrievers import BaseRetriever
from langchain_core.prompts import ChatPromptTemplate, PromptTemplate, MessagesPlaceholder
from langchain.chains import create_retrieval_chain, LLMChain, create_history_aware_retriever
from langchain.chains.combine_documents import create_stuff_documents_chain
import asyncio

class RAGChain:
    """Manages the Retrieval-Augmented Generation chain."""

    def __init__(self, llm: OpenAILLMModel, retriever: BaseRetriever,
                 contextualize_q_prompt: ChatPromptTemplate, qa_prompt: ChatPromptTemplate, chat_history = list()):
        """
        Initialize the RAG chain.

        :param llm: The language model to use.
        :param retriever: The retriever to use for document retrieval.
        :param contextualize_q_prompt: The prompt for contextualizing questions.
        :param qa_prompt: The prompt for question answering.
        """
        history_aware_retriever = create_history_aware_retriever(
            llm.llm, retriever, contextualize_q_prompt
        )
        question_answer_chain = create_stuff_documents_chain(llm.llm, qa_prompt)
        self.chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

        self.chat_history = chat_history

    def invoke(self, input_text: str) -> Dict[str, Any]:
        """
        Invoke the RAG chain.

        :param input_text: The input text to process.
        :param chat_history: The chat history.
        :return: The response from the RAG chain.
        """
        return self.chain.invoke({"input": input_text, "chat_history": self.chat_history})

    async def process_question(self, question) -> AsyncGenerator[str, None]:

        msg = self.invoke(question)
        self.chat_history.extend([
            HumanMessage(content=question),
            AIMessage(content=msg["answer"]),
        ])
        response = msg["answer"]
        #return response
        for word in response.split(" "):
            yield word + " "
            await asyncio.sleep(0.05)
