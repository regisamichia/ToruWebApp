import base64
import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
class MultimodalOpenAI:

    def __init__(self, model_name = "gpt-4o-mini") -> None:

        self.model = model_name

    def encode_image(self, image_bytes: bytes) -> str:
        return base64.b64encode(image_bytes).decode('utf-8')

    def extract_explanation(self, image_bytes: bytes):

        base64_image = self.encode_image(image_bytes)

        headers = {
          "Content-Type": "application/json",
          "Authorization": f"Bearer {os.environ["OPENAI_API_KEY"]}"
        }

        payload = {
          "model": self.model,
          "messages": [
            {
              "role": "user",
              "content": [
                {
                  "type": "text",
                  "text": """You are an helpful AI assistant, helping secondary school student to resolve math problems in French.
                            You will be encouraging and factual.
                            Tu dois l'aider à résoudre l'exercice mais sans lui donner la réponse, juste en lui donnant des indications. """
                },
                {
                  "type": "image_url",
                  "image_url": {
                    "url": f"data:image/jpeg;base64,{base64_image}"
                  }
                }
              ]
            }
          ],
          "max_tokens": 300
        }

        response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
        print("multimodal 3")
        return response.json()["choices"][0]["message"]["content"]
