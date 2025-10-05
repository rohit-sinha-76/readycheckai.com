-- ==========================================
-- PART 1: CORE SCHEMA & BASE SYSTEMS
-- ==========================================
-- This file contains the foundational tables, including:
-- - Users & Certification levels
-- - Question Bank (Dual Schema)
-- - Assessment Engine (Sessions, Responses)
-- - User Profiles & Analytics
-- ==========================================

-- ------------------------------------------
-- SECTION: migration_001_certification_system.sql
-- ------------------------------------------
-- ReadyCheck AI - Phase 1: Enhanced Database Foundation with Certification System
-- Migration 001: User sync system and certification infrastructure
-- Security: RLS policies, input validation, audit logging, transaction safety
-- Author: System Migration
-- Date: 2025-08-28

-- Start transaction for atomic migration
BEGIN;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- AUDIT LOGGING SYSTEM
-- =====================================================

-- Audit log table for tracking all database changes
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_id UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Enable RLS on audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow reading own audit entries
DROP POLICY IF EXISTS "Users can read own audit entries" ON public.audit_log;
CREATE POLICY "Users can read own audit entries" ON public.audit_log
    FOR SELECT USING (auth.uid() = user_id);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_log (
        table_name,
        operation,
        old_values,
        new_values,
        user_id
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        COALESCE(NEW.id, OLD.id)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CERTIFICATION LEVELS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.certification_levels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level_code TEXT UNIQUE NOT NULL CHECK (level_code ~ '^[a-z]{4}$'),
    level_name TEXT NOT NULL CHECK (length(level_name) >= 3 AND length(level_name) <= 100),
    description TEXT NOT NULL CHECK (length(description) >= 10 AND length(description) <= 500),
    prerequisites TEXT[] DEFAULT '{}',
    max_attempts INTEGER DEFAULT 2 CHECK (max_attempts > 0 AND max_attempts <= 5),
    cooldown_days INTEGER DEFAULT 30 CHECK (cooldown_days >= 0 AND cooldown_days <= 365),
    pass_threshold INTEGER DEFAULT 80 CHECK (pass_threshold >= 50 AND pass_threshold <= 100),
    time_limit_minutes INTEGER DEFAULT 60 CHECK (time_limit_minutes >= 15 AND time_limit_minutes <= 180),
    question_count INTEGER DEFAULT 50 CHECK (question_count >= 10 AND question_count <= 100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.certification_levels ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read active certification levels
DROP POLICY IF EXISTS "Authenticated users can read active levels" ON public.certification_levels;
CREATE POLICY "Authenticated users can read active levels" ON public.certification_levels
    FOR SELECT USING (auth.role() = 'authenticated' AND active = true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_certification_levels_code ON public.certification_levels(level_code);
CREATE INDEX IF NOT EXISTS idx_certification_levels_active ON public.certification_levels(active);

-- Insert initial certification levels with transaction safety
INSERT INTO public.certification_levels (level_code, level_name, description, prerequisites, max_attempts, cooldown_days, pass_threshold, time_limit_minutes, question_count)
VALUES 
    ('rcaf', 'AI Foundations', 'Validates core AI concepts, ethics, and fundamental understanding of artificial intelligence principles', '{}', 2, 30, 80, 45, 40),
    ('rcap', 'AI Practitioner', 'Proves applied machine learning skills, data science competency, and practical AI implementation', '{rcaf}', 2, 30, 80, 60, 50),
    ('rcgs', 'Generative AI Specialist', 'Confirms expertise in modern LLMs, prompt engineering, and generative AI applications', '{rcap}', 2, 30, 80, 60, 50),
    ('rcsa', 'AI Solutions Architect', 'Demonstrates advanced system design ability, AI strategy, and enterprise-level implementation', '{rcgs}', 2, 30, 85, 90, 60)
ON CONFLICT (level_code) DO NOTHING;

-- =====================================================
-- ENHANCED USERS TABLE
-- =====================================================

-- First, backup existing users data
CREATE TABLE IF NOT EXISTS public.users_backup AS 
SELECT * FROM public.users;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;

-- Add new columns to existing users table with proper constraints
ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS full_name TEXT CHECK (length(full_name) >= 2 AND length(full_name) <= 100),
    ADD COLUMN IF NOT EXISTS avatar_url TEXT CHECK (avatar_url ~ '^https?://.*' OR avatar_url IS NULL),
    ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro')),
    ADD COLUMN IF NOT EXISTS certification_progress JSONB DEFAULT '{"rcaf": "not_started", "rcap": "locked", "rcgs": "locked", "rcsa": "locked"}',
    ADD COLUMN IF NOT EXISTS pro_subscription_start TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS pro_subscription_end TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS total_practice_assessments INTEGER DEFAULT 0 CHECK (total_practice_assessments >= 0),
    ADD COLUMN IF NOT EXISTS certification_attempts JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS honor_code_accepted BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS honor_code_accepted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned')),
    ADD COLUMN IF NOT EXISTS ban_reason TEXT CHECK (
        (account_status IN ('suspended', 'banned') AND ban_reason IS NOT NULL) OR 
        (account_status = 'active' AND ban_reason IS NULL)
    );

-- Update existing name column to full_name if data exists
UPDATE public.users 
SET full_name = name 
WHERE name IS NOT NULL AND full_name IS NULL;

-- Add constraint to ensure email format
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_email_format'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_email_format
      CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

-- Add constraint for subscription dates logic
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_subscription_dates_logic'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users 
      ADD CONSTRAINT users_subscription_dates_logic 
      CHECK (
          (subscription_plan = 'free' AND pro_subscription_start IS NULL AND pro_subscription_end IS NULL) OR
          (subscription_plan = 'pro' AND pro_subscription_start IS NOT NULL)
      );
  END IF;
END $$;

-- Add constraint for honor code logic
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_honor_code_logic'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users 
      ADD CONSTRAINT users_honor_code_logic 
      CHECK (
          (honor_code_accepted = false AND honor_code_accepted_at IS NULL) OR
          (honor_code_accepted = true AND honor_code_accepted_at IS NOT NULL)
      );
  END IF;
END $$;

-- Create enhanced RLS policies
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Create policy for user insertion (handled by sync function)
DROP POLICY IF EXISTS "System can insert users" ON public.users;
CREATE POLICY "System can insert users" ON public.users
    FOR INSERT WITH CHECK (true);

-- Add audit trigger to users table
DROP TRIGGER IF EXISTS users_audit_trigger ON public.users;
CREATE TRIGGER users_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Prevent changes to protected fields by regular users
DROP TRIGGER IF EXISTS protect_users_immutable_fields ON public.users;
CREATE OR REPLACE FUNCTION public.prevent_critical_user_field_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Block updates to protected fields
  IF NEW.email IS DISTINCT FROM OLD.email
     OR NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
     OR NEW.pro_subscription_start IS DISTINCT FROM OLD.pro_subscription_start
     OR NEW.pro_subscription_end IS DISTINCT FROM OLD.pro_subscription_end
     OR NEW.account_status IS DISTINCT FROM OLD.account_status
     OR NEW.ban_reason IS DISTINCT FROM OLD.ban_reason THEN
       RAISE EXCEPTION 'Attempt to modify protected fields is not allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_users_immutable_fields ON public.users;
CREATE TRIGGER protect_users_immutable_fields
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.prevent_critical_user_field_changes();

-- =====================================================
-- CERTIFICATION ATTEMPTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.certification_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    level_code TEXT REFERENCES public.certification_levels(level_code) NOT NULL,
    attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'expired')),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    passed BOOLEAN,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    answers JSONB DEFAULT '{}',
    time_taken_minutes INTEGER CHECK (time_taken_minutes >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, level_code, attempt_number)
);

-- Enable RLS
ALTER TABLE public.certification_attempts ENABLE ROW LEVEL SECURITY;

-- Users can read their own attempts
DROP POLICY IF EXISTS "Users can read own attempts" ON public.certification_attempts;
CREATE POLICY "Users can read own attempts" ON public.certification_attempts
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own attempts
DROP POLICY IF EXISTS "Users can create attempts" ON public.certification_attempts;
CREATE POLICY "Users can create attempts" ON public.certification_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own in-progress attempts
DROP POLICY IF EXISTS "Users can update own attempts" ON public.certification_attempts;
CREATE POLICY "Users can update own attempts" ON public.certification_attempts
    FOR UPDATE USING (auth.uid() = user_id AND status = 'in_progress');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_certification_attempts_user_level ON public.certification_attempts(user_id, level_code);
CREATE INDEX IF NOT EXISTS idx_certification_attempts_status ON public.certification_attempts(status);
CREATE INDEX IF NOT EXISTS idx_certification_attempts_completed ON public.certification_attempts(completed_at);

-- Add audit trigger
DROP TRIGGER IF EXISTS certification_attempts_audit_trigger ON public.certification_attempts;
CREATE TRIGGER certification_attempts_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.certification_attempts
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_certification_attempts_updated_at ON public.certification_attempts;
CREATE TRIGGER update_certification_attempts_updated_at
    BEFORE UPDATE ON public.certification_attempts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- USER SYNC FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
    user_name TEXT;
    user_avatar TEXT;
    user_metadata JSONB;
