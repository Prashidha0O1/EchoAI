# 🔄 Database Migration Guide

## Quick Migration (3 Options)

### Option 1: Docker PostgreSQL (Recommended if using Docker)

```bash
# Copy SQL file into container
docker cp backend/migrations/add_email_verification_and_resumes.sql echoai-db:/tmp/migration.sql

# Execute migration
docker exec -it echoai-db psql -U postgres -d echo_ai_db -f /tmp/migration.sql
```

### Option 2: Local PostgreSQL

```bash
# Navigate to backend
cd backend

# Run migration
psql -U postgres -d echo_ai_db -f migrations/add_email_verification_and_resumes.sql

# Enter password when prompted
```

### Option 3: Python Script

```bash
cd backend
python alembic_migration.py
```

---

## ✅ Verify Migration Worked

### Check in PostgreSQL:

```sql
-- Connect to database
psql -U postgres -d echo_ai_db

-- Check users table has new columns
\d users

-- Should show:
-- email_verified | boolean
-- verification_code | character varying(6)
-- verification_code_created_at | timestamp with time zone

-- Check resumes table exists
\dt resumes

-- Check resumes table structure
\d resumes

-- Exit
\q
```

### Check via Python:

```bash
cd backend
python -c "
from database.database import SessionLocal
from database.models import User, Resume
from sqlalchemy import inspect

db = SessionLocal()

# Check User model
inspector = inspect(db.bind)
user_columns = [c['name'] for c in inspector.get_columns('users')]
print('Users columns:', user_columns)
print('email_verified exists?', 'email_verified' in user_columns)

# Check Resume table
resume_tables = inspector.get_table_names()
print('Resumes table exists?', 'resumes' in resume_tables)

db.close()
print('✅ Migration verified!')
"
```

---

## 🐛 If Migration Fails

### Error: "relation already exists"
**Meaning:** Table already created
**Solution:** Already migrated, you're good!

### Error: "column already exists"
**Meaning:** Columns already added
**Solution:** Already migrated, you're good!

### Error: "database does not exist"
**Meaning:** Database not created yet
**Solution:**
```bash
# Create database first
psql -U postgres -c "CREATE DATABASE echo_ai_db;"

# Then run migration
psql -U postgres -d echo_ai_db -f backend/migrations/add_email_verification_and_resumes.sql
```

### Error: "could not connect to server"
**Meaning:** PostgreSQL not running
**Solution:**
```bash
# If using Docker:
docker-compose up -d postgres

# If local PostgreSQL:
# Windows:
net start postgresql-x64-14  # Or your version

# macOS:
brew services start postgresql

# Linux:
sudo systemctl start postgresql
```

---

## 🔍 Manual Migration (Step by Step)

If automated migration doesn't work, run SQL commands manually:

### Step 1: Connect to Database
```bash
psql -U postgres -d echo_ai_db
```

### Step 2: Add Email Verification Columns
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_created_at TIMESTAMP WITH TIME ZONE;
```

### Step 3: Create Resumes Table
```sql
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
);
```

### Step 4: Create Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_is_primary ON resumes(user_id, is_primary);
```

### Step 5: Verify
```sql
-- Check users table
\d users

-- Check resumes table
\d resumes

-- Check all tables
\dt

-- Exit
\q
```

---

## ✨ After Migration

Restart your backend to load the new models:

```bash
cd backend

# Stop backend (Ctrl+C if running)

# Restart
uvicorn main:app --reload
```

Check logs for:
```
INFO: Uvicorn running on http://127.0.0.1:8000
INFO: Application startup complete
```

Test at: http://localhost:8000/docs

Should see new endpoints:
- `/verification/*`
- `/resumes/*`

---

## 🎯 Quick Test

```bash
# Test database connection
cd backend
python -c "
from database.database import SessionLocal
from database.models import User, Resume

db = SessionLocal()
print('✅ Database connected')

# Check if migration worked
user = db.query(User).first()
if user:
    print(f'email_verified column exists: {hasattr(user, \"email_verified\")}')
    print(f'Current value: {user.email_verified if hasattr(user, \"email_verified\") else \"N/A\"}')

# Check Resume model
print(f'Resume model imported: {Resume is not None}')

db.close()
"
```

Expected output:
```
✅ Database connected
email_verified column exists: True
Current value: False
Resume model imported: True
```

---

All set! 🚀
