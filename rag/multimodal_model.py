import base64
import requests
import os
import json
import yaml
from openai import OpenAI
from dotenv import load_dotenv
# Load environment variables
load_dotenv("/etc/secrets/.env")
class MultimodalOpenAI:

    def __init__(self, model_name = "gpt-4o") -> None:

        self.model = model_name
        self.client = OpenAI()
        with open('rag/config/contextualize_prompts.yaml', 'r') as file:
            self.prompts = yaml.safe_load(file)
        self.system_message = self.prompts["system_messages"]["image_prompt"]

    def encode_image(self, image_bytes: bytes) -> str:
        return base64.b64encode(image_bytes).decode('utf-8')

    def step_explanation(self, image_bytes : bytes):

        base64_image = self.encode_image(image_bytes)

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.system_message},
                {"role": "user", "content": [
                    {"type": "image_url", "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_image}"}
                    }
                ]}
            ],
        )

        return response.choices[0].message.content
