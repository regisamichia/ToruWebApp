from vector_store import OpenAIChromaVectorStore
from open_ai_client import OpenAILLMModel
from prompt_manager import PromptManager
from rag_chain import RAGChain
from formatted_output_openai import ParsedOpenAILLM
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from dataclass import Message, ChatRequest
import asyncio
from fastapi.responses import StreamingResponse


def initialize_rag_chain():
    vectorstore = OpenAIChromaVectorStore(collection_name="toru_v2")
    llm = OpenAILLMModel()
    #llm = ParsedOpenAILLM()
    retriever = vectorstore.as_retriever(filter_store = {"type" : "exercice"})
    contextualize_q_prompt, qa_prompt, classification_prompt = PromptManager.create_prompts()
    rag_chain = RAGChain(llm, retriever, contextualize_q_prompt, qa_prompt)

    return rag_chain

rag_chain = initialize_rag_chain()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

async def stream_rag_response(rag_chain, question):
    response = rag_chain.process_question(question)
    for word in response.split():
        yield f"{word} "
        await asyncio.sleep(0.05)  # Adjust this value to control the speed

@app.post("/api/chat")
async def process_chat(request: ChatRequest):
    try:
        async def stream_response():
            async for word in rag_chain.process_question(request.new_message):
                yield f"{word}"

        return StreamingResponse(stream_response(), media_type="text/plain")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