BEGIN
    -- Input validation and safe extraction
    BEGIN
        user_email := COALESCE(NEW.email, '');
        user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::JSONB);
        
        -- Extract name safely with fallback
        user_name := COALESCE(
            user_metadata->>'full_name',
            user_metadata->>'name',
            user_metadata->>'display_name',
            split_part(user_email, '@', 1)
        );
        
        -- Extract avatar URL safely
        user_avatar := user_metadata->>'avatar_url';
        
        -- Validate email format
        IF user_email = '' OR user_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
            RAISE EXCEPTION 'Invalid email format: %', user_email;
        END IF;
        
        -- Validate name length
        IF length(user_name) < 2 OR length(user_name) > 100 THEN
            user_name := split_part(user_email, '@', 1); -- Fallback to email prefix
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log error and use safe defaults
        RAISE WARNING 'Error extracting user metadata: %. Using defaults.', SQLERRM;
        user_name := split_part(COALESCE(NEW.email, 'unknown'), '@', 1);
        user_avatar := NULL;
    END;
    
    -- Insert into public.users with comprehensive error handling
    BEGIN
        INSERT INTO public.users (
            id,
            email,
            full_name,
            avatar_url,
            subscription_plan,
            certification_progress,
            total_practice_assessments,
            certification_attempts,
            honor_code_accepted,
            account_status,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            user_email,
            user_name,
            user_avatar,
            'free',
            '{"rcaf": "not_started", "rcap": "locked", "rcgs": "locked", "rcsa": "locked"}'::JSONB,
            0,
            '{}'::JSONB,
            false,
            'active',
            NOW(),
            NOW()
        );
        
        -- Log successful user creation
        RAISE NOTICE 'Successfully created user profile for: %', user_email;
        
    EXCEPTION 
        WHEN unique_violation THEN
            -- Handle duplicate insertion gracefully
            RAISE NOTICE 'User profile already exists for: %', user_email;
        WHEN OTHERS THEN
            -- Log error but don't fail the auth process
            RAISE WARNING 'Failed to create user profile for %: %', user_email, SQLERRM;
            -- Re-raise if it's a critical error that should block auth
            IF SQLSTATE = '23505' THEN -- unique_violation is OK
                NULL; -- Continue
            ELSE
                RAISE; -- Re-raise other errors
            END IF;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic user sync
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check certification prerequisites
CREATE OR REPLACE FUNCTION public.check_certification_prerequisites(
    p_user_id UUID,
    p_level_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    required_levels TEXT[];
    level_record RECORD;
    passed_levels TEXT[];
BEGIN
    -- Get prerequisites for the level
    SELECT prerequisites INTO required_levels
    FROM public.certification_levels
    WHERE level_code = p_level_code AND active = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- If no prerequisites, return true
    IF array_length(required_levels, 1) IS NULL THEN
        RETURN true;
    END IF;
    
    -- Get user's passed certifications
    SELECT array_agg(level_code) INTO passed_levels
    FROM public.certification_attempts
    WHERE user_id = p_user_id 
        AND status = 'completed' 
        AND passed = true;
    
    -- Check if all prerequisites are met
    RETURN required_levels <@ COALESCE(passed_levels, '{}');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's next available certification
CREATE OR REPLACE FUNCTION public.get_next_available_certification(p_user_id UUID)
RETURNS TABLE(level_code TEXT, level_name TEXT, description TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT cl.level_code, cl.level_name, cl.description
    FROM public.certification_levels cl
    WHERE cl.active = true
        AND public.check_certification_prerequisites(p_user_id, cl.level_code)
        AND NOT EXISTS (
            SELECT 1 FROM public.certification_attempts ca
            WHERE ca.user_id = p_user_id 
                AND ca.level_code = cl.level_code 
                AND ca.status = 'completed' 
                AND ca.passed = true
        )
    ORDER BY 
        CASE cl.level_code 
            WHEN 'rcaf' THEN 1
            WHEN 'rcap' THEN 2
            WHEN 'rcgs' THEN 3
            WHEN 'rcsa' THEN 4
            ELSE 5
        END
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Additional indexes for enhanced performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON public.users(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON public.users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_operation ON public.audit_log(table_name, operation);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON public.audit_log(changed_at);

-- Commit the transaction
COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- These queries should be run after migration to verify success
/*
-- Verify certification levels were created
SELECT level_code, level_name, active FROM public.certification_levels ORDER BY level_code;

-- Verify user table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test user sync function (replace with actual auth user ID)
-- SELECT public.handle_new_user() -- This would be called automatically

-- Verify RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Check indexes
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
*/


-- ------------------------------------------
-- SECTION: migration_002_dual_question_system.sql
-- ------------------------------------------
-- ReadyCheck AI - Phase 2: Dual Question Bank with Certification Question Structure
-- Migration 002: Flexible question system supporting practice and certification exams
-- Security: Answer leakage prevention, access control, audit trails, injection prevention
-- Author: System Migration
-- Date: 2025-08-28

-- Start transaction for atomic migration
BEGIN;

-- =====================================================
-- ASSESSMENT CATEGORIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.assessment_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_code TEXT UNIQUE NOT NULL CHECK (category_code ~ '^[a-z_]+$'),
    category_name TEXT NOT NULL CHECK (length(category_name) >= 2 AND length(category_name) <= 100),
    description TEXT CHECK (length(description) <= 500),
    parent_category_id UUID REFERENCES public.assessment_categories(id),
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safeguard for pre-existing table: ensure required columns exist
ALTER TABLE public.assessment_categories
    ADD COLUMN IF NOT EXISTS category_code TEXT,
    ADD COLUMN IF NOT EXISTS category_name TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS parent_category_id UUID,
    ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Handle legacy column names and populate required fields
DO $$
BEGIN
    -- If legacy 'name' column exists, copy to 'category_name' and populate 'name'
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'assessment_categories' 
               AND column_name = 'name' 
               AND table_schema = 'public') THEN
        -- First, populate category_name from name if needed
        UPDATE public.assessment_categories 
        SET category_name = COALESCE(category_name, name, 'Unknown Category')
        WHERE category_name IS NULL;
        
        -- Then, populate name from category_name to satisfy NOT NULL constraint
        UPDATE public.assessment_categories 
        SET name = COALESCE(name, category_name, 'Unknown Category')
        WHERE name IS NULL;
    END IF;
    
    -- Ensure category_code is populated with unique values
    UPDATE public.assessment_categories 
    SET category_code = COALESCE(category_code, 'cat_' || id::TEXT)
    WHERE category_code IS NULL;
    
    -- Handle duplicate category_codes by making them unique
    WITH duplicates AS (
        SELECT id, category_code, 
               ROW_NUMBER() OVER (PARTITION BY category_code ORDER BY created_at, id) as rn
        FROM public.assessment_categories 
        WHERE category_code IS NOT NULL
    )
    UPDATE public.assessment_categories 
    SET category_code = duplicates.category_code || '_' || (duplicates.rn - 1)::TEXT
    FROM duplicates 
    WHERE public.assessment_categories.id = duplicates.id 
      AND duplicates.rn > 1;
    
    -- Ensure category_name is populated
    UPDATE public.assessment_categories 
    SET category_name = COALESCE(category_name, 'Unknown Category')
    WHERE category_name IS NULL;
    
    -- Set defaults for other fields
    UPDATE public.assessment_categories 
    SET display_order = COALESCE(display_order, 999),
        active = COALESCE(active, true),
        created_at = COALESCE(created_at, NOW()),
        updated_at = COALESCE(updated_at, NOW())
    WHERE display_order IS NULL OR active IS NULL OR created_at IS NULL OR updated_at IS NULL;
END $$;

-- Enable RLS
ALTER TABLE public.assessment_categories ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read active categories
DROP POLICY IF EXISTS "Authenticated users can read active categories" ON public.assessment_categories;
CREATE POLICY "Authenticated users can read active categories" ON public.assessment_categories
    FOR SELECT USING (auth.role() = 'authenticated' AND active = true);

-- Create indexes
-- Unique index needed for ON CONFLICT(category_code)
CREATE UNIQUE INDEX IF NOT EXISTS uq_assessment_categories_code ON public.assessment_categories(category_code);
CREATE INDEX IF NOT EXISTS idx_assessment_categories_active ON public.assessment_categories(active);
CREATE INDEX IF NOT EXISTS idx_assessment_categories_parent ON public.assessment_categories(parent_category_id);

-- Insert initial categories based on existing question data
-- Handle legacy 'name' column if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'assessment_categories' 
               AND column_name = 'name' 
               AND table_schema = 'public') THEN
        -- Insert with both category_name and name populated, handling name uniqueness
        -- Use exception handling to insert categories safely
        BEGIN
            INSERT INTO public.assessment_categories (category_code, category_name, name, description, display_order)
            VALUES ('fundamentals', 'AI Fundamentals', 'AI Fundamentals', 'Core concepts and basic understanding of artificial intelligence', 1);
        EXCEPTION WHEN unique_violation THEN
            -- Skip if either category_code or name already exists
        END;
        
        BEGIN
            INSERT INTO public.assessment_categories (category_code, category_name, name, description, display_order)
            VALUES ('practical', 'Practical Applications', 'Practical Applications', 'Hands-on AI usage and prompt engineering skills', 2);
        EXCEPTION WHEN unique_violation THEN
        END;
        
        BEGIN
            INSERT INTO public.assessment_categories (category_code, category_name, name, description, display_order)
            VALUES ('business', 'Business Strategy', 'Business Strategy', 'AI implementation in business contexts and ROI considerations', 3);
        EXCEPTION WHEN unique_violation THEN
        END;
        
        BEGIN
            INSERT INTO public.assessment_categories (category_code, category_name, name, description, display_order)
            VALUES ('ethics', 'Ethics & Governance', 'Ethics & Governance', 'Responsible AI usage, bias, and ethical considerations', 4);
        EXCEPTION WHEN unique_violation THEN
        END;
        
        BEGIN
            INSERT INTO public.assessment_categories (category_code, category_name, name, description, display_order)
            VALUES ('general', 'General Knowledge', 'General Knowledge', 'Comprehensive AI knowledge across multiple domains', 5);
        EXCEPTION WHEN unique_violation THEN
        END;
        
        BEGIN
            INSERT INTO public.assessment_categories (category_code, category_name, name, description, display_order)
            VALUES ('technical', 'Technical Implementation', 'Technical Implementation', 'Advanced technical concepts and implementation details', 6);
        EXCEPTION WHEN unique_violation THEN
        END;
        
        BEGIN
            INSERT INTO public.assessment_categories (category_code, category_name, name, description, display_order)
            VALUES ('leadership', 'AI Leadership', 'AI Leadership', 'Strategic decision-making and AI transformation leadership', 7);
        EXCEPTION WHEN unique_violation THEN
        END;
        
        BEGIN
            INSERT INTO public.assessment_categories (category_code, category_name, name, description, display_order)
            VALUES ('security', 'AI Security', 'AI Security', 'Security considerations, risks, and mitigation strategies', 8);
        EXCEPTION WHEN unique_violation THEN
        END;
    ELSE
        -- Insert without legacy 'name' column
        INSERT INTO public.assessment_categories (category_code, category_name, description, display_order)
        VALUES 
            ('fundamentals', 'AI Fundamentals', 'Core concepts and basic understanding of artificial intelligence', 1),
            ('practical', 'Practical Applications', 'Hands-on AI usage and prompt engineering skills', 2),
            ('business', 'Business Strategy', 'AI implementation in business contexts and ROI considerations', 3),
            ('ethics', 'Ethics & Governance', 'Responsible AI usage, bias, and ethical considerations', 4),
            ('general', 'General Knowledge', 'Comprehensive AI knowledge across multiple domains', 5),
            ('technical', 'Technical Implementation', 'Advanced technical concepts and implementation details', 6),
            ('leadership', 'AI Leadership', 'Strategic decision-making and AI transformation leadership', 7),
            ('security', 'AI Security', 'Security considerations, risks, and mitigation strategies', 8)
        ON CONFLICT (category_code) DO NOTHING;
    END IF;
END $$;

-- =====================================================
-- FLEXIBLE QUESTIONS TABLE
-- =====================================================

-- Ensure required tables exist before creating foreign key references
DO $$
BEGIN
    -- Check if certification_levels table exists (from migration_001)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'certification_levels' 
                   AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Table public.certification_levels does not exist. Please run migration_001_certification_system.sql first.';
    END IF;
    
    -- Check if users table exists (from migration_001)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'users' 
                   AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Table public.users does not exist. Please run migration_001_certification_system.sql first.';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_key TEXT UNIQUE NOT NULL CHECK (length(question_key) >= 2 AND length(question_key) <= 50),
    question_type TEXT CHECK (question_type IN ('practice', 'certification')) NOT NULL,
    certification_level TEXT,
    
    -- Add foreign key constraint after table creation to handle dependencies
    CONSTRAINT fk_questions_certification_level 
        FOREIGN KEY (certification_level) 
        REFERENCES public.certification_levels(level_code),
    category_id UUID REFERENCES public.assessment_categories(id) NOT NULL,
    subcategory_tags TEXT[] DEFAULT '{}',
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 10) NOT NULL,
    complexity_score INTEGER CHECK (complexity_score BETWEEN 1 AND 5) DEFAULT 1,
    question_text TEXT NOT NULL CHECK (length(question_text) >= 10 AND length(question_text) <= 2000),
    question_format TEXT DEFAULT 'single_choice' CHECK (question_format IN ('single_choice', 'multiple_choice', 'case_study', 'scenario_based')),
    options JSONB NOT NULL CHECK (jsonb_array_length(options) >= 2 AND jsonb_array_length(options) <= 6),
    correct_answer_index INTEGER NOT NULL,
    correct_answer_text TEXT NOT NULL CHECK (length(correct_answer_text) >= 1 AND length(correct_answer_text) <= 500),
    explanation TEXT NOT NULL CHECK (length(explanation) >= 10 AND length(explanation) <= 1000),
    business_context TEXT NOT NULL CHECK (length(business_context) >= 10 AND length(business_context) <= 1000),
    case_study_materials JSONB DEFAULT '{}',
    time_allocation_seconds INTEGER DEFAULT 60 CHECK (time_allocation_seconds BETWEEN 15 AND 600),
    points INTEGER NOT NULL CHECK (points BETWEEN 1 AND 10),
    industry_tags TEXT[] DEFAULT '{}',
    skill_competencies TEXT[] DEFAULT '{}',
    question_version INTEGER DEFAULT 1 CHECK (question_version > 0),
    active BOOLEAN DEFAULT true,
    created_by UUID,
    
    -- Add foreign key constraint for created_by after table creation
    CONSTRAINT fk_questions_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint to ensure certification questions have certification level
    CONSTRAINT questions_certification_level_check 
        CHECK (
            (question_type = 'practice') OR 
            (question_type = 'certification' AND certification_level IS NOT NULL)
        ),
    
    -- Constraint to validate correct_answer_index is within options range
    CONSTRAINT questions_correct_answer_index_check 
        CHECK (correct_answer_index >= 0 AND correct_answer_index < jsonb_array_length(options))
);

-- Safeguard for pre-existing table: ensure required columns exist
ALTER TABLE public.questions
    ADD COLUMN IF NOT EXISTS question_key TEXT,
    ADD COLUMN IF NOT EXISTS question_type TEXT,
    ADD COLUMN IF NOT EXISTS certification_level TEXT,
    ADD COLUMN IF NOT EXISTS category_id UUID,
    ADD COLUMN IF NOT EXISTS subcategory_tags TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS difficulty_level INTEGER,
    ADD COLUMN IF NOT EXISTS complexity_score INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS question_text TEXT,
    ADD COLUMN IF NOT EXISTS question_format TEXT DEFAULT 'single_choice',
    ADD COLUMN IF NOT EXISTS options JSONB,
    ADD COLUMN IF NOT EXISTS correct_answer_index INTEGER,
    ADD COLUMN IF NOT EXISTS correct_answer_text TEXT,
    ADD COLUMN IF NOT EXISTS explanation TEXT,
    ADD COLUMN IF NOT EXISTS business_context TEXT,
    ADD COLUMN IF NOT EXISTS case_study_materials JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS time_allocation_seconds INTEGER DEFAULT 60,
    ADD COLUMN IF NOT EXISTS points INTEGER,
    ADD COLUMN IF NOT EXISTS industry_tags TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS skill_competencies TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS question_version INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Handle questions table data integrity
