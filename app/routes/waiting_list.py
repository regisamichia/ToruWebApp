from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.waiting_list import WaitingListEntry, WaitingListResponse
from app.models.user import WaitingList
from sqlalchemy.exc import IntegrityError

router = APIRouter()

@router.post("/api/waiting-list", response_model=WaitingListResponse)
async def add_to_waiting_list(entry: WaitingListEntry, db: Session = Depends(get_db)):
    new_entry = WaitingList(
        first_name=entry.name,
        email=entry.email,
        school_class=entry.school_class,
        sourcing=entry.sourcing
    )

    try:
        db.add(new_entry)
        db.commit()
        db.refresh(new_entry)
        return {"message": "Successfully added to the waiting list"}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already exists in the waiting list")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
