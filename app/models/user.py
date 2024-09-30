from sqlalchemy import Column, Integer, String
from app.database import Base
import uuid

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    first_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    school_class = Column(String)

class WaitingList(Base):
    __tablename__ = "waiting_list"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    first_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    school_class = Column(String)
    sourcing = Column(String)
