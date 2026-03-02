-- Migration: Add email verification and resume builder features
-- Run this with: psql -U postgres -d echo_ai_db -f migrations/add_email_verification_and_resumes.sql
-- Or via pgAdmin query tool

-- ============================================
-- 1. Add Email Verification Columns to Users
-- ============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_created_at TIMESTAMP WITH TIME ZONE;

-- Set existing users as verified (optional - for development)
-- UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;

-- ============================================
-- 2. Create Resumes Table
-- ============================================

CREATE TABLE IF NOT EXISTS resumes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    template VARCHAR(50) DEFAULT 'modern',
    
    -- Personal Information
    full_name VARCHAR(200),
    email_contact VARCHAR(254),
    phone_contact VARCHAR(20),
    location VARCHAR(200),
    linkedin_url VARCHAR(255),
    github_url VARCHAR(255),
    portfolio_url VARCHAR(255),
    summary TEXT,
    
    -- Structured Data (JSON)
    education JSON,
    experience JSON,
    skills JSON,
    projects JSON,
    certifications JSON,
    achievements JSON,
    
    -- Metadata
    is_primary BOOLEAN DEFAULT FALSE,
    pdf_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_is_primary ON resumes(user_id, is_primary);

-- ============================================
-- 3. Verification
-- ============================================

-- Check columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name IN ('email_verified', 'verification_code', 'verification_code_created_at')
ORDER BY ordinal_position;

-- Check resumes table was created
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'resumes';

-- Show table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'resumes'
ORDER BY ordinal_position;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
\echo '✅ Migration completed successfully!'
\echo ''
\echo '📊 Summary:'
\echo '  - Added email_verified, verification_code columns to users'
\echo '  - Created resumes table with full schema'
\echo '  - Created indexes for performance'
\echo ''
\echo '🎉 Database is ready!'