DO $$
BEGIN
    -- Populate required fields with defaults for existing rows
    UPDATE public.questions 
    SET question_key = COALESCE(question_key, 'q_' || id::TEXT),
        question_type = COALESCE(question_type, 'practice'),
        difficulty_level = COALESCE(difficulty_level, 1),
        question_text = COALESCE(question_text, 'Question text not provided'),
        options = COALESCE(options, '["Option A", "Option B"]'::JSONB),
        correct_answer_index = COALESCE(correct_answer_index, 0),
        correct_answer_text = COALESCE(correct_answer_text, 'Option A'),
        explanation = COALESCE(explanation, 'Explanation not provided'),
        business_context = COALESCE(business_context, 'Business context not provided'),
        points = COALESCE(points, 1),
        active = COALESCE(active, true),
        created_at = COALESCE(created_at, NOW()),
        updated_at = COALESCE(updated_at, NOW())
    WHERE question_key IS NULL OR question_type IS NULL OR difficulty_level IS NULL 
       OR question_text IS NULL OR options IS NULL OR correct_answer_index IS NULL
       OR correct_answer_text IS NULL OR explanation IS NULL OR business_context IS NULL
       OR points IS NULL OR active IS NULL OR created_at IS NULL OR updated_at IS NULL;
       
    -- Set category_id to a default category if NULL
    UPDATE public.questions 
    SET category_id = (
        SELECT id FROM public.assessment_categories 
        WHERE category_code = 'general' 
        LIMIT 1
    )
    WHERE category_id IS NULL;
END $$;

-- Enable RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Practice questions: accessible to all authenticated users (without answers)
DROP POLICY IF EXISTS "Authenticated users can read practice questions" ON public.questions;
CREATE POLICY "Authenticated users can read practice questions" ON public.questions
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        active = true AND 
        question_type = 'practice'
    );

-- Certification questions: only accessible during formal exam sessions
-- This policy will be enhanced with session validation in application layer
DROP POLICY IF EXISTS "Pro users can read certification questions" ON public.questions;
CREATE POLICY "Pro users can read certification questions" ON public.questions
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        active = true AND 
        question_type = 'certification' AND
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND subscription_plan = 'pro'
        )
    );

-- Only system can insert/update questions
DROP POLICY IF EXISTS "System can manage questions" ON public.questions;
CREATE POLICY "System can manage questions" ON public.questions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- QUESTION ANALYTICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.question_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    total_attempts INTEGER DEFAULT 0 CHECK (total_attempts >= 0),
    correct_attempts INTEGER DEFAULT 0 CHECK (correct_attempts >= 0),
    avg_time_seconds DECIMAL(8,2) CHECK (avg_time_seconds >= 0),
    difficulty_rating DECIMAL(3,2) CHECK (difficulty_rating >= 0 AND difficulty_rating <= 10),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint to ensure correct_attempts <= total_attempts
    CONSTRAINT question_analytics_attempts_check 
        CHECK (correct_attempts <= total_attempts)
);

-- Enable RLS
ALTER TABLE public.question_analytics ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read analytics for practice questions only
DROP POLICY IF EXISTS "Users can read practice question analytics" ON public.question_analytics;
CREATE POLICY "Users can read practice question analytics" ON public.question_analytics
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.questions q 
            WHERE q.id = question_id 
            AND q.active = true 
            AND q.question_type = 'practice'
        )
    );

-- Only system can update analytics
DROP POLICY IF EXISTS "System can manage question analytics" ON public.question_analytics;
CREATE POLICY "System can manage question analytics" ON public.question_analytics
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- QUESTION ACCESS LOG TABLE (Security Audit Trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.question_access_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    question_id UUID,
    
    -- Add foreign key constraints after table creation
    CONSTRAINT fk_question_access_log_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_question_access_log_question_id 
        FOREIGN KEY (question_id) 
        REFERENCES public.questions(id) ON DELETE CASCADE,
    access_type TEXT CHECK (access_type IN ('view', 'answer', 'skip', 'flag')) NOT NULL,
    session_id TEXT,
    assessment_attempt_id UUID, -- Will reference assessment attempts table
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.question_access_log ENABLE ROW LEVEL SECURITY;

-- Users can only read their own access logs
DROP POLICY IF EXISTS "Users can read own access logs" ON public.question_access_log;
CREATE POLICY "Users can read own access logs" ON public.question_access_log
    FOR SELECT USING (auth.uid() = user_id);

-- System can insert access logs
DROP POLICY IF EXISTS "System can log question access" ON public.question_access_log;
CREATE POLICY "System can log question access" ON public.question_access_log
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- SECURE QUESTION SERVING FUNCTIONS
-- =====================================================

-- Function to get practice questions without answers
CREATE OR REPLACE FUNCTION public.get_practice_questions(
    p_category_id UUID DEFAULT NULL,
    p_difficulty_level INTEGER DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
) RETURNS TABLE(
    id UUID,
    question_key TEXT,
    category_name TEXT,
    difficulty_level INTEGER,
    question_text TEXT,
    question_format TEXT,
    options JSONB,
    time_allocation_seconds INTEGER,
    points INTEGER,
    industry_tags TEXT[],
    skill_competencies TEXT[]
) AS $$
BEGIN
    -- Validate inputs
    IF p_limit > 100 THEN
        RAISE EXCEPTION 'Maximum limit is 100 questions per request';
    END IF;
    
    IF p_difficulty_level IS NOT NULL AND (p_difficulty_level < 1 OR p_difficulty_level > 10) THEN
        RAISE EXCEPTION 'Difficulty level must be between 1 and 10';
    END IF;
    
    RETURN QUERY
    SELECT 
        q.id,
        q.question_key,
        ac.category_name,
        q.difficulty_level,
        q.question_text,
        q.question_format,
        q.options,
        q.time_allocation_seconds,
        q.points,
        q.industry_tags,
        q.skill_competencies
    FROM public.questions q
    JOIN public.assessment_categories ac ON q.category_id = ac.id
    WHERE q.active = true
        AND q.question_type = 'practice'
        AND ac.active = true
        AND (p_category_id IS NULL OR q.category_id = p_category_id)
        AND (p_difficulty_level IS NULL OR q.difficulty_level = p_difficulty_level)
    ORDER BY RANDOM()
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate question answers (without exposing correct answers)
CREATE OR REPLACE FUNCTION public.validate_question_answer(
    p_question_id UUID,
    p_user_answer_index INTEGER,
    p_time_taken_seconds INTEGER DEFAULT NULL
) RETURNS TABLE(
    is_correct BOOLEAN,
    explanation TEXT,
    business_context TEXT,
    points_earned INTEGER
) AS $$
DECLARE
    v_question RECORD;
    v_is_correct BOOLEAN;
BEGIN
    -- Get question details
    SELECT 
        correct_answer_index,
        explanation,
        business_context,
        points,
        question_type,
        certification_level
    INTO v_question
    FROM public.questions
    WHERE id = p_question_id AND active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Question not found or inactive';
    END IF;
    
    -- Security check: ensure user has access to this question type
    IF v_question.question_type = 'certification' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND subscription_plan = 'pro'
        ) THEN
            RAISE EXCEPTION 'Certification questions require pro subscription';
        END IF;
    END IF;
    
    -- Validate answer
    v_is_correct := (p_user_answer_index = v_question.correct_answer_index);
    
    -- Log the answer attempt
    INSERT INTO public.question_access_log (
        user_id, 
        question_id, 
        access_type,
        accessed_at
    ) VALUES (
        auth.uid(),
        p_question_id,
        'answer',
        NOW()
    );
    
    -- Update question analytics
    INSERT INTO public.question_analytics (question_id, total_attempts, correct_attempts, last_updated)
    VALUES (p_question_id, 1, CASE WHEN v_is_correct THEN 1 ELSE 0 END, NOW())
    ON CONFLICT (question_id) DO UPDATE SET
        total_attempts = question_analytics.total_attempts + 1,
        correct_attempts = question_analytics.correct_attempts + CASE WHEN v_is_correct THEN 1 ELSE 0 END,
        avg_time_seconds = CASE 
            WHEN p_time_taken_seconds IS NOT NULL THEN
                COALESCE(
                    (question_analytics.avg_time_seconds * question_analytics.total_attempts + p_time_taken_seconds) / 
                    (question_analytics.total_attempts + 1),
                    p_time_taken_seconds
                )
            ELSE question_analytics.avg_time_seconds
        END,
        last_updated = NOW();
    
    RETURN QUERY
    SELECT 
        v_is_correct,
        v_question.explanation,
        v_question.business_context,
        CASE WHEN v_is_correct THEN v_question.points ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get certification questions for active exam session
CREATE OR REPLACE FUNCTION public.get_certification_questions(
    p_certification_level TEXT,
    p_session_id TEXT
) RETURNS TABLE(
    id UUID,
    question_key TEXT,
    difficulty_level INTEGER,
    question_text TEXT,
    question_format TEXT,
    options JSONB,
    time_allocation_seconds INTEGER,
    points INTEGER
) AS $$
DECLARE
    v_question_count INTEGER;
    v_time_limit INTEGER;
BEGIN
    -- Validate certification level exists and user has prerequisites
    IF NOT public.check_certification_prerequisites(auth.uid(), p_certification_level) THEN
        RAISE EXCEPTION 'Prerequisites not met for certification level: %', p_certification_level;
    END IF;
    
    -- Get question count for this certification level
    SELECT question_count, time_limit_minutes
    INTO v_question_count, v_time_limit
    FROM public.certification_levels
    WHERE level_code = p_certification_level AND active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Certification level not found or inactive: %', p_certification_level;
    END IF;
    
    -- TODO: Add session validation logic here
    -- This should verify that p_session_id is valid and belongs to current user
    
    RETURN QUERY
    SELECT 
        q.id,
        q.question_key,
        q.difficulty_level,
        q.question_text,
        q.question_format,
        q.options,
        q.time_allocation_seconds,
        q.points
    FROM public.questions q
    WHERE q.active = true
        AND q.question_type = 'certification'
        AND q.certification_level = p_certification_level
    ORDER BY q.difficulty_level, RANDOM()
    LIMIT v_question_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Questions table indexes
CREATE INDEX IF NOT EXISTS idx_questions_type_level ON public.questions(question_type, certification_level);
CREATE INDEX IF NOT EXISTS idx_questions_category_difficulty ON public.questions(category_id, difficulty_level);
CREATE INDEX IF NOT EXISTS idx_questions_active_type ON public.questions(active, question_type);
CREATE INDEX IF NOT EXISTS idx_questions_key ON public.questions(question_key);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON public.questions(created_by);

-- Question analytics indexes
-- Unique index needed for ON CONFLICT(question_id) upsert
CREATE UNIQUE INDEX IF NOT EXISTS uq_question_analytics_question_id ON public.question_analytics(question_id);
CREATE INDEX IF NOT EXISTS idx_question_analytics_difficulty_rating ON public.question_analytics(difficulty_rating);

-- Question access log indexes
CREATE INDEX IF NOT EXISTS idx_question_access_log_user_id ON public.question_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_question_access_log_question_id ON public.question_access_log(question_id);
CREATE INDEX IF NOT EXISTS idx_question_access_log_accessed_at ON public.question_access_log(accessed_at);
CREATE INDEX IF NOT EXISTS idx_question_access_log_session_id ON public.question_access_log(session_id);

-- =====================================================
-- AUDIT TRIGGERS
-- =====================================================

-- Add audit triggers to new tables
DROP TRIGGER IF EXISTS assessment_categories_audit_trigger ON public.assessment_categories;
CREATE TRIGGER assessment_categories_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.assessment_categories
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS questions_audit_trigger ON public.questions;
CREATE TRIGGER questions_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.questions
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_assessment_categories_updated_at ON public.assessment_categories;
CREATE TRIGGER update_assessment_categories_updated_at
    BEFORE UPDATE ON public.assessment_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_questions_updated_at ON public.questions;
CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON public.questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- QUESTION IMPORT VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate question structure before import
CREATE OR REPLACE FUNCTION public.validate_question_structure(
    p_question JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    v_required_fields TEXT[] := ARRAY['question_text', 'options', 'correct_answer_index', 'explanation'];
    v_field TEXT;
    v_options_count INTEGER;
BEGIN
    -- Check required fields exist
    FOREACH v_field IN ARRAY v_required_fields
    LOOP
        IF NOT (p_question ? v_field) THEN
            RAISE EXCEPTION 'Missing required field: %', v_field;
        END IF;
    END LOOP;
    
    -- Validate options array
    v_options_count := jsonb_array_length(p_question->'options');
    IF v_options_count < 2 OR v_options_count > 6 THEN
        RAISE EXCEPTION 'Options array must have 2-6 items, got %', v_options_count;
    END IF;
    
    -- Validate correct_answer_index
    IF (p_question->>'correct_answer_index')::INTEGER >= v_options_count THEN
        RAISE EXCEPTION 'correct_answer_index % is out of range for % options', 
            p_question->>'correct_answer_index', v_options_count;
    END IF;
    
    -- Validate text lengths
    IF length(p_question->>'question_text') < 10 THEN
        RAISE EXCEPTION 'question_text must be at least 10 characters';
    END IF;
    
    IF length(p_question->>'explanation') < 10 THEN
        RAISE EXCEPTION 'explanation must be at least 10 characters';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Commit the transaction
COMMIT;

-- =====================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- =====================================================

/*
-- Verify tables were created successfully
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('assessment_categories', 'questions', 'question_analytics', 'question_access_log')
ORDER BY table_name, ordinal_position;

-- Verify categories were inserted
SELECT category_code, category_name, active FROM public.assessment_categories ORDER BY display_order;

-- Verify RLS policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('questions', 'assessment_categories', 'question_analytics')
ORDER BY tablename, policyname;

-- Verify functions were created
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name LIKE '%question%'
ORDER BY routine_name;

-- Test question validation function
SELECT public.validate_question_structure('{"question_text": "Test question?", "options": ["A", "B"], "correct_answer_index": 0, "explanation": "Test explanation"}');
*/


-- ------------------------------------------
-- SECTION: migration_003_assessment_engine.sql
-- ------------------------------------------
-- ReadyCheck AI - Phase 3: Assessment Engine with Practice vs Certification Modes
-- Migration 003: Assessment sessions, progress tracking, and certificate system
-- Security: Session integrity, anti-tampering, honor code enforcement
-- Author: System Migration
-- Date: 2025-08-28

-- Start transaction for atomic migration
BEGIN;

-- Ensure required tables exist before creating foreign key references
DO $$
BEGIN
    -- Check if users table exists (from migration_001)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'users' 
                   AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Table public.users does not exist. Please run migration_001_certification_system.sql first.';
    END IF;
    
    -- Check if certification_levels table exists (from migration_001)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'certification_levels' 
                   AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Table public.certification_levels does not exist. Please run migration_001_certification_system.sql first.';
    END IF;
    
    -- Check if assessment_categories table exists (from migration_002)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'assessment_categories' 
                   AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Table public.assessment_categories does not exist. Please run migration_002_dual_question_system.sql first.';
    END IF;
    
    -- Check if questions table exists (from migration_002)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'questions' 
                   AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Table public.questions does not exist. Please run migration_002_dual_question_system.sql first.';
    END IF;
    
    -- Check if audit_trigger_function exists (from migration_001)
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines 
                   WHERE routine_name = 'audit_trigger_function' 
                   AND routine_schema = 'public') THEN
        RAISE EXCEPTION 'Function public.audit_trigger_function does not exist. Please run migration_001_certification_system.sql first.';
    END IF;
    
    -- Check if update_updated_at_column function exists (from migration_001)
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines 
                   WHERE routine_name = 'update_updated_at_column' 
                   AND routine_schema = 'public') THEN
        RAISE EXCEPTION 'Function public.update_updated_at_column does not exist. Please run migration_001_certification_system.sql first.';
    END IF;
END $$;

-- =====================================================
-- ASSESSMENT SESSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.assessment_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    assessment_type TEXT CHECK (assessment_type IN ('practice', 'certification')) NOT NULL,
    certification_level TEXT REFERENCES public.certification_levels(level_code),
    category_id UUID REFERENCES public.assessment_categories(id),
    
    -- Session configuration
    total_questions INTEGER NOT NULL CHECK (total_questions > 0),
    time_limit_minutes INTEGER NOT NULL CHECK (time_limit_minutes > 0),
    pass_threshold INTEGER CHECK (pass_threshold BETWEEN 50 AND 100),
    
    -- Session state
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'expired', 'abandoned')),
    current_question_index INTEGER DEFAULT 0 CHECK (current_question_index >= 0),
    questions_data JSONB NOT NULL DEFAULT '[]', -- Array of question IDs and metadata
    user_answers JSONB DEFAULT '{}', -- Map of question_id -> user_answer_data
    
    -- Timing and progress
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    time_spent_seconds INTEGER DEFAULT 0 CHECK (time_spent_seconds >= 0),
    
    -- Security and integrity
    client_fingerprint TEXT,
    ip_address INET,
    user_agent TEXT,
    honor_code_violations JSONB DEFAULT '[]',
    integrity_hash TEXT, -- Hash of session data for tampering detection
    
    -- Results (populated after completion)
    final_score INTEGER CHECK (final_score BETWEEN 0 AND 100),
    passed BOOLEAN,
    total_points_earned INTEGER DEFAULT 0,
    total_points_possible INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT assessment_sessions_certification_check 
        CHECK (
            (assessment_type = 'practice') OR 
            (assessment_type = 'certification' AND certification_level IS NOT NULL AND pass_threshold IS NOT NULL)
        ),
    CONSTRAINT assessment_sessions_completion_check
        CHECK (
            (status != 'completed') OR 
            (status = 'completed' AND completed_at IS NOT NULL AND final_score IS NOT NULL)
        )
);

-- Enable RLS
ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own sessions
DROP POLICY IF EXISTS "Users can read own sessions" ON public.assessment_sessions;
CREATE POLICY "Users can read own sessions" ON public.assessment_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own sessions
DROP POLICY IF EXISTS "Users can create sessions" ON public.assessment_sessions;
CREATE POLICY "Users can create sessions" ON public.assessment_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own active sessions
DROP POLICY IF EXISTS "Users can update own active sessions" ON public.assessment_sessions;
CREATE POLICY "Users can update own active sessions" ON public.assessment_sessions
    FOR UPDATE USING (
        auth.uid() = user_id AND 
        status IN ('active', 'paused') AND 
        expires_at > NOW()
    );

-- =====================================================
-- ASSESSMENT PROGRESS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.assessment_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.assessment_sessions(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    question_index INTEGER NOT NULL CHECK (question_index >= 0),
    
    -- Answer data
    user_answer_index INTEGER,
    user_answer_text TEXT,
    is_correct BOOLEAN,
    points_earned INTEGER DEFAULT 0 CHECK (points_earned >= 0),
    
    -- Timing data
    question_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    question_answered_at TIMESTAMP WITH TIME ZONE,
    time_spent_seconds INTEGER CHECK (time_spent_seconds >= 0),
    
    -- Behavior tracking
    focus_lost_count INTEGER DEFAULT 0 CHECK (focus_lost_count >= 0),
    copy_paste_attempts INTEGER DEFAULT 0 CHECK (copy_paste_attempts >= 0),
    suspicious_activity JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(session_id, question_id)
);

-- Enable RLS
ALTER TABLE public.assessment_progress ENABLE ROW LEVEL SECURITY;

-- Users can read their own progress
DROP POLICY IF EXISTS "Users can read own progress" ON public.assessment_progress;
CREATE POLICY "Users can read own progress" ON public.assessment_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.assessment_sessions s 
            WHERE s.id = session_id AND s.user_id = auth.uid() AND s.status = 'active'
        )
    );

-- Users can insert/update their own progress
DROP POLICY IF EXISTS "Users can manage own progress" ON public.assessment_progress;
CREATE POLICY "Users can manage own progress" ON public.assessment_progress
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.assessment_sessions s 
            WHERE s.id = session_id AND s.user_id = auth.uid() AND s.status = 'active'
        )
    );

-- =====================================================
-- CERTIFICATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    certificate_code TEXT UNIQUE NOT NULL, -- Public verification code
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    certification_level TEXT REFERENCES public.certification_levels(level_code) NOT NULL,
    session_id UUID REFERENCES public.assessment_sessions(id) ON DELETE SET NULL,
    
    -- Certificate details
    user_full_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    final_score INTEGER NOT NULL CHECK (final_score BETWEEN 0 AND 100),
    passed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Certificate metadata
    certificate_url TEXT, -- URL to generated PDF
    verification_hash TEXT NOT NULL, -- Hash for authenticity verification
    digital_signature TEXT, -- Digital signature for certificate
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason TEXT,
    expires_at TIMESTAMP WITH TIME ZONE, -- Some certificates may expire
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT certificates_revocation_check
        CHECK (
            (status != 'revoked') OR 
            (status = 'revoked' AND revoked_at IS NOT NULL AND revoked_reason IS NOT NULL)
        )
);

-- Enable RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Users can read their own certificates
DROP POLICY IF EXISTS "Users can read own certificates" ON public.certificates;
CREATE POLICY "Users can read own certificates" ON public.certificates
    FOR SELECT USING (auth.uid() = user_id);

-- Public can verify certificates (limited data)
DROP POLICY IF EXISTS "Public can verify certificates" ON public.certificates;
CREATE POLICY "Public can verify certificates" ON public.certificates
    FOR SELECT USING (status = 'active');

-- Only system can manage certificates
DROP POLICY IF EXISTS "System can manage certificates" ON public.certificates;
CREATE POLICY "System can manage certificates" ON public.certificates
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- HONOR CODE VIOLATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.honor_code_violations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
    violation_type TEXT CHECK (violation_type IN (
        'tab_switch', 'focus_loss', 'copy_paste', 'dev_tools', 
        'suspicious_timing', 'multiple_sessions', 'answer_pattern'
    )) NOT NULL,
    
    -- Violation details
    severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    -- Detection info
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_timestamp TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    
    -- Review status
    review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewed', 'dismissed', 'confirmed')),
    reviewed_by UUID,
    
    -- Add foreign key constraint for reviewed_by after table creation
    CONSTRAINT fk_honor_code_violations_reviewed_by 
        FOREIGN KEY (reviewed_by) 
        REFERENCES public.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.honor_code_violations ENABLE ROW LEVEL SECURITY;

-- Users can read their own violations
DROP POLICY IF EXISTS "Users can read own violations" ON public.honor_code_violations;
CREATE POLICY "Users can read own violations" ON public.honor_code_violations
    FOR SELECT USING (auth.uid() = user_id);

-- System can manage violations
DROP POLICY IF EXISTS "System can manage violations" ON public.honor_code_violations;
CREATE POLICY "System can manage violations" ON public.honor_code_violations
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- ASSESSMENT ENGINE FUNCTIONS
-- =====================================================

