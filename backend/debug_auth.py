"""Debug authentication issues - Test JWT token validation"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import auth
from datetime import timedelta

def test_token_creation():
    """Test creating a JWT token"""
    print("=" * 60)
    print("🔐 Testing JWT Token Creation & Validation")
    print("=" * 60)
    
    # Create a test token
    test_data = {
        "sub": "test@example.com",
        "user_id": 1
    }
    
    print("\n📝 Creating token with data:")
    print(f"   Email: {test_data['sub']}")
    print(f"   User ID: {test_data['user_id']}")
    
    token = auth.create_access_token(data=test_data)
    print(f"\n🎫 Generated Token:")
    print(f"   {token}")
    print(f"   Length: {len(token)} characters")
    
    # Decode the token
    print("\n🔍 Decoding token...")
    decoded = auth.decode_token(token)
    
    if decoded:
        print("✅ Token decoded successfully!")
        print(f"   Email: {decoded.email}")
        print(f"   User ID: {decoded.user_id}")
    else:
        print("❌ Failed to decode token")
        return False
    
    # Test with Bearer prefix
    print("\n🔍 Testing with 'Bearer' prefix...")
    bearer_token = f"Bearer {token}"
    print(f"   Full header value: {bearer_token[:50]}...")
    
    # Extract token from Bearer string
    token_only = bearer_token.split(" ")[1] if " " in bearer_token else bearer_token
    decoded2 = auth.decode_token(token_only)
    
    if decoded2:
        print("✅ Token with Bearer prefix works!")
    else:
        print("❌ Token with Bearer prefix failed")
    
    return True

def test_secret_key():
    """Check if SECRET_KEY is properly loaded"""
    print("\n" + "=" * 60)
    print("🔑 Checking SECRET_KEY Configuration")
    print("=" * 60)
    
    print(f"\n📋 Current Configuration:")
    print(f"   SECRET_KEY: {auth.SECRET_KEY[:20]}...{auth.SECRET_KEY[-10:]}")
    print(f"   ALGORITHM: {auth.ALGORITHM}")
    print(f"   TOKEN_EXPIRE: {auth.ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
    
    # Check if using default key
    if auth.SECRET_KEY == "your-super-secret-key-change-in-production":
        print("\n⚠️  WARNING: Using default SECRET_KEY!")
        print("   This is OK for development, but change for production")
    else:
        print("\n✅ Using custom SECRET_KEY")

def main():
    print("\n🧪 EchoAI Authentication Debug Tool\n")
    
    # Test 1: Secret key config
    test_secret_key()
    
    # Test 2: Token creation and validation
    if test_token_creation():
        print("\n" + "=" * 60)
        print("✅ All authentication tests passed!")
        print("=" * 60)
        print("\n📝 Next Steps:")
        print("  1. Copy the generated token above")
        print("  2. Test in Swagger UI: http://localhost:8000/docs")
        print("  3. Click 'Authorize' and paste token")
        print("  4. Try creating an interview")
        print()
    else:
        print("\n" + "=" * 60)
        print("❌ Authentication tests failed!")
        print("=" * 60)

if __name__ == "__main__":
    main()
