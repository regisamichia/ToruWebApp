from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from multimodal_model import MultimodalOpenAI


app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/multimodal")
async def image_comprehension(image: UploadFile = File(...)):
    print("Received image comprehension request")
    multimodal = MultimodalOpenAI()
    try:

        contents = await image.read()

        response = multimodal.extract_explanation(contents)

        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