-- Function to create assessment session with security checks
CREATE OR REPLACE FUNCTION public.create_assessment_session(
    p_assessment_type TEXT,
    p_certification_level TEXT DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_client_fingerprint TEXT DEFAULT NULL
) RETURNS TABLE(
    session_id UUID,
    session_token TEXT,
    questions JSONB,
    time_limit_minutes INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_session_id UUID;
    v_session_token TEXT;
    v_user_id UUID := auth.uid();
    v_questions JSONB;
    v_time_limit INTEGER;
    v_question_count INTEGER;
    v_pass_threshold INTEGER;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_user_record RECORD;
    v_attempt_count INTEGER;
    v_last_attempt TIMESTAMP WITH TIME ZONE;
    v_cooldown_days INTEGER;
BEGIN
    -- Validate input
    IF p_assessment_type NOT IN ('practice', 'certification') THEN
        RAISE EXCEPTION 'Invalid assessment type: %', p_assessment_type;
    END IF;
    
    -- Get user details
    SELECT * INTO v_user_record FROM public.users WHERE id = v_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Check subscription for certification
    IF p_assessment_type = 'certification' THEN
        IF v_user_record.subscription_plan != 'pro' THEN
            RAISE EXCEPTION 'Certification assessments require pro subscription';
        END IF;
        
        IF p_certification_level IS NULL THEN
            RAISE EXCEPTION 'Certification level required for certification assessments';
        END IF;
        
        -- Check prerequisites
        IF NOT public.check_certification_prerequisites(v_user_id, p_certification_level) THEN
            RAISE EXCEPTION 'Prerequisites not met for certification level: %', p_certification_level;
        END IF;
        
        -- Check attempt limits and cooldown
        SELECT 
            max_attempts, cooldown_days, question_count, time_limit_minutes, pass_threshold
        INTO v_attempt_count, v_cooldown_days, v_question_count, v_time_limit, v_pass_threshold
        FROM public.certification_levels 
        WHERE level_code = p_certification_level AND active = true;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Certification level not found: %', p_certification_level;
        END IF;
        
        -- Count user's attempts for this level
        SELECT COUNT(*), MAX(completed_at)
        INTO v_attempt_count, v_last_attempt
        FROM public.certification_attempts
        WHERE user_id = v_user_id AND level_code = p_certification_level;
        
        -- Check if user has exceeded max attempts
        IF v_attempt_count >= (SELECT max_attempts FROM public.certification_levels WHERE level_code = p_certification_level) THEN
            RAISE EXCEPTION 'Maximum attempts exceeded for certification level: %', p_certification_level;
        END IF;
        
        -- Check cooldown period
        IF v_last_attempt IS NOT NULL AND v_last_attempt + (v_cooldown_days || ' days')::INTERVAL > NOW() THEN
            RAISE EXCEPTION 'Cooldown period active until: %', v_last_attempt + (v_cooldown_days || ' days')::INTERVAL;
        END IF;
        
    ELSE
        -- Practice assessment defaults
        v_question_count := 20;
        v_time_limit := 30;
        v_pass_threshold := NULL;
    END IF;
    
    -- Check for existing active sessions
    IF EXISTS (
        SELECT 1 FROM public.assessment_sessions 
        WHERE user_id = v_user_id 
        AND status IN ('active', 'paused') 
        AND expires_at > NOW()
    ) THEN
        RAISE EXCEPTION 'User already has an active assessment session';
    END IF;
    
    -- Generate secure session token
    v_session_token := encode(gen_random_bytes(32), 'base64');
    v_expires_at := NOW() + (v_time_limit || ' minutes')::INTERVAL;
    
    -- Get questions based on assessment type
    IF p_assessment_type = 'practice' THEN
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', q.id,
                'question_key', q.question_key,
                'question_text', q.question_text,
                'options', q.options,
                'question_format', q.question_format,
                'time_allocation_seconds', q.time_allocation_seconds,
                'points', q.points
            )
        ) INTO v_questions
        FROM (
            SELECT * FROM public.questions q
            JOIN public.assessment_categories ac ON q.category_id = ac.id
            WHERE q.active = true 
            AND q.question_type = 'practice'
            AND ac.active = true
            AND (p_category_id IS NULL OR q.category_id = p_category_id)
            ORDER BY RANDOM()
            LIMIT v_question_count
        ) q;
    ELSE
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', q.id,
                'question_key', q.question_key,
                'question_text', q.question_text,
                'options', q.options,
                'question_format', q.question_format,
                'time_allocation_seconds', q.time_allocation_seconds,
                'points', q.points
            )
        ) INTO v_questions
        FROM (
            SELECT * FROM public.questions
            WHERE active = true 
            AND question_type = 'certification'
            AND certification_level = p_certification_level
            ORDER BY difficulty_level, RANDOM()
            LIMIT v_question_count
        ) q;
    END IF;
    
    IF v_questions IS NULL OR jsonb_array_length(v_questions) = 0 THEN
        RAISE EXCEPTION 'No questions available for assessment';
    END IF;
    
    -- Create session
    INSERT INTO public.assessment_sessions (
        user_id,
        session_token,
        assessment_type,
        certification_level,
        category_id,
        total_questions,
        time_limit_minutes,
        pass_threshold,
        questions_data,
        expires_at,
        client_fingerprint,
        ip_address,
        user_agent,
        total_points_possible
    ) VALUES (
        v_user_id,
        v_session_token,
        p_assessment_type,
        p_certification_level,
        p_category_id,
        jsonb_array_length(v_questions),
        v_time_limit,
        v_pass_threshold,
        v_questions,
        v_expires_at,
        p_client_fingerprint,
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent',
        (SELECT SUM((q->>'points')::INTEGER) FROM jsonb_array_elements(v_questions) q)
    ) RETURNING id INTO v_session_id;
    
    -- Return session details
    RETURN QUERY
    SELECT 
        v_session_id,
        v_session_token,
        v_questions,
        v_time_limit,
        v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update assessment progress
CREATE OR REPLACE FUNCTION public.update_assessment_progress(
    p_session_token TEXT,
    p_question_id UUID,
    p_user_answer_index INTEGER,
    p_time_spent_seconds INTEGER DEFAULT NULL,
    p_focus_lost_count INTEGER DEFAULT 0,
    p_copy_paste_attempts INTEGER DEFAULT 0
) RETURNS TABLE(
    is_correct BOOLEAN,
    explanation TEXT,
    points_earned INTEGER,
    session_complete BOOLEAN
) AS $$
DECLARE
    v_session RECORD;
    v_question RECORD;
    v_is_correct BOOLEAN;
    v_points_earned INTEGER := 0;
    v_progress_id UUID;
    v_session_complete BOOLEAN := false;
    v_answered_count INTEGER;
BEGIN
    -- Get and validate session
    SELECT * INTO v_session
    FROM public.assessment_sessions
    WHERE session_token = p_session_token 
    AND user_id = auth.uid()
    AND status = 'active'
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired session';
    END IF;
    
    -- Get question details
    SELECT * INTO v_question
    FROM public.questions
    WHERE id = p_question_id AND active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Question not found';
    END IF;
    
    -- Validate answer
    v_is_correct := (p_user_answer_index = v_question.correct_answer_index);
    IF v_is_correct THEN
        v_points_earned := v_question.points;
    END IF;
    
    -- Insert or update progress
    INSERT INTO public.assessment_progress (
        session_id,
        question_id,
        question_index,
        user_answer_index,
        is_correct,
        points_earned,
        question_answered_at,
        time_spent_seconds,
        focus_lost_count,
        copy_paste_attempts
    ) VALUES (
        v_session.id,
        p_question_id,
        v_session.current_question_index,
        p_user_answer_index,
        v_is_correct,
        v_points_earned,
        NOW(),
        p_time_spent_seconds,
        p_focus_lost_count,
        p_copy_paste_attempts
    ) ON CONFLICT (session_id, question_id) DO UPDATE SET
        user_answer_index = EXCLUDED.user_answer_index,
        is_correct = EXCLUDED.is_correct,
        points_earned = EXCLUDED.points_earned,
        question_answered_at = EXCLUDED.question_answered_at,
        time_spent_seconds = EXCLUDED.time_spent_seconds,
        focus_lost_count = EXCLUDED.focus_lost_count,
        copy_paste_attempts = EXCLUDED.copy_paste_attempts,
        updated_at = NOW()
    RETURNING id INTO v_progress_id;
    
    -- Update session progress
    UPDATE public.assessment_sessions
    SET 
        current_question_index = LEAST(current_question_index + 1, total_questions),
        last_activity_at = NOW(),
        time_spent_seconds = time_spent_seconds + COALESCE(p_time_spent_seconds, 0),
        total_points_earned = (
            SELECT COALESCE(SUM(points_earned), 0)
            FROM public.assessment_progress
            WHERE session_id = v_session.id
        ),
        updated_at = NOW()
    WHERE id = v_session.id;
    
    -- Check if assessment is complete
    SELECT COUNT(*) INTO v_answered_count
    FROM public.assessment_progress
    WHERE session_id = v_session.id AND user_answer_index IS NOT NULL;
    
    v_session_complete := (v_answered_count >= v_session.total_questions);
    
    RETURN QUERY
    SELECT 
        v_is_correct,
        v_question.explanation,
        v_points_earned,
        v_session_complete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Assessment sessions indexes
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user_id ON public.assessment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_token ON public.assessment_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_status ON public.assessment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_expires_at ON public.assessment_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_type_level ON public.assessment_sessions(assessment_type, certification_level);

-- Assessment progress indexes
CREATE INDEX IF NOT EXISTS idx_assessment_progress_session_id ON public.assessment_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_assessment_progress_question_id ON public.assessment_progress(question_id);

-- Certificates indexes
CREATE INDEX IF NOT EXISTS idx_certificates_code ON public.certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_level ON public.certificates(certification_level);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificates(status);

-- Honor code violations indexes
CREATE INDEX IF NOT EXISTS idx_honor_code_violations_user_id ON public.honor_code_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_honor_code_violations_session_id ON public.honor_code_violations(session_id);
CREATE INDEX IF NOT EXISTS idx_honor_code_violations_type ON public.honor_code_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_honor_code_violations_severity ON public.honor_code_violations(severity);

-- =====================================================
-- AUDIT TRIGGERS
-- =====================================================

-- Add audit triggers (with safe drop pattern from migration_002)
DROP TRIGGER IF EXISTS assessment_sessions_audit_trigger ON public.assessment_sessions;
CREATE TRIGGER assessment_sessions_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.assessment_sessions
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS assessment_progress_audit_trigger ON public.assessment_progress;
CREATE TRIGGER assessment_progress_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.assessment_progress
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS certificates_audit_trigger ON public.certificates;
CREATE TRIGGER certificates_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.certificates
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS honor_code_violations_audit_trigger ON public.honor_code_violations;
CREATE TRIGGER honor_code_violations_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.honor_code_violations
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Add updated_at triggers (with safe drop pattern from migration_002)
DROP TRIGGER IF EXISTS update_assessment_sessions_updated_at ON public.assessment_sessions;
CREATE TRIGGER update_assessment_sessions_updated_at
    BEFORE UPDATE ON public.assessment_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_assessment_progress_updated_at ON public.assessment_progress;
CREATE TRIGGER update_assessment_progress_updated_at
    BEFORE UPDATE ON public.assessment_progress
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_certificates_updated_at ON public.certificates;
CREATE TRIGGER update_certificates_updated_at
    BEFORE UPDATE ON public.certificates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_honor_code_violations_updated_at ON public.honor_code_violations;
CREATE TRIGGER update_honor_code_violations_updated_at
    BEFORE UPDATE ON public.honor_code_violations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Commit the transaction
COMMIT;


-- ------------------------------------------
-- SECTION: migration_004_user_profiles.sql
-- ------------------------------------------
-- Migration 004: Enhanced User Profile Features
-- Adds public user ID, profile privacy settings, and additional profile fields

