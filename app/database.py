import logging
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
from app.config import settings
import time
import socket

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base = declarative_base()

def create_engine_with_retry(db_url, max_retries=3, retry_interval=5):
    for attempt in range(max_retries):
        try:
            logger.info(f"Attempting to connect to database (attempt {attempt + 1}/{max_retries})")
            logger.info(f"Database URL: {db_url}")  # Log the URL (make sure to mask any sensitive information)

            # Parse the URL to get host and port
            from urllib.parse import urlparse
            parsed_url = urlparse(db_url)
            host = parsed_url.hostname
            port = parsed_url.port or 5432  # Default PostgreSQL port

            # Try to establish a TCP connection first
            with socket.create_connection((host, port), timeout=10) as sock:
                logger.info(f"TCP connection to {host}:{port} successful")

            engine = create_engine(db_url, pool_pre_ping=True, pool_recycle=300, connect_args={'connect_timeout': 10})

            # Test the connection
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            logger.info("Successfully connected to the database")
            return engine
        except (OperationalError, socket.error) as e:
            logger.error(f"Database connection attempt {attempt + 1} failed: {str(e)}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_interval} seconds...")
                time.sleep(retry_interval)
            else:
                logger.error(f"Failed to connect to the database after {max_retries} attempts.")
                raise e

engine = create_engine_with_retry(settings.POSTGRES_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    try:
        logger.info("Attempting to create tables")
        Base.metadata.create_all(bind=engine)
        logger.info("Tables created successfully")
    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        raise

# def check_table_exists(table_name):
#     try:
#         with engine.connect() as connection:
#             result = connection.execute(text(f"""
#                 SELECT EXISTS (
#                     SELECT FROM information_schema.tables
#                     WHERE table_name = '{table_name}'
#                 );
#             """))
#             exists = result.scalar()
#             if exists:
#                 logger.info(f"Table '{table_name}' exists.")
#             else:
#                 logger.info(f"Table '{table_name}' does not exist.")
#     except Exception as e:
#         logger.error(f"Error checking table: {e}")
