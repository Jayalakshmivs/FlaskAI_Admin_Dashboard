import uuid
from sqlmodel import Session, create_engine, select
from app.crud import get_file_details
from app.models import File
import os

DATABASE_URL = "postgresql://postgres:postgres@db:5432/flaskai"
engine = create_engine(DATABASE_URL)

file_id = "095fd09d-99ac-459d-a232-1c5242d5a2e9" # The PPTX file with 25 steps

with Session(engine) as session:
    details = get_file_details(session, file_id)
    print(f"Details found: {len(details)}")
    for i, step in enumerate(details):
        print(f"Step {i+1}: {step['step_name']} - {step['status']}")
