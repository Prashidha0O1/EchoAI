import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import models, crud, schemas

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("No DATABASE_URL")
    sys.exit(1)

try:
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    # Try to create a random user to test schema
    import random
    suffix = random.randint(1000, 9999)
    user_in = schemas.UserCreate(
        username=f"debug_user_{suffix}",
        email=f"debug_{suffix}@example.com",
        password="password123",
        first_name="Debug",
        last_name="User"
    )
    
    print(f"Attempting to create user: {user_in.username}")
    user = crud.create_user(db, user_in)
    print(f"User created successfully! ID: {user.id}")
    
    # Clean up
    # db.delete(user)
    # db.commit()
    
    db.close()
except Exception as e:
    print("ERROR Creating User:")
    print(e)
    import traceback
    traceback.print_exc()
