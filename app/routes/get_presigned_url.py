from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import boto3
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv("etc/secrets/.env")

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter()
s3_client = boto3.client('s3', region_name='eu-west-3')
bucket_name = 'toruchat'

class UrlRequest(BaseModel):
    user_id: str
    message_id: str
    type: str

@router.post("/api/get_presigned_urls")
async def get_audio_urls(request: UrlRequest):
    try:
        # List objects in the S3 bucket with the given prefix
        prefix = f"{request.type}/{request.user_id}/{request.message_id}"
        response = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=prefix)

        # Generate presigned URLs for each object
        audio_urls = []
        for obj in response.get('Contents', []):
            url = s3_client.generate_presigned_url('get_object',
                                                   Params={'Bucket': bucket_name,
                                                           'Key': obj['Key']},
                                                   ExpiresIn=3600)  # URL expires in 1 hour
            audio_urls.append(url)

        if not audio_urls:
            logger.warning(f"No audio files found for user_id: {request.user_id}, message_id: {request.message_id}")
            return {"audioUrls": []}

        return {"audioUrls": audio_urls}

    except Exception as error:
        logger.error(f"Error generating audio URLs: {str(error)}")
        raise HTTPException(status_code=500, detail=str(error))
