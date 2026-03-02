"""Database initialization script - Creates all tables"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.database import engine, Base
from database import models
from sqlalchemy import inspect, text

def check_database_connection():
    """Check if database is reachable"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Database connection successful")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def list_existing_tables():
    """List all existing tables"""
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    if tables:
        print(f"\n📋 Existing tables: {', '.join(tables)}")
    else:
        print("\n📋 No existing tables found")
    return tables

def create_all_tables():
    """Create all database tables"""
    try:
        print("\n🔨 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to create tables: {e}")
        return False

def verify_tables():
    """Verify all required tables exist"""
    required_tables = ['users', 'user_profiles', 'interviews', 'messages', 'reports', 'report_tags']
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    print("\n🔍 Verifying tables:")
    all_exist = True
    for table in required_tables:
        if table in existing_tables:
            print(f"  ✅ {table}")
        else:
            print(f"  ❌ {table} - MISSING")
            all_exist = False
    
    return all_exist

def show_table_structure(table_name):
    """Show columns of a specific table"""
    inspector = inspect(engine)
    try:
        columns = inspector.get_columns(table_name)
        print(f"\n📊 Table structure for '{table_name}':")
        for col in columns:
            print(f"  - {col['name']}: {col['type']}")
    except Exception as e:
        print(f"❌ Could not inspect table {table_name}: {e}")

def main():
    """Main initialization function"""
    print("=" * 60)
    print("🚀 EchoAI Database Initialization")
    print("=" * 60)
    
    # Step 1: Check connection
    if not check_database_connection():
        print("\n⚠️  Please ensure Docker services are running:")
        print("   docker-compose up -d")
        sys.exit(1)
    
    # Step 2: List existing tables
    existing_tables = list_existing_tables()
    
    # Step 3: Create tables
    if not create_all_tables():
        sys.exit(1)
    
    # Step 4: Verify all tables
    if not verify_tables():
        print("\n❌ Some tables are missing!")
        sys.exit(1)
    
    # Step 5: Show key table structures
    show_table_structure('users')
    show_table_structure('interviews')
    show_table_structure('messages')
    
    print("\n" + "=" * 60)
    print("✅ Database initialization complete!")
    print("=" * 60)
    print("\n📝 Next steps:")
    print("  1. Start backend: uvicorn main:app --reload")
    print("  2. Start frontend: cd frontend && npm run dev")
    print("  3. Register a user at http://localhost:3000/signup")
    print("  4. Create an interview via API or frontend")
    print()

if __name__ == "__main__":
    main()