-- Add new columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS public_id VARCHAR(30) UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_is_public BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS website_url VARCHAR(500);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS github_url VARCHAR(500);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_public_id ON public.users(public_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_public ON public.users(profile_is_public) WHERE profile_is_public = true;

-- Create function to generate unique public ID
CREATE OR REPLACE FUNCTION generate_unique_public_id()
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    counter INTEGER := 0;
BEGIN
    LOOP
        -- Generate a random ID: user_ + 6 random characters
        new_id := 'user_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
        
        -- Check if it exists
        IF NOT EXISTS (SELECT 1 FROM public.users WHERE public_id = new_id) THEN
            RETURN new_id;
        END IF;
        
        counter := counter + 1;
        -- Prevent infinite loop
        IF counter > 100 THEN
            RAISE EXCEPTION 'Unable to generate unique public_id after 100 attempts';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to validate public ID format and content
CREATE OR REPLACE FUNCTION is_valid_public_id(id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check length (3-30 characters)
    IF LENGTH(id) < 3 OR LENGTH(id) > 30 THEN
        RETURN FALSE;
    END IF;
    
    -- Check format: alphanumeric, underscore, hyphen only
    IF id !~ '^[a-zA-Z0-9_-]+$' THEN
        RETURN FALSE;
    END IF;
    
    -- Must start with letter or number
    IF id !~ '^[a-zA-Z0-9]' THEN
        RETURN FALSE;
    END IF;
    
    -- Basic profanity filter (can be expanded)
    IF LOWER(id) ~ '(admin|root|null|undefined|fuck|shit|damn|hell|ass|sex|porn|xxx)' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate public_id before insert/update
CREATE OR REPLACE FUNCTION validate_public_id_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.public_id IS NOT NULL THEN
        IF NOT is_valid_public_id(NEW.public_id) THEN
            RAISE EXCEPTION 'Invalid public_id format. Must be 3-30 characters, alphanumeric with _ or -, and cannot contain inappropriate content.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS validate_public_id_trigger ON public.users;
CREATE TRIGGER validate_public_id_trigger
    BEFORE INSERT OR UPDATE OF public_id ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION validate_public_id_trigger();

-- Create user profile deletion log table for compliance
CREATE TABLE IF NOT EXISTS public.user_deletion_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    public_id TEXT,
    deletion_reason TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processed_by UUID,
    data_retention_until TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for user_deletion_log
ALTER TABLE public.user_deletion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deletion requests" ON public.user_deletion_log
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() IN (SELECT id FROM public.users WHERE subscription_tier = 'enterprise')
    );

CREATE POLICY "Users can create their own deletion requests" ON public.user_deletion_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update deletion requests" ON public.user_deletion_log
    FOR UPDATE USING (
        auth.uid() IN (SELECT id FROM public.users WHERE subscription_tier = 'enterprise')
    );

-- Create function to handle account deletion request
CREATE OR REPLACE FUNCTION request_account_deletion(deletion_reason TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    user_record RECORD;
    deletion_id UUID;
BEGIN
    -- Get user info
    SELECT * INTO user_record FROM public.users WHERE id = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Create deletion request
    INSERT INTO public.user_deletion_log (
        user_id, 
        user_email, 
        public_id, 
        deletion_reason,
        data_retention_until
    ) VALUES (
        user_record.id,
        user_record.email,
        user_record.public_id,
        deletion_reason,
        NOW() + INTERVAL '30 days'  -- GDPR requirement: 30 days to process
    ) RETURNING id INTO deletion_id;
    
    RETURN deletion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing users with generated public_ids if they don't have one
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM public.users WHERE public_id IS NULL
    LOOP
        UPDATE public.users 
        SET public_id = generate_unique_public_id()
        WHERE id = user_record.id;
    END LOOP;
END;
$$;

-- Add updated_at trigger for users table if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON COLUMN public.users.public_id IS 'Unique public identifier for user profiles, like Instagram username';
COMMENT ON COLUMN public.users.profile_is_public IS 'Whether the user profile is publicly visible';
COMMENT ON COLUMN public.users.date_of_birth IS 'User date of birth (optional)';
COMMENT ON COLUMN public.users.bio IS 'User biography/description (max 500 chars)';
COMMENT ON COLUMN public.users.location IS 'User location (city, country)';
COMMENT ON TABLE public.user_deletion_log IS 'Tracks account deletion requests for compliance';

-- Grant necessary permissions
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT ON public.user_deletion_log TO authenticated;
GRANT EXECUTE ON FUNCTION request_account_deletion TO authenticated;
GRANT EXECUTE ON FUNCTION generate_unique_public_id TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_public_id TO authenticated;


-- ------------------------------------------
-- SECTION: migration_004_enhanced_schema_v2.sql
-- ------------------------------------------
-- ReadyCheck AI - Migration 004: Enhanced Question Schema v2.0
-- Comprehensive database schema update for scalable question management
-- Security: Maintains all RLS policies, adds enhanced validation
-- Author: Database Specialist Migration v2.0
-- Date: 2025-09-18

-- Start transaction for atomic migration
BEGIN;

-- =====================================================
-- SCHEMA VERSION TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS public.schema_versions (
    id SERIAL PRIMARY KEY,
    version TEXT UNIQUE NOT NULL,
    description TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rollback_script TEXT
);

-- Track this migration
INSERT INTO public.schema_versions (version, description, rollback_script)
VALUES ('2.0.0', 'Enhanced Question Schema with v2.0 capabilities', 
'-- Rollback script for v2.0
DROP TABLE IF EXISTS public.question_analytics CASCADE;
ALTER TABLE public.questions DROP COLUMN IF EXISTS schema_version CASCADE;
ALTER TABLE public.questions DROP COLUMN IF EXISTS metadata_json CASCADE;
-- Additional rollback steps would be here
') ON CONFLICT (version) DO NOTHING;

-- =====================================================
-- ENHANCED QUESTIONS TABLE STRUCTURE
-- =====================================================

-- Add new columns for v2.0 schema
ALTER TABLE public.questions 
    ADD COLUMN IF NOT EXISTS schema_version TEXT DEFAULT '2.0.0',
    ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS question_format_v2 TEXT,
    ADD COLUMN IF NOT EXISTS category_primary TEXT,
    ADD COLUMN IF NOT EXISTS category_code_v2 TEXT,
    ADD COLUMN IF NOT EXISTS subcategory_array TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS skills_array TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS difficulty_level_text TEXT,
    ADD COLUMN IF NOT EXISTS difficulty_score INTEGER,
    ADD COLUMN IF NOT EXISTS complexity_factors TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS assessment_types TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS certification_levels_array TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS time_recommended INTEGER,
    ADD COLUMN IF NOT EXISTS time_adaptive BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS points_base INTEGER,
    ADD COLUMN IF NOT EXISTS points_bonus_config JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS content_v2 JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS explanation_v2 JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS business_context_v2 JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS media_elements JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS analytics_data JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS accessibility_config JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS localization_data JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS status_flags JSONB DEFAULT '{"active": true, "published": false, "featured": false}',
    ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS reviewed_by UUID,
    ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- ENHANCED QUESTION FORMATS ENUM
-- =====================================================
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.check_constraints 
               WHERE constraint_name = 'questions_question_format_check' 
               AND table_name = 'questions') THEN
        ALTER TABLE public.questions DROP CONSTRAINT questions_question_format_check;
    END IF;
    
    -- Add new comprehensive format constraint
    ALTER TABLE public.questions ADD CONSTRAINT questions_format_v2_check 
    CHECK (question_format_v2 IN (
        'single_choice', 'multiple_choice', 'true_false', 'fill_in_blank', 
        'essay', 'code_completion', 'drag_drop', 'matching', 'ranking', 
        'hotspot', 'simulation', 'case_study', 'scenario_based', 'interactive_demo'
    ));
END $$;

-- =====================================================
-- DIFFICULTY LEVEL CONSTRAINTS
-- =====================================================
ALTER TABLE public.questions ADD CONSTRAINT questions_difficulty_text_check 
CHECK (difficulty_level_text IN ('beginner', 'intermediate', 'advanced', 'expert'));

ALTER TABLE public.questions ADD CONSTRAINT questions_difficulty_score_check 
CHECK (difficulty_score BETWEEN 1 AND 10);

ALTER TABLE public.questions ADD CONSTRAINT questions_difficulty_alignment_check 
CHECK (
    (difficulty_level_text = 'beginner' AND difficulty_score BETWEEN 1 AND 3) OR
    (difficulty_level_text = 'intermediate' AND difficulty_score BETWEEN 4 AND 6) OR
    (difficulty_level_text = 'advanced' AND difficulty_score BETWEEN 7 AND 8) OR
    (difficulty_level_text = 'expert' AND difficulty_score BETWEEN 9 AND 10)
);

-- =====================================================
-- CATEGORY SYSTEM ENHANCEMENTS
-- =====================================================
ALTER TABLE public.questions ADD CONSTRAINT questions_category_primary_check 
CHECK (category_primary IN ('fundamentals', 'technical', 'business', 'ethics', 'general', 'specialized'));

-- =====================================================
-- TIME ALLOCATION CONSTRAINTS
-- =====================================================
ALTER TABLE public.questions ADD CONSTRAINT questions_time_allocation_check 
CHECK (time_allocation_seconds BETWEEN 30 AND 1800);

ALTER TABLE public.questions ADD CONSTRAINT questions_time_recommended_check 
CHECK (time_recommended BETWEEN 30 AND 1800);

-- =====================================================
-- POINTS SYSTEM CONSTRAINTS
-- =====================================================
ALTER TABLE public.questions ADD CONSTRAINT questions_points_base_check 
CHECK (points_base BETWEEN 1 AND 20);

-- =====================================================
-- REVIEW STATUS CONSTRAINTS
-- =====================================================
ALTER TABLE public.questions ADD CONSTRAINT questions_review_status_check 
CHECK (review_status IN ('draft', 'pending_review', 'approved', 'published', 'archived'));

-- =====================================================
-- DATA MIGRATION FROM V1 TO V2
-- =====================================================
DO $$
BEGIN
    -- Migrate existing data to v2.0 format
    UPDATE public.questions SET
        -- Schema version
        schema_version = '2.0.0',
        
        -- Metadata
        metadata_json = jsonb_build_object(
            'created_at', COALESCE(created_at, NOW()),
            'updated_at', COALESCE(updated_at, NOW()),
            'created_by', COALESCE(created_by::TEXT, 'migration_v2'),
            'review_status', CASE WHEN active THEN 'approved' ELSE 'draft' END,
            'revision_number', COALESCE(question_version, 1),
            'tags', ARRAY['migrated_from_v1']
        ),
        
        -- Question format migration
        question_format_v2 = CASE 
            WHEN question_format = 'single_choice' THEN 'single_choice'
            WHEN question_format = 'multiple_choice' THEN 'multiple_choice'
            WHEN question_format = 'multiple_select' THEN 'multiple_choice'
            WHEN question_format = 'case_study' THEN 'case_study'
            WHEN question_format = 'scenario_based' THEN 'scenario_based'
            ELSE 'single_choice'
        END,
        
        -- Category migration
        category_primary = CASE
            WHEN EXISTS (SELECT 1 FROM public.assessment_categories ac WHERE ac.id = questions.category_id AND ac.category_code IN ('fundamentals', 'ai_basics')) THEN 'fundamentals'
            WHEN EXISTS (SELECT 1 FROM public.assessment_categories ac WHERE ac.id = questions.category_id AND ac.category_code IN ('technical', 'ml_engineering')) THEN 'technical'
            WHEN EXISTS (SELECT 1 FROM public.assessment_categories ac WHERE ac.id = questions.category_id AND ac.category_code IN ('business', 'business_strategy')) THEN 'business'
            WHEN EXISTS (SELECT 1 FROM public.assessment_categories ac WHERE ac.id = questions.category_id AND ac.category_code IN ('ethics', 'ai_ethics')) THEN 'ethics'
            ELSE 'general'
        END,
        
        category_code_v2 = COALESCE(
            (SELECT ac.category_code FROM public.assessment_categories ac WHERE ac.id = questions.category_id),
            'general'
        ),
        
        -- Enhanced arrays
        subcategory_array = COALESCE(subcategory_tags, '{}'),
        skills_array = COALESCE(skill_competencies, '{}'),
        
        -- Difficulty mapping
        difficulty_level_text = CASE
            WHEN difficulty_level BETWEEN 1 AND 3 THEN 'beginner'
            WHEN difficulty_level BETWEEN 4 AND 6 THEN 'intermediate'
            WHEN difficulty_level BETWEEN 7 AND 8 THEN 'advanced'
            WHEN difficulty_level BETWEEN 9 AND 10 THEN 'expert'
            ELSE 'beginner'
        END,
        
        difficulty_score = COALESCE(difficulty_level, complexity_score, 1),
        
        complexity_factors = CASE
            WHEN question_format = 'case_study' THEN ARRAY['multi_step', 'requires_analysis']
            WHEN time_allocation_seconds > 300 THEN ARRAY['time_pressure']
            WHEN business_context IS NOT NULL AND length(business_context) > 100 THEN ARRAY['industry_specific']
            ELSE ARRAY[]::TEXT[]
        END,
        
        -- Assessment configuration
        assessment_types = CASE WHEN question_type IS NOT NULL THEN ARRAY[question_type] ELSE ARRAY['practice'] END,
        certification_levels_array = CASE WHEN certification_level IS NOT NULL THEN ARRAY[certification_level] ELSE ARRAY[]::TEXT[] END,
        
        -- Time allocation
        time_recommended = GREATEST(30, LEAST(1800, COALESCE(time_allocation_seconds, 90))),
        
        -- Points system
        points_base = GREATEST(1, LEAST(20, COALESCE(points, 1))),
        
        -- Content structure (v2 format)
        content_v2 = CASE
            WHEN question_format_v2 = 'single_choice' THEN
                jsonb_build_object(
                    'options', COALESCE(
                        (SELECT jsonb_agg(
                            jsonb_build_object(
                                'id', chr(65 + (ordinality - 1)),
                                'text', value::TEXT
                            ) ORDER BY ordinality
                        ) FROM jsonb_array_elements(options) WITH ORDINALITY),
                        '[{"id": "A", "text": "Option A"}, {"id": "B", "text": "Option B"}]'::jsonb
                    ),
                    'correct_answer', jsonb_build_object(
                        'option_id', chr(65 + COALESCE(correct_answer_index, 0)),
                        'explanation', COALESCE(correct_answer_text, explanation, 'Explanation not provided')
                    ),
                    'randomize_options', true
                )
            WHEN question_format_v2 = 'case_study' THEN
                jsonb_build_object(
                    'scenario', jsonb_build_object(
                        'title', COALESCE(split_part(question_text, '.', 1), 'Case Study'),
                        'situation_description', question_text,
                        'data_provided', COALESCE(case_study_materials, '[]'::jsonb)
                    ),
                    'questions', jsonb_build_array(
                        jsonb_build_object(
                            'question', question_text,
                            'question_type', 'analysis',
                            'expected_approach', 'Apply knowledge from scenario context'
                        )
                    )
                )
            ELSE
                jsonb_build_object(
                    'options', COALESCE(options, '[{"id": "A", "text": "True"}, {"id": "B", "text": "False"}]'::jsonb),
                    'correct_answer', jsonb_build_object(
                        'option_id', chr(65 + COALESCE(correct_answer_index, 0)),
                        'explanation', COALESCE(explanation, 'Explanation not provided')
                    )
                )
        END,
        
        -- Enhanced explanation
        explanation_v2 = jsonb_build_object(
            'correct_answer_explanation', COALESCE(explanation, 'Explanation not provided'),
            'learning_resources', '[]'::jsonb
        ),
        
        -- Enhanced business context
        business_context_v2 = jsonb_build_object(
            'real_world_application', COALESCE(business_context, 'Real-world application not specified'),
            'industry_relevance', COALESCE(industry_tags, ARRAY['general']),
            'impact_level', CASE
                WHEN difficulty_level >= 8 THEN 'critical'
                WHEN difficulty_level >= 6 THEN 'high'
                WHEN difficulty_level >= 3 THEN 'medium'
                ELSE 'low'
            END
        ),
        
        -- Analytics data
        analytics_data = jsonb_build_object(
            'learning_objectives', COALESCE(skill_competencies, ARRAY[]::TEXT[]),
            'bloom_taxonomy_level', CASE
                WHEN lower(question_text) LIKE '%create%' OR lower(question_text) LIKE '%design%' THEN 'create'
                WHEN lower(question_text) LIKE '%evaluate%' OR lower(question_text) LIKE '%assess%' THEN 'evaluate'
                WHEN lower(question_text) LIKE '%analyze%' OR lower(question_text) LIKE '%compare%' THEN 'analyze'
                WHEN lower(question_text) LIKE '%apply%' OR lower(question_text) LIKE '%implement%' THEN 'apply'
                WHEN lower(question_text) LIKE '%explain%' OR lower(question_text) LIKE '%describe%' THEN 'understand'
                ELSE 'remember'
            END
        ),
        
        -- Accessibility configuration
        accessibility_config = jsonb_build_object(
            'screen_reader_text', 'Question with ' || 
                CASE WHEN question_format_v2 = 'single_choice' THEN 'single choice options'
                     WHEN question_format_v2 = 'multiple_choice' THEN 'multiple choice options'
                     WHEN question_format_v2 = 'case_study' THEN 'case study content'
                     ELSE 'interactive elements'
                END,
            'keyboard_navigation', true,
            'high_contrast_compatible', true
        ),
        
        -- Localization
        localization_data = jsonb_build_object(
            'primary_language', 'en'
        ),
        
        -- Status flags
        status_flags = jsonb_build_object(
            'active', COALESCE(active, true),
            'published', COALESCE(active, false),
            'archived', false,
            'featured', false
        ),
        
        -- Review information
        review_status = CASE WHEN COALESCE(active, false) THEN 'approved' ELSE 'draft' END,
        revision_number = COALESCE(question_version, 1)
        
    WHERE schema_version IS NULL OR schema_version != '2.0.0';
    
    RAISE NOTICE 'Migration completed for % questions', (SELECT COUNT(*) FROM public.questions WHERE schema_version = '2.0.0');
END $$;

-- =====================================================
-- QUESTION ANALYTICS VIEW
-- =====================================================
CREATE OR REPLACE VIEW public.question_analytics_v2 AS
SELECT 
    q.id,
    q.question_key,
    q.question_format_v2,
    q.category_primary,
    q.difficulty_level_text,
    q.difficulty_score,
    q.points_base,
    q.assessment_types,
    q.status_flags,
    q.review_status,
    -- Extract analytics from JSONB
    (q.analytics_data->>'bloom_taxonomy_level') as bloom_level,
    jsonb_array_length(q.analytics_data->'learning_objectives') as objective_count,
    -- Performance metrics (to be populated by usage data)
    0 as total_attempts,
    0 as correct_attempts,
    0.0 as success_rate,
    0 as average_time_spent,
    q.created_at,
    q.updated_at
FROM public.questions q
WHERE q.schema_version = '2.0.0';

-- =====================================================
-- ENHANCED INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_questions_schema_version ON public.questions(schema_version);
CREATE INDEX IF NOT EXISTS idx_questions_format_v2 ON public.questions(question_format_v2);
CREATE INDEX IF NOT EXISTS idx_questions_category_primary ON public.questions(category_primary);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty_text ON public.questions(difficulty_level_text);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty_score ON public.questions(difficulty_score);
CREATE INDEX IF NOT EXISTS idx_questions_assessment_types ON public.questions USING GIN(assessment_types);
CREATE INDEX IF NOT EXISTS idx_questions_certification_levels ON public.questions USING GIN(certification_levels_array);
CREATE INDEX IF NOT EXISTS idx_questions_subcategories ON public.questions USING GIN(subcategory_array);
CREATE INDEX IF NOT EXISTS idx_questions_skills ON public.questions USING GIN(skills_array);
CREATE INDEX IF NOT EXISTS idx_questions_status_flags ON public.questions USING GIN(status_flags);
CREATE INDEX IF NOT EXISTS idx_questions_review_status ON public.questions(review_status);
CREATE INDEX IF NOT EXISTS idx_questions_content_v2 ON public.questions USING GIN(content_v2);

-- =====================================================
-- RLS POLICIES FOR V2 SCHEMA
-- =====================================================
-- Enable RLS (if not already enabled)
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "questions_select_policy" ON public.questions;
DROP POLICY IF EXISTS "questions_insert_policy" ON public.questions;
DROP POLICY IF EXISTS "questions_update_policy" ON public.questions;

-- Select policy: Users can see active published questions or their own questions
CREATE POLICY "questions_v2_select_policy" ON public.questions
    FOR SELECT 
    USING (
        (status_flags->>'active')::BOOLEAN = true 
        AND (status_flags->>'published')::BOOLEAN = true
        OR created_by = auth.uid()
        OR auth.role() = 'service_role'
    );

-- Insert policy: Authenticated users can create questions
CREATE POLICY "questions_v2_insert_policy" ON public.questions
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated' 
        AND created_by = auth.uid()
    );

-- Update policy: Users can update their own questions or service role can update any
CREATE POLICY "questions_v2_update_policy" ON public.questions
    FOR UPDATE 
    USING (
        created_by = auth.uid() 
        OR auth.role() = 'service_role'
    );

-- =====================================================
-- VALIDATION FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION public.validate_question_v2(question_data JSONB) 
RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    validation_result JSONB := '{"valid": true, "errors": []}'::JSONB;
    error_msg TEXT;
BEGIN
    -- Validate required fields
    IF NOT (question_data ? 'question_key') THEN
        validation_result := jsonb_set(validation_result, '{valid}', 'false');
        validation_result := jsonb_set(validation_result, '{errors}', 
            (validation_result->'errors') || '["Missing required field: question_key"]'::JSONB);
    END IF;
    
    IF NOT (question_data ? 'question_text') THEN
        validation_result := jsonb_set(validation_result, '{valid}', 'false');
        validation_result := jsonb_set(validation_result, '{errors}', 
            (validation_result->'errors') || '["Missing required field: question_text"]'::JSONB);
    END IF;
    
    -- Validate question key format
    IF question_data ? 'question_key' AND NOT (question_data->>'question_key' ~ '^[A-Z]{2,4}_[A-Z0-9]+_\d{3,6}$') THEN
        validation_result := jsonb_set(validation_result, '{valid}', 'false');
        validation_result := jsonb_set(validation_result, '{errors}', 
            (validation_result->'errors') || '["Invalid question_key format. Use: PREFIX_CATEGORY_NUMBER"]'::JSONB);
    END IF;
    
    -- Validate difficulty alignment
    IF question_data ? 'difficulty' THEN
        DECLARE
            difficulty_level TEXT := question_data->'difficulty'->>'level';
            difficulty_score INTEGER := (question_data->'difficulty'->>'score')::INTEGER;
        BEGIN
            IF (difficulty_level = 'beginner' AND (difficulty_score < 1 OR difficulty_score > 3)) OR
               (difficulty_level = 'intermediate' AND (difficulty_score < 4 OR difficulty_score > 6)) OR
               (difficulty_level = 'advanced' AND (difficulty_score < 7 OR difficulty_score > 8)) OR
               (difficulty_level = 'expert' AND (difficulty_score < 9 OR difficulty_score > 10)) THEN
                validation_result := jsonb_set(validation_result, '{valid}', 'false');
                validation_result := jsonb_set(validation_result, '{errors}', 
                    (validation_result->'errors') || 
                    ('["Difficulty level ' || difficulty_level || ' does not align with score ' || difficulty_score::TEXT || '"]')::JSONB);
            END IF;
        END;
    END IF;
    
    RETURN validation_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN '{"valid": false, "errors": ["Validation function error: ' || SQLERRM || '"]}'::JSONB;
END;
$$;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_questions_by_criteria_v2(
    p_category_primary TEXT DEFAULT NULL,
    p_difficulty_level TEXT DEFAULT NULL,
    p_question_format TEXT DEFAULT NULL,
    p_assessment_type TEXT DEFAULT NULL,
    p_certification_level TEXT DEFAULT NULL,
    p_active_only BOOLEAN DEFAULT TRUE,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    question_id UUID,
    question_key TEXT,
    question_text TEXT,
    question_format TEXT,
    difficulty_level TEXT,
    difficulty_score INTEGER,
    time_allocation INTEGER,
    points INTEGER,
    content JSONB,
    explanation JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.question_key,
        q.question_text,
        q.question_format_v2,
        q.difficulty_level_text,
        q.difficulty_score,
        q.time_allocation_seconds,
        q.points_base,
        q.content_v2,
        q.explanation_v2
    FROM public.questions q
    WHERE 
        (p_category_primary IS NULL OR q.category_primary = p_category_primary)
        AND (p_difficulty_level IS NULL OR q.difficulty_level_text = p_difficulty_level)
        AND (p_question_format IS NULL OR q.question_format_v2 = p_question_format)
        AND (p_assessment_type IS NULL OR p_assessment_type = ANY(q.assessment_types))
        AND (p_certification_level IS NULL OR p_certification_level = ANY(q.certification_levels_array))
        AND (NOT p_active_only OR (q.status_flags->>'active')::BOOLEAN = true)
        AND q.schema_version = '2.0.0'
    ORDER BY q.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- =====================================================
-- COMMIT TRANSACTION
-- =====================================================
COMMIT;

-- Final validation
DO $$
DECLARE
    v2_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v2_count FROM public.questions WHERE schema_version = '2.0.0';
    SELECT COUNT(*) INTO total_count FROM public.questions;
    
    RAISE NOTICE '=== MIGRATION 004 COMPLETED SUCCESSFULLY ===';
    RAISE NOTICE 'Questions migrated to v2.0: %', v2_count;
    RAISE NOTICE 'Total questions in database: %', total_count;
    RAISE NOTICE 'Migration success rate: %', ROUND((v2_count::DECIMAL / GREATEST(total_count, 1)) * 100, 2);
    RAISE NOTICE '================================================';
END $$;


-- ------------------------------------------
-- SECTION: migration_004_production_analytics.sql
-- ------------------------------------------
-- ReadyCheck AI - Phase 6: Production Analytics and Monitoring
-- Migration 004: Analytics tables, monitoring, and certificate verification
-- Security: Rate limiting, audit trails, performance monitoring
-- Author: System Migration - Phase 6
-- Date: 2025-08-29

BEGIN;

-- ============================================================================
-- ANALYTICS AND MONITORING TABLES
-- ============================================================================

-- User Analytics Table
CREATE TABLE IF NOT EXISTS public.user_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'login', 'logout', 'assessment_start', 'assessment_complete', 
        'certificate_earned', 'subscription_upgrade', 'subscription_downgrade',
        'question_answered', 'honor_code_violation', 'payment_completed'
    )),
    event_data JSONB NOT NULL DEFAULT '{}',
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Business Metrics Table
CREATE TABLE IF NOT EXISTS public.business_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type TEXT NOT NULL CHECK (metric_type IN (
        'revenue', 'conversion', 'retention', 'engagement', 'certification_rate',
        'question_difficulty', 'honor_code_stats', 'performance'
    )),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    dimensions JSONB NOT NULL DEFAULT '{}',
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- API Performance Monitoring
CREATE TABLE IF NOT EXISTS public.api_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    response_time_ms INTEGER NOT NULL,
    status_code INTEGER NOT NULL,
    user_id UUID REFERENCES public.users(id),
    session_id TEXT,
    error_message TEXT,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rate Limiting Table
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL, -- IP address or user ID
    identifier_type TEXT NOT NULL CHECK (identifier_type IN ('ip', 'user', 'api_key')),
    endpoint TEXT NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    window_duration_seconds INTEGER NOT NULL DEFAULT 3600,
    limit_exceeded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CERTIFICATE VERIFICATION SYSTEM
