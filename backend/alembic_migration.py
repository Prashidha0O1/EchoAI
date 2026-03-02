"""Run this to add new columns to existing database without dropping tables"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from database.database import engine, SessionLocal

def add_columns():
    """Add new columns to existing tables"""
    print("=" * 60)
    print("🔄 Database Migration Script")
    print("=" * 60)
    
    db = SessionLocal()
    
    migrations = [
        # Add email verification columns to users table
        ("users", "email_verified", "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE"),
        ("users", "verification_code", "ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6)"),
        ("users", "verification_code_created_at", "ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_created_at TIMESTAMP WITH TIME ZONE"),
        
        # Create resumes table
        ("resumes", "table", """
            CREATE TABLE IF NOT EXISTS resumes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(200) NOT NULL,
                template VARCHAR(50) DEFAULT 'modern',
                full_name VARCHAR(200),
                email_contact VARCHAR(254),
                phone_contact VARCHAR(20),
                location VARCHAR(200),
                linkedin_url VARCHAR(255),
                github_url VARCHAR(255),
                portfolio_url VARCHAR(255),
                summary TEXT,
                education JSON,
                experience JSON,
                skills JSON,
                projects JSON,
                certifications JSON,
                achievements JSON,
                is_primary BOOLEAN DEFAULT FALSE,
                pdf_url VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """),
    ]
    
    try:
        for table, column, sql in migrations:
            try:
                print(f"\n🔧 Migrating {table}.{column}...")
                db.execute(text(sql))
                db.commit()
                print(f"   ✅ Success")
            except Exception as e:
                print(f"   ⚠️  {e}")
                db.rollback()
        
        print("\n" + "=" * 60)
        print("✅ Migration Complete!")
        print("=" * 60)
        
        # Verify tables
        print("\n📊 Current Tables:")
        result = db.execute(text("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename
        """))
        for row in result:
            print(f"   - {row[0]}")
        
        print("\n📋 Users table structure:")
        result = db.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        """))
        for row in result:
            print(f"   - {row[0]:30} {row[1]:20} (nullable: {row[2]})")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = add_columns()
    sys.exit(0 if success else 1)
