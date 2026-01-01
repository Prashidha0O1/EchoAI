import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add current dir to path to find local modules if needed
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"DEBUG: DATABASE_URL loaded: {'Yes' if DATABASE_URL else 'No'}")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL is not set in environment or .env file.")
    sys.exit(1)

try:
    print(f"Connecting to database...")
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    print("Executing SELECT 1...")
    result = db.execute(text("SELECT 1")).fetchone()
    print(f"Success! Result: {result}")
    
    db.close()
except Exception as e:
    print("ERROR Connecting to Database:")
    print(e)
    import traceback
    traceback.print_exc()
