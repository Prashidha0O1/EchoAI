"""Test script for interview creation - Debug 404 error"""
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.database import SessionLocal, engine
from database import models, crud, schemas, auth
from sqlalchemy import inspect

def test_database_setup():
    """Test database connection and tables"""
    print("=" * 60)
    print("🔍 Testing Database Setup")
    print("=" * 60)
    
    # Check tables exist
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    required = ['users', 'user_profiles', 'interviews', 'messages']
    print("\n📊 Table Status:")
    for table in required:
        status = "✅" if table in tables else "❌"
        print(f"  {status} {table}")
    
    return all(table in tables for table in required)

def create_test_user(db):
    """Create a test user if not exists"""
    print("\n👤 Creating Test User...")
    
    # Check if user exists
    existing_user = crud.get_user_by_email(db, "test@example.com")
    if existing_user:
        print(f"  ℹ️  User already exists: {existing_user.email} (ID: {existing_user.id})")
        return existing_user
    
    # Create new user
    user_data = schemas.UserCreate(
        username="testuser",
        email="test@example.com",
        password="Test123!@#",
        first_name="Test",
        last_name="User"
    )
    
    try:
        new_user = crud.create_user(db, user_data)
        print(f"  ✅ User created: {new_user.email} (ID: {new_user.id})")
        return new_user
    except Exception as e:
        print(f"  ❌ Failed to create user: {e}")
        return None

def test_interview_creation(db, user):
    """Test creating an interview"""
    print("\n🎤 Testing Interview Creation...")
    
    interview_data = schemas.InterviewCreate(
        interview_type="mixed",
        job_description="We are looking for a Full Stack Developer with experience in React, Node.js, and PostgreSQL."
    )
    
    try:
        interview = crud.create_interview(db, user_id=user.id, interview=interview_data)
        print(f"  ✅ Interview created successfully!")
        print(f"     ID: {interview.id}")
        print(f"     Type: {interview.interview_type}")
        print(f"     Status: {interview.status}")
        print(f"     User ID: {interview.user_id}")
        return interview
    except Exception as e:
        print(f"  ❌ Failed to create interview: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_interview_retrieval(db, interview_id):
    """Test retrieving an interview"""
    print(f"\n📖 Testing Interview Retrieval (ID: {interview_id})...")
    
    try:
        interview = crud.get_interview(db, interview_id)
        if interview:
            print(f"  ✅ Interview retrieved successfully!")
            print(f"     ID: {interview.id}")
            print(f"     Type: {interview.interview_type}")
            print(f"     Status: {interview.status}")
            print(f"     JD: {interview.job_description[:50]}...")
            return interview
        else:
            print(f"  ❌ Interview not found")
            return None
    except Exception as e:
        print(f"  ❌ Failed to retrieve interview: {e}")
        return None

def test_interview_start(db, interview_id, user_id):
    """Test starting an interview"""
    print(f"\n▶️  Testing Interview Start (ID: {interview_id})...")
    
    from datetime import datetime, timezone
    
    try:
        interview = crud.update_interview_status(
            db,
            interview_id=interview_id,
            status="in_progress",
            started_at=datetime.now(timezone.utc)
        )
        if interview:
            print(f"  ✅ Interview started successfully!")
            print(f"     Status: {interview.status}")
            print(f"     Started at: {interview.started_at}")
            return interview
        else:
            print(f"  ❌ Interview not found")
            return None
    except Exception as e:
        print(f"  ❌ Failed to start interview: {e}")
        return None

def test_user_interviews_list(db, user_id):
    """Test listing user's interviews"""
    print(f"\n📋 Testing User Interviews List (User ID: {user_id})...")
    
    try:
        interviews = crud.get_user_interviews(db, user_id)
        print(f"  ✅ Found {len(interviews)} interview(s)")
        for i, interview in enumerate(interviews, 1):
            print(f"     {i}. ID: {interview.id}, Type: {interview.interview_type}, Status: {interview.status}")
        return interviews
    except Exception as e:
        print(f"  ❌ Failed to list interviews: {e}")
        return []

def cleanup_test_data(db, user_email="test@example.com"):
    """Optional: Clean up test data"""
    print("\n🧹 Cleanup (optional)...")
    response = input("  Do you want to delete test data? (y/n): ")
    
    if response.lower() == 'y':
        user = crud.get_user_by_email(db, user_email)
        if user:
            # Delete user (cascade will delete profile and interviews)
            db.delete(user)
            db.commit()
            print(f"  ✅ Test user and related data deleted")
        else:
            print(f"  ℹ️  No test user found to delete")

def main():
    """Main test function"""
    print("\n" + "=" * 60)
    print("🧪 EchoAI Interview Creation Test Suite")
    print("=" * 60)
    
    # Test 1: Database setup
    if not test_database_setup():
        print("\n❌ Database setup incomplete. Run init_db.py first:")
        print("   python backend/init_db.py")
        return
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Test 2: Create test user
        user = create_test_user(db)
        if not user:
            print("\n❌ Cannot proceed without a user")
            return
        
        # Test 3: Create interview
        interview = test_interview_creation(db, user)
        if not interview:
            print("\n❌ Interview creation failed")
            return
        
        # Test 4: Retrieve interview
        retrieved = test_interview_retrieval(db, interview.id)
        if not retrieved:
            print("\n❌ Interview retrieval failed")
            return
        
        # Test 5: List user's interviews
        interviews = test_user_interviews_list(db, user.id)
        
        # Test 6: Start interview
        started = test_interview_start(db, interview.id, user.id)
        
        # Summary
        print("\n" + "=" * 60)
        print("✅ All Tests Passed!")
        print("=" * 60)
        print("\n📊 Summary:")
        print(f"  - Test User ID: {user.id}")
        print(f"  - Test Interview ID: {interview.id}")
        print(f"  - Interview Status: {started.status if started else 'pending'}")
        print()
        print("📝 API Endpoints to test:")
        print(f"  POST   /interviews")
        print(f"  GET    /interviews")
        print(f"  GET    /interviews/{interview.id}")
        print(f"  POST   /interviews/{interview.id}/start")
        print(f"  POST   /interviews/{interview.id}/end")
        print()
        print("🌐 Test in browser:")
        print(f"  http://localhost:8000/docs")
        print()
        
        # Optional cleanup
        # cleanup_test_data(db)
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
