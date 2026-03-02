"""Complete system test - Verify all features are working"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.database import SessionLocal
from database import models, crud, schemas, auth
from app.services.email_service import EmailService

def print_section(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def test_database_connection():
    """Test database connection"""
    print_section("1. Database Connection")
    try:
        db = SessionLocal()
        result = db.execute("SELECT version();")
        version = result.fetchone()[0]
        print(f"✅ PostgreSQL connected: {version[:50]}...")
        db.close()
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def test_email_verification_schema():
    """Test email verification columns exist"""
    print_section("2. Email Verification Schema")
    db = SessionLocal()
    try:
        # Create test user
        test_user = db.query(models.User).filter(models.User.email == "systest@test.com").first()
        
        if not test_user:
            print("Creating test user...")
            user_data = schemas.UserCreate(
                username="systest",
                email="systest@test.com",
                password="Test123!",
                first_name="System",
                last_name="Test"
            )
            test_user = crud.create_user(db, user_data)
        
        # Check new columns
        print(f"✅ User ID: {test_user.id}")
        print(f"✅ Email: {test_user.email}")
        print(f"✅ email_verified column exists: {hasattr(test_user, 'email_verified')}")
        print(f"   Current value: {test_user.email_verified}")
        print(f"✅ verification_code column exists: {hasattr(test_user, 'verification_code')}")
        print(f"   Current value: {test_user.verification_code or 'None'}")
        
        # Test code generation
        code = EmailService.generate_verification_code()
        print(f"✅ Code generation works: {code}")
        
        # Test setting code
        crud.set_verification_code(db, test_user.id, code)
        db.refresh(test_user)
        print(f"✅ Code saved to database: {test_user.verification_code}")
        
        # Test verification
        crud.set_email_verified(db, test_user.id, True)
        db.refresh(test_user)
        print(f"✅ Email verification works: {test_user.email_verified}")
        
        return True
        
    except Exception as e:
        print(f"❌ Email verification schema error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def test_resume_schema():
    """Test resume table exists and works"""
    print_section("3. Resume Builder Schema")
    db = SessionLocal()
    try:
        # Get test user
        test_user = db.query(models.User).filter(models.User.email == "systest@test.com").first()
        
        if not test_user:
            print("❌ Test user not found. Run test 2 first.")
            return False
        
        # Check Resume model exists
        print(f"✅ Resume model imported: {models.Resume is not None}")
        
        # Test creating resume
        resume_data = schemas.ResumeCreate(
            title="Test Resume",
            template="modern",
            full_name="System Test",
            email_contact="systest@test.com",
            phone_contact="+1 555-0123",
            summary="Test summary",
            education=[
                schemas.ResumeEducation(
                    institution="Test University",
                    degree="Bachelor",
                    field="Computer Science",
                    start_date="2020-01",
                    end_date="2024-05"
                )
            ],
            skills=schemas.ResumeSkills(
                technical=["Python", "FastAPI", "React"],
                tools=["Git", "Docker"]
            ),
            is_primary=True
        )
        
        resume = crud.create_resume(db, user_id=test_user.id, resume=resume_data)
        print(f"✅ Resume created: ID {resume.id}")
        print(f"   Title: {resume.title}")
        print(f"   Template: {resume.template}")
        print(f"   Is Primary: {resume.is_primary}")
        print(f"   Education entries: {len(resume.education) if resume.education else 0}")
        print(f"   Skills categories: {len(resume.skills.keys()) if resume.skills else 0}")
        
        # Test retrieval
        resumes = crud.get_user_resumes(db, test_user.id)
        print(f"✅ Can retrieve resumes: {len(resumes)} found")
        
        primary = crud.get_primary_resume(db, test_user.id)
        print(f"✅ Can get primary resume: {primary.title if primary else 'None'}")
        
        return True
        
    except Exception as e:
        print(f"❌ Resume schema error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def test_interview_creation():
    """Test interview creation"""
    print_section("4. Interview System")
    db = SessionLocal()
    try:
        test_user = db.query(models.User).filter(models.User.email == "systest@test.com").first()
        
        if not test_user:
            print("❌ Test user not found")
            return False
        
        # Create interview
        interview_data = schemas.InterviewCreate(
            interview_type="mixed",
            job_description="Test job description for Full Stack Developer"
        )
        
        interview = crud.create_interview(db, user_id=test_user.id, interview=interview_data)
        print(f"✅ Interview created: ID {interview.id}")
        print(f"   Type: {interview.interview_type}")
        print(f"   Status: {interview.status}")
        print(f"   User ID: {interview.user_id}")
        
        # Start interview
        started = crud.start_interview(db, interview.id)
        print(f"✅ Interview started: Status = {started.status}")
        
        # Complete interview
        completed = crud.complete_interview(db, interview.id, "Test transcript")
        print(f"✅ Interview completed: Status = {completed.status}")
        
        return True
        
    except Exception as e:
        print(f"❌ Interview system error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def test_email_service():
    """Test email service configuration"""
    print_section("5. Email Service")
    try:
        from app.services.email_service import SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_FROM_NAME
        
        print(f"✅ Email service imported")
        print(f"   SMTP Host: {SMTP_HOST}")
        print(f"   SMTP Port: {SMTP_PORT}")
        print(f"   Username: {SMTP_USERNAME or '❌ NOT CONFIGURED'}")
        print(f"   From Name: {SMTP_FROM_NAME}")
        
        if not SMTP_USERNAME or SMTP_USERNAME == "your_gmail@gmail.com":
            print("\n⚠️  Gmail SMTP not configured!")
            print("   For email verification, configure in backend/.env:")
            print("   SMTP_USERNAME=youremail@gmail.com")
            print("   SMTP_PASSWORD=your_app_password")
            print("\n   OR use debug endpoint: GET /verification/debug/code")
            return False
        
        print("✅ SMTP configured (not testing actual send)")
        return True
        
    except Exception as e:
        print(f"❌ Email service error: {e}")
        return False

def test_jwt_auth():
    """Test JWT token generation and validation"""
    print_section("6. JWT Authentication")
    try:
        # Create token
        token = auth.create_access_token(data={"sub": "test@example.com", "user_id": 1})
        print(f"✅ Token generated: {token[:30]}...{token[-20:]}")
        
        # Decode token
        decoded = auth.decode_token(token)
        print(f"✅ Token decoded successfully")
        print(f"   Email: {decoded.email}")
        print(f"   User ID: {decoded.user_id}")
        
        return True
        
    except Exception as e:
        print(f"❌ JWT auth error: {e}")
        return False

def test_models_imported():
    """Test all models can be imported"""
    print_section("7. Models & Services")
    try:
        from database.models import User, UserProfile, Interview, Message, Report, Resume
        print("✅ All database models imported:")
        print("   - User")
        print("   - UserProfile")
        print("   - Interview")
        print("   - Message")
        print("   - Report")
        print("   - Resume")
        
        from app.services import EmailService, ResumeService, DocumentParser, SimpleLLMService, TranscriptService
        print("✅ All services imported:")
        print("   - EmailService")
        print("   - ResumeService")
        print("   - DocumentParser")
        print("   - SimpleLLMService")
        print("   - TranscriptService")
        
        return True
        
    except Exception as e:
        print(f"❌ Import error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("\n" + "🧪 EchoAI System Test Suite")
    print("Testing all implemented features...\n")
    
    results = {
        "Database Connection": test_database_connection(),
        "Email Verification": test_email_verification_schema(),
        "Resume Builder": test_resume_schema(),
        "Interview System": test_interview_creation(),
        "Email Service": test_email_service(),
        "JWT Authentication": test_jwt_auth(),
        "Models & Services": test_models_imported(),
    }
    
    print_section("Test Results Summary")
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status:10} {test_name}")
    
    print("\n" + "-" * 70)
    print(f"  {passed}/{total} tests passed")
    print("-" * 70)
    
    if passed == total:
        print("\n🎉 All systems operational!")
        print("\n📝 Next Steps:")
        print("  1. Configure Gmail SMTP (if not done)")
        print("  2. Start backend: uvicorn main:app --reload")
        print("  3. Start frontend: npm run dev")
        print("  4. Test at: http://localhost:3000")
        print()
    else:
        print("\n⚠️  Some tests failed. Please fix before proceeding.")
        print("\n📖 See documentation:")
        print("  - COMPLETE_SETUP_GUIDE.md")
        print("  - RUN_MIGRATION.md")
        print()
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
