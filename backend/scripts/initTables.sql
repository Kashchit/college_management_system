-- Enable required extensions for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;           -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";        -- alternative uuid_generate_v4()

-- Face Recognition Attendance System - Database Initialization
-- Run this in Neon SQL Editor or psql to create all required tables

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  embedding REAL[] NOT NULL,
  enrolled_at TIMESTAMP DEFAULT NOW()
);

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) DEFAULT 'General',
  timestamp TIMESTAMP DEFAULT NOW(),
  confidence REAL NOT NULL
);

-- Create users table for signup/login
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  student_id VARCHAR(255),
  role VARCHAR(16) NOT NULL DEFAULT 'STUDENT', -- STUDENT | TEACHER | ADMIN
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Subjects and enrollments
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64) UNIQUE NOT NULL,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subject_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  UNIQUE(subject_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
CREATE INDEX IF NOT EXISTS idx_enroll_subject ON subject_enrollments(subject_id);
CREATE INDEX IF NOT EXISTS idx_enroll_user ON subject_enrollments(user_id);

-- Insert default admin account
-- Password: admin123 (hashed with bcrypt, 10 rounds)
-- You can regenerate this hash at: https://bcrypt-generator.com/
INSERT INTO admins (email, password) 
VALUES ('admin@college.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
ON CONFLICT (email) DO UPDATE
SET password = EXCLUDED.password;

-- Verify tables were created
SELECT 'Tables created successfully!' as status;
SELECT COUNT(*) as admin_count FROM admins;
