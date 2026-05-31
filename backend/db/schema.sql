-- Engrow Database Schema
-- Run this on your Render PostgreSQL database

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verify_token VARCHAR(255),
  email_verify_expires TIMESTAMPTZ,
  reset_password_token VARCHAR(255),
  reset_password_expires TIMESTAMPTZ,
  dyslexia_font BOOLEAN DEFAULT FALSE,
  high_contrast BOOLEAN DEFAULT FALSE,
  simplified_first BOOLEAN DEFAULT FALSE,
  font_size VARCHAR(10) DEFAULT '100',
  daily_reminder BOOLEAN DEFAULT FALSE,
  reminder_time VARCHAR(10) DEFAULT '09:00',
  weekly_goal INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skill levels for each user (one row per user per skill)
CREATE TABLE IF NOT EXISTS user_skill_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill VARCHAR(50) NOT NULL, -- grammar, vocabulary, reading, writing, dialogue
  cefr_level VARCHAR(5) NOT NULL DEFAULT 'A1', -- A1, A2, B1, B2, C1, C2
  cefr_sublevel VARCHAR(10) DEFAULT 'low', -- low, mid, high
  xp INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill)
);

-- Placement test sessions
CREATE TABLE IF NOT EXISTS placement_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed
  current_skill VARCHAR(50) DEFAULT 'grammar',
  current_question INTEGER DEFAULT 0,
  answers JSONB DEFAULT '[]',
  results JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  retake_eligible_at TIMESTAMPTZ
);

-- Lessons master table
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill VARCHAR(50) NOT NULL,
  level_from VARCHAR(5) NOT NULL, -- A1, A2, B1, B2, C1
  lesson_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  topic VARCHAR(255) NOT NULL,
  estimated_minutes INTEGER DEFAULT 7,
  content JSONB NOT NULL, -- explanation, simple_explanation, exercises
  UNIQUE(skill, level_from, lesson_number)
);

-- User lesson progress
CREATE TABLE IF NOT EXISTS user_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'locked', -- locked, available, in_progress, completed
  score INTEGER DEFAULT 0,
  mistakes JSONB DEFAULT '[]',
  completed_at TIMESTAMPTZ,
  last_attempted_at TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id)
);

-- Spaced repetition review queue
CREATE TABLE IF NOT EXISTS review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  question_data JSONB NOT NULL,
  next_review_at TIMESTAMPTZ NOT NULL,
  interval_days INTEGER DEFAULT 1,
  ease_factor FLOAT DEFAULT 2.5,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Streaks
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_study_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study sessions (for progress tracking)
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id),
  skill VARCHAR(50),
  duration_seconds INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  studied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Milestones
CREATE TABLE IF NOT EXISTS user_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_type VARCHAR(100) NOT NULL,
  milestone_data JSONB DEFAULT '{}',
  achieved_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_skill_levels_user ON user_skill_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lessons_user ON user_lessons(user_id);
CREATE INDEX IF NOT EXISTS idx_review_queue_user_next ON review_queue(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_skill_level ON lessons(skill, level_from);
