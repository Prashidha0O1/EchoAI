"""Test complete authentication flow"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.database import SessionLocal
from database import models, crud, schemas, auth

def test_complete_auth_flow():
    """Test the complete auth flow from login to protected endpoint"""
    print("=" * 60)
    print("🔐 Complete Authentication Flow Test")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        # Step 1: Create or get test user
        print("\n1️⃣ Step 1: Get Test User")
        user = crud.get_user_by_email(db, "test@example.com")
        
        if not user:
            print("   Creating test user...")
            user_data = schemas.UserCreate(
                username="testuser",
                email="test@example.com",
                password="Test123!@#",
                first_name="Test",
                last_name="User"
            )
            user = crud.create_user(db, user_data)
            print(f"   ✅ User created: {user.email} (ID: {user.id})")
        else:
            print(f"   ✅ User exists: {user.email} (ID: {user.id})")
        
        # Step 2: Generate JWT token
        print("\n2️⃣ Step 2: Generate JWT Token")
        token = auth.create_access_token(
            data={"sub": user.email, "user_id": user.id}
        )
        print(f"   ✅ Token generated:")
        print(f"   {token[:50]}...{token[-20:]}")
        
        # Step 3: Validate token
        print("\n3️⃣ Step 3: Validate Token")
        decoded = auth.decode_token(token)
        if decoded:
            print(f"   ✅ Token is valid!")
            print(f"      Email: {decoded.email}")
            print(f"      User ID: {decoded.user_id}")
        else:
            print("   ❌ Token validation failed!")
            return False
        
        # Step 4: Simulate get_current_user dependency
        print("\n4️⃣ Step 4: Simulate Protected Route")
        print("   Simulating: async def get_current_user(token: str = Depends(oauth2_scheme))")
        
        # This is what happens in the dependency
        token_data = auth.decode_token(token)
        if not token_data:
            print("   ❌ Token decode failed in dependency")
            return False
        
        fetched_user = db.query(models.User).filter(models.User.email == token_data.email).first()
        if not fetched_user:
            print("   ❌ User not found from token")
            return False
        
        print(f"   ✅ User authenticated: {fetched_user.username}")
        print(f"      ID: {fetched_user.id}")
        print(f"      Active: {fetched_user.is_active}")
        
        # Step 5: Test interview creation
        print("\n5️⃣ Step 5: Test Interview Creation")
        interview_data = schemas.InterviewCreate(
            interview_type="mixed",
            job_description="Test job description for Full Stack Developer"
        )
        
        interview = crud.create_interview(db, user_id=fetched_user.id, interview=interview_data)
        print(f"   ✅ Interview created!")
        print(f"      ID: {interview.id}")
        print(f"      Type: {interview.interview_type}")
        print(f"      Status: {interview.status}")
        
        # Success!
        print("\n" + "=" * 60)
        print("✅ Complete Auth Flow Working!")
        print("=" * 60)
        print("\n📋 Summary:")
        print(f"   User ID: {user.id}")
        print(f"   Interview ID: {interview.id}")
        print(f"   Token: Valid ✅")
        print()
        print("🌐 Test this token in Swagger UI:")
        print("   1. Go to: http://localhost:8000/docs")
        print("   2. Click 'Authorize' button")
        print("   3. Enter: Bearer " + token)
        print("   4. Try POST /interviews")
        print()
        print("📝 Or use curl:")
        print(f'   curl -X POST http://localhost:8000/interviews \\')
        print(f'     -H "Authorization: Bearer {token}" \\')
        print(f'     -H "Content-Type: application/json" \\')
        print(f'     -d \'{{"interview_type": "mixed", "job_description": "Test"}}\'')
        print()
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = test_complete_auth_flow()
    sys.exit(0 if success else 1)