-- ============================================================================

-- Enhanced Certificates Table
CREATE TABLE IF NOT EXISTS public.certificate_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
    verification_code TEXT NOT NULL UNIQUE,
    qr_code_url TEXT,
    digital_signature TEXT NOT NULL,
    public_key_id TEXT NOT NULL,
    verification_count INTEGER NOT NULL DEFAULT 0,
    last_verified_at TIMESTAMPTZ,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Certificate Access Log
CREATE TABLE IF NOT EXISTS public.certificate_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
    verification_code TEXT NOT NULL,
    accessor_ip INET,
    accessor_user_agent TEXT,
    verification_method TEXT CHECK (verification_method IN ('qr_code', 'manual_entry', 'api', 'employer_portal')),
    verification_result TEXT CHECK (verification_result IN ('valid', 'invalid', 'revoked', 'expired')),
    accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ADMIN MANAGEMENT TABLES
-- ============================================================================

-- Admin Users Table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator', 'support')),
    permissions JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Question Management Audit
CREATE TABLE IF NOT EXISTS public.question_management_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
    admin_user_id UUID NOT NULL REFERENCES public.admin_users(id),
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'activate', 'deactivate', 'bulk_import')),
    old_data JSONB,
    new_data JSONB,
    change_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Honor Code Violation Reviews
CREATE TABLE IF NOT EXISTS public.honor_code_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    violation_id UUID NOT NULL REFERENCES public.honor_code_violations(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.admin_users(id),
    review_status TEXT NOT NULL CHECK (review_status IN ('pending', 'confirmed', 'dismissed', 'escalated')),
    review_notes TEXT,
    action_taken TEXT,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PERFORMANCE OPTIMIZATION TABLES
-- ============================================================================

-- Question Performance Cache
CREATE TABLE IF NOT EXISTS public.question_performance_cache (
    question_id UUID PRIMARY KEY REFERENCES public.questions(id) ON DELETE CASCADE,
    total_attempts INTEGER NOT NULL DEFAULT 0,
    correct_attempts INTEGER NOT NULL DEFAULT 0,
    average_time_seconds NUMERIC(10,2) NOT NULL DEFAULT 0,
    difficulty_score NUMERIC(3,2) NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Performance Cache
CREATE TABLE IF NOT EXISTS public.user_performance_cache (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    total_assessments INTEGER NOT NULL DEFAULT 0,
    total_certifications INTEGER NOT NULL DEFAULT 0,
    average_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    practice_streak_days INTEGER NOT NULL DEFAULT 0,
    last_activity TIMESTAMPTZ,
    performance_trend JSONB NOT NULL DEFAULT '{}',
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_event 
ON public.user_analytics(user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_analytics_session 
ON public.user_analytics(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_business_metrics_type_period 
ON public.business_metrics(metric_type, period_start, period_end);

-- Performance Monitoring Indexes
CREATE INDEX IF NOT EXISTS idx_api_performance_endpoint_time 
ON public.api_performance(endpoint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_performance_status_time 
ON public.api_performance(status_code, created_at DESC) 
WHERE status_code >= 400;

-- Rate Limiting Indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint 
ON public.rate_limits(identifier, endpoint, window_start DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup 
ON public.rate_limits(window_start);

-- Certificate Verification Indexes
CREATE INDEX IF NOT EXISTS idx_certificate_verification_code 
ON public.certificate_verification(verification_code);

CREATE INDEX IF NOT EXISTS idx_certificate_access_log_code_time 
ON public.certificate_access_log(verification_code, accessed_at DESC);

-- Admin Management Indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_role_active 
ON public.admin_users(role, is_active);

CREATE INDEX IF NOT EXISTS idx_question_audit_question_time 
ON public.question_management_audit(question_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_management_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.honor_code_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_performance_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_performance_cache ENABLE ROW LEVEL SECURITY;

-- User Analytics Policies
DROP POLICY IF EXISTS "Users can view own analytics" ON public.user_analytics;
CREATE POLICY "Users can view own analytics" ON public.user_analytics
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage analytics" ON public.user_analytics;
CREATE POLICY "Service role can manage analytics" ON public.user_analytics
    FOR ALL USING (auth.role() = 'service_role');

-- Business Metrics Policies (Admin only)
DROP POLICY IF EXISTS "Admin can view business metrics" ON public.business_metrics;
CREATE POLICY "Admin can view business metrics" ON public.business_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au 
            JOIN public.users u ON au.user_id = u.id 
            WHERE u.id = auth.uid() AND au.is_active = true
        )
    );

-- Certificate Verification Policies (Public read for verification)
DROP POLICY IF EXISTS "Public can verify certificates" ON public.certificate_verification;
CREATE POLICY "Public can verify certificates" ON public.certificate_verification
    FOR SELECT USING (NOT is_revoked);

DROP POLICY IF EXISTS "Certificate access logging" ON public.certificate_access_log;
CREATE POLICY "Certificate access logging" ON public.certificate_access_log
    FOR INSERT WITH CHECK (true);

-- Admin Policies
DROP POLICY IF EXISTS "Admin users can view admin data" ON public.admin_users;
CREATE POLICY "Admin users can view admin data" ON public.admin_users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au 
            JOIN public.users u ON au.user_id = u.id 
            WHERE u.id = auth.uid() AND au.is_active = true
        )
    );

-- Performance Cache Policies
DROP POLICY IF EXISTS "Users can view own performance cache" ON public.user_performance_cache;
CREATE POLICY "Users can view own performance cache" ON public.user_performance_cache
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view question performance" ON public.question_performance_cache;
CREATE POLICY "Public can view question performance" ON public.question_performance_cache
    FOR SELECT USING (true);

-- ============================================================================
-- FUNCTIONS FOR ANALYTICS AND MONITORING
-- ============================================================================

-- Function to record user analytics
CREATE OR REPLACE FUNCTION public.record_user_analytics(
    p_user_id UUID,
    p_event_type TEXT,
    p_event_data JSONB DEFAULT '{}',
    p_session_id TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_referrer TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_analytics_id UUID;
BEGIN
    INSERT INTO public.user_analytics (
        user_id, event_type, event_data, session_id, 
        ip_address, user_agent, referrer
    ) VALUES (
        p_user_id, p_event_type, p_event_data, p_session_id,
        p_ip_address, p_user_agent, p_referrer
    ) RETURNING id INTO v_analytics_id;
    
    RETURN v_analytics_id;
END;
$$;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_identifier TEXT,
    p_identifier_type TEXT,
    p_endpoint TEXT,
    p_limit INTEGER DEFAULT 100,
    p_window_seconds INTEGER DEFAULT 3600
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_count INTEGER;
    v_window_start TIMESTAMPTZ;
BEGIN
    v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;
    
    -- Clean up old entries
    DELETE FROM public.rate_limits 
    WHERE window_start < v_window_start;
    
    -- Get current count for this identifier/endpoint combination
    SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
    FROM public.rate_limits
    WHERE identifier = p_identifier 
    AND endpoint = p_endpoint 
    AND window_start >= v_window_start;
    
    -- Check if limit exceeded
    IF v_current_count >= p_limit THEN
        -- Update limit exceeded timestamp
        UPDATE public.rate_limits 
        SET limit_exceeded_at = NOW()
        WHERE identifier = p_identifier 
        AND endpoint = p_endpoint 
        AND limit_exceeded_at IS NULL;
        
        RETURN FALSE;
    END IF;
    
    -- Record this request
    INSERT INTO public.rate_limits (
        identifier, identifier_type, endpoint, request_count, window_start
    ) VALUES (
        p_identifier, p_identifier_type, p_endpoint, 1, NOW()
    ) ON CONFLICT (identifier, endpoint, window_start) 
    DO UPDATE SET 
        request_count = public.rate_limits.request_count + 1,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$;

-- Function to generate certificate verification code
CREATE OR REPLACE FUNCTION public.generate_certificate_verification(
    p_certificate_id UUID,
    p_digital_signature TEXT,
    p_public_key_id TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_verification_code TEXT;
    v_qr_code_url TEXT;
BEGIN
    -- Generate unique verification code
    v_verification_code := 'RC-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8)) || 
                          '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));
    
    -- Generate QR code URL (placeholder - implement with actual QR service)
    v_qr_code_url := 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' || 
                     'https://readycheck.ai/verify/' || v_verification_code;
    
    INSERT INTO public.certificate_verification (
        certificate_id, verification_code, qr_code_url, 
        digital_signature, public_key_id
    ) VALUES (
        p_certificate_id, v_verification_code, v_qr_code_url,
        p_digital_signature, p_public_key_id
    );
    
    RETURN v_verification_code;
END;
$$;

-- Function to update performance caches
CREATE OR REPLACE FUNCTION public.update_performance_caches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update question performance cache
    INSERT INTO public.question_performance_cache (
        question_id, total_attempts, correct_attempts, 
        average_time_seconds, difficulty_score, last_updated
    )
    SELECT 
        q.id,
        COALESCE(qa.total_attempts, 0),
        COALESCE(qa.correct_attempts, 0),
        COALESCE(qa.avg_time, q.time_allocation_seconds),
        CASE 
            WHEN qa.total_attempts > 0 THEN 
                1.0 - (qa.correct_attempts::NUMERIC / qa.total_attempts)
            ELSE q.complexity_score
        END,
        NOW()
    FROM public.questions q
    LEFT JOIN (
        SELECT 
            question_id,
            COUNT(*) as total_attempts,
            SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_attempts,
            AVG(time_spent_seconds) as avg_time
        FROM public.assessment_answers aa
        JOIN public.assessment_sessions asess ON aa.session_id = asess.id
        WHERE asess.status = 'completed'
        GROUP BY question_id
    ) qa ON q.id = qa.question_id
    ON CONFLICT (question_id) DO UPDATE SET
        total_attempts = EXCLUDED.total_attempts,
        correct_attempts = EXCLUDED.correct_attempts,
        average_time_seconds = EXCLUDED.average_time_seconds,
        difficulty_score = EXCLUDED.difficulty_score,
        last_updated = NOW();
    
    -- Update user performance cache
    INSERT INTO public.user_performance_cache (
        user_id, total_assessments, total_certifications,
        average_score, practice_streak_days, last_activity, last_updated
    )
    SELECT 
        u.id,
        COALESCE(up.total_assessments, 0),
        COALESCE(up.total_certifications, 0),
        COALESCE(up.avg_score, 0),
        COALESCE(up.streak_days, 0),
        up.last_activity,
        NOW()
    FROM public.users u
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(CASE WHEN assessment_type = 'practice' THEN 1 END) + 
            COUNT(CASE WHEN assessment_type = 'certification' THEN 1 END) as total_assessments,
            COUNT(CASE WHEN assessment_type = 'certification' AND passed = true THEN 1 END) as total_certifications,
            AVG(score) as avg_score,
            -- Calculate practice streak (simplified)
            CASE 
                WHEN MAX(completed_at) >= CURRENT_DATE - INTERVAL '1 day' THEN
                    (SELECT COUNT(DISTINCT DATE(completed_at)) 
                     FROM public.assessment_sessions s2 
                     WHERE s2.user_id = s1.user_id 
                     AND s2.assessment_type = 'practice'
                     AND s2.completed_at >= CURRENT_DATE - INTERVAL '30 days')
                ELSE 0
            END as streak_days,
            MAX(completed_at) as last_activity
        FROM public.assessment_sessions s1
        WHERE status = 'completed'
        GROUP BY user_id
    ) up ON u.id = up.user_id
    ON CONFLICT (user_id) DO UPDATE SET
        total_assessments = EXCLUDED.total_assessments,
        total_certifications = EXCLUDED.total_certifications,
        average_score = EXCLUDED.average_score,
        practice_streak_days = EXCLUDED.practice_streak_days,
        last_activity = EXCLUDED.last_activity,
        last_updated = NOW();
END;
$$;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Trigger to update performance caches when assessments complete
CREATE OR REPLACE FUNCTION public.trigger_update_performance_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update caches asynchronously (in production, use a job queue)
    PERFORM public.update_performance_caches();
    RETURN NEW;
END;
$$;

CREATE TRIGGER assessment_completion_cache_update
    AFTER UPDATE OF status ON public.assessment_sessions
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION public.trigger_update_performance_cache();

-- Trigger for certificate verification generation
CREATE OR REPLACE FUNCTION public.trigger_certificate_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_verification_code TEXT;
BEGIN
    -- Generate verification code for new certificates
    v_verification_code := public.generate_certificate_verification(
        NEW.id,
        'digital_signature_placeholder', -- Replace with actual signing
        'public_key_1' -- Replace with actual key management
    );
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER certificate_verification_generation
    AFTER INSERT ON public.certificates
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_certificate_verification();

COMMIT;


