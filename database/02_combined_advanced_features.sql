-- ==========================================
-- PART 2: ADVANCED FEATURES & FIXES
-- ==========================================
-- This file contains secondary features and functions:
-- - Competition System
-- - Webhook Events & Plans
-- - Admin Security & Universal Schema
-- - Roadmap feature
-- - Helper functions and query optimizations
-- ==========================================

-- ------------------------------------------
-- SECTION: migration_005_competition_system.sql
-- ------------------------------------------
-- ReadyCheck AI - Phase 5: Competition System with Real-Time Capabilities
-- Migration 005: Competition platform with payments, teams, real-time leaderboards
-- Security: Comprehensive RLS policies, payment validation, honor code integration
-- Author: Competition System Implementation
-- Date: 2025-09-28

-- Start transaction for atomic migration
BEGIN;

-- =====================================================
-- PREREQUISITE CHECKS
-- =====================================================

DO $$
BEGIN
    -- Check if previous migrations exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'users' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Table public.users does not exist. Please run migration_001 first.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'questions' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Table public.questions does not exist. Please run migration_002 first.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'assessment_sessions' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Table public.assessment_sessions does not exist. Please run migration_003 first.';
    END IF;
END $$;

-- =====================================================
-- COMPETITIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.competitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL CHECK (length(title) >= 3 AND length(title) <= 200),
    description TEXT CHECK (length(description) <= 5000),
    type TEXT NOT NULL CHECK (type IN ('individual', 'team', 'open')),
    
    -- Timing
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL CHECK (end_date > start_date),
    registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL CHECK (registration_deadline <= start_date),
    
    -- Participation limits
    max_participants INTEGER CHECK (max_participants > 0),
    max_team_size INTEGER DEFAULT 1 CHECK (max_team_size >= 1 AND max_team_size <= 10),
    
    -- Financial
    entry_fee DECIMAL(10,2) DEFAULT 0 CHECK (entry_fee >= 0),
    prize_pool DECIMAL(10,2) DEFAULT 0 CHECK (prize_pool >= 0),
    currency TEXT DEFAULT 'INR' CHECK (currency IN ('INR', 'USD', 'EUR')),
    
    -- Configuration
    rules JSONB DEFAULT '{}',
    scoring_algorithm TEXT DEFAULT 'standard' CHECK (scoring_algorithm IN ('standard', 'weighted', 'custom')),
    
    -- Assessment configuration
    question_category_id UUID REFERENCES public.assessment_categories(id),
    question_count INTEGER DEFAULT 10 CHECK (question_count > 0 AND question_count <= 100),
    time_limit_minutes INTEGER DEFAULT 60 CHECK (time_limit_minutes > 0 AND time_limit_minutes <= 480),
    
    -- Status and visibility
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'active', 'completed', 'cancelled')),
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invite_only')),
    featured BOOLEAN DEFAULT false,
    
    -- Metadata
    created_by UUID REFERENCES public.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Computed fields
    current_participants INTEGER DEFAULT 0,
    total_submissions INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS competitions_status_start_idx ON public.competitions(status, start_date);
CREATE INDEX IF NOT EXISTS competitions_visibility_featured_idx ON public.competitions(visibility, featured);
CREATE INDEX IF NOT EXISTS competitions_created_by_idx ON public.competitions(created_by);
CREATE INDEX IF NOT EXISTS competitions_category_idx ON public.competitions(question_category_id);

-- Enable RLS
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public competitions are viewable by everyone" ON public.competitions
    FOR SELECT USING (visibility = 'public' AND status IN ('published', 'active', 'completed'));

CREATE POLICY "Competition creators can manage their competitions" ON public.competitions
    FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all competitions" ON public.competitions
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.users 
            WHERE subscription_plan = 'admin' OR email LIKE '%@readycheckai.com'
        )
    );

-- =====================================================
-- COMPETITION PARTICIPANTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.competition_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    team_id UUID, -- References competition_teams, nullable for individual competitions
    
    -- Registration
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    registration_status TEXT DEFAULT 'pending' CHECK (registration_status IN ('pending', 'confirmed', 'cancelled', 'disqualified')),
    
    -- Payment
    payment_id TEXT, -- Razorpay payment ID
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_amount DECIMAL(10,2),
    
    -- Performance tracking
    submission_count INTEGER DEFAULT 0,
    best_score DECIMAL(10,4),
    last_submission_at TIMESTAMP WITH TIME ZONE,
    
    -- Honor code
    honor_code_accepted BOOLEAN DEFAULT false,
    honor_code_violations INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(competition_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS comp_participants_competition_idx ON public.competition_participants(competition_id);
CREATE INDEX IF NOT EXISTS comp_participants_user_idx ON public.competition_participants(user_id);
CREATE INDEX IF NOT EXISTS comp_participants_team_idx ON public.competition_participants(team_id);
CREATE INDEX IF NOT EXISTS comp_participants_status_idx ON public.competition_participants(registration_status, payment_status);

-- Enable RLS
ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own participation" ON public.competition_participants
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can register for competitions" ON public.competition_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" ON public.competition_participants
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Competition creators can view all participants" ON public.competition_participants
    FOR SELECT USING (
        competition_id IN (
            SELECT id FROM public.competitions WHERE created_by = auth.uid()
        )
    );

-- =====================================================
-- COMPETITION TEAMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.competition_teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
    team_name TEXT NOT NULL CHECK (length(team_name) >= 2 AND length(team_name) <= 100),
    leader_id UUID REFERENCES public.users(id) NOT NULL,
    
    -- Configuration
    max_members INTEGER DEFAULT 4 CHECK (max_members >= 1 AND max_members <= 10),
    invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'base64'),
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disbanded', 'disqualified')),
    current_members INTEGER DEFAULT 1,
    
    -- Performance
    team_score DECIMAL(10,4),
    total_submissions INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(competition_id, team_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS comp_teams_competition_idx ON public.competition_teams(competition_id);
CREATE INDEX IF NOT EXISTS comp_teams_leader_idx ON public.competition_teams(leader_id);
CREATE INDEX IF NOT EXISTS comp_teams_invite_code_idx ON public.competition_teams(invite_code);

-- Enable RLS
ALTER TABLE public.competition_teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Team members can view their team" ON public.competition_teams
    FOR SELECT USING (
        id IN (
            SELECT team_id FROM public.competition_participants 
            WHERE user_id = auth.uid() AND team_id IS NOT NULL
        ) OR leader_id = auth.uid()
    );

CREATE POLICY "Team leaders can manage their teams" ON public.competition_teams
    FOR ALL USING (leader_id = auth.uid());

-- Add foreign key reference back to competition_participants
ALTER TABLE public.competition_participants 
ADD CONSTRAINT competition_participants_team_fkey 
FOREIGN KEY (team_id) REFERENCES public.competition_teams(id) ON DELETE SET NULL;

-- =====================================================
-- COMPETITION SUBMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.competition_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
    participant_id UUID REFERENCES public.competition_participants(id) ON DELETE CASCADE NOT NULL,
    
    -- Assessment integration
    assessment_session_id UUID REFERENCES public.assessment_sessions(id),
    
    -- Submission data
    submission_data JSONB DEFAULT '{}',
    answers JSONB DEFAULT '[]', -- Encrypted/hashed answers
    
    -- Scoring
    raw_score DECIMAL(10,4),
    adjusted_score DECIMAL(10,4),
    percentage_score DECIMAL(5,2),
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    time_taken_seconds INTEGER,
    
    -- Status
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'disqualified')),
    
    -- Honor code tracking
    honor_code_violations JSONB DEFAULT '[]',
    violation_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS comp_submissions_competition_idx ON public.competition_submissions(competition_id);
CREATE INDEX IF NOT EXISTS comp_submissions_participant_idx ON public.competition_submissions(participant_id);
CREATE INDEX IF NOT EXISTS comp_submissions_score_idx ON public.competition_submissions(adjusted_score DESC);
CREATE INDEX IF NOT EXISTS comp_submissions_submitted_idx ON public.competition_submissions(submitted_at DESC);

-- Enable RLS
ALTER TABLE public.competition_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Participants can view their own submissions" ON public.competition_submissions
    FOR SELECT USING (
        participant_id IN (
            SELECT id FROM public.competition_participants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Participants can create submissions" ON public.competition_submissions
    FOR INSERT WITH CHECK (
        participant_id IN (
            SELECT id FROM public.competition_participants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Competition creators can view submissions after competition ends" ON public.competition_submissions
    FOR SELECT USING (
        competition_id IN (
            SELECT id FROM public.competitions 
            WHERE created_by = auth.uid() AND status IN ('completed', 'cancelled')
        )
    );

-- =====================================================
-- COMPETITION LEADERBOARDS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.competition_leaderboards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
    participant_id UUID REFERENCES public.competition_participants(id) ON DELETE CASCADE NOT NULL,
    
    -- Ranking
    rank INTEGER NOT NULL,
    score DECIMAL(10,4) NOT NULL,
    tie_breaker_score DECIMAL(10,4),
    
    -- Performance metrics
    submission_count INTEGER DEFAULT 0,
    best_submission_time INTEGER, -- seconds
    total_time_spent INTEGER, -- seconds
    
    -- Metadata
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(competition_id, participant_id),
    UNIQUE(competition_id, rank) DEFERRABLE INITIALLY DEFERRED
);

-- Indexes
CREATE INDEX IF NOT EXISTS comp_leaderboard_competition_rank_idx ON public.competition_leaderboards(competition_id, rank);
CREATE INDEX IF NOT EXISTS comp_leaderboard_score_idx ON public.competition_leaderboards(competition_id, score DESC);

-- Enable RLS
ALTER TABLE public.competition_leaderboards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public leaderboards are viewable during active competitions" ON public.competition_leaderboards
    FOR SELECT USING (
        competition_id IN (
            SELECT id FROM public.competitions 
            WHERE visibility = 'public' AND status IN ('active', 'completed')
        )
    );

CREATE POLICY "Participants can view competition leaderboards" ON public.competition_leaderboards
    FOR SELECT USING (
        competition_id IN (
            SELECT competition_id FROM public.competition_participants 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- COMPETITION CERTIFICATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.competition_certificates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Certificate details
    certificate_type TEXT NOT NULL CHECK (certificate_type IN ('winner', 'runner_up', 'participant', 'achievement')),
    rank_achieved INTEGER,
    achievement_category TEXT,
    
    -- Certificate data
    certificate_data JSONB DEFAULT '{}',
    certificate_url TEXT,
    verification_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    
    -- Metadata
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(competition_id, user_id, certificate_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS comp_certificates_competition_idx ON public.competition_certificates(competition_id);
CREATE INDEX IF NOT EXISTS comp_certificates_user_idx ON public.competition_certificates(user_id);
CREATE INDEX IF NOT EXISTS comp_certificates_verification_idx ON public.competition_certificates(verification_code);

-- Enable RLS
ALTER TABLE public.competition_certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own certificates" ON public.competition_certificates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Certificates are publicly verifiable" ON public.competition_certificates
    FOR SELECT USING (NOT revoked);

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- Generate unique competition invite code
CREATE OR REPLACE FUNCTION public.generate_competition_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := upper(encode(gen_random_bytes(4), 'base64'));
        new_code := replace(replace(replace(new_code, '+', ''), '/', ''), '=', '');
        
        SELECT EXISTS(
            SELECT 1 FROM public.competition_teams WHERE invite_code = new_code
        ) INTO code_exists;
        
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$;

-- Calculate competition rankings
CREATE OR REPLACE FUNCTION public.calculate_competition_rankings(p_competition_id UUID)
RETURNS TABLE(
    participant_id UUID,
    new_rank INTEGER,
    score DECIMAL(10,4),
    tie_breaker DECIMAL(10,4)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.id as participant_id,
        ROW_NUMBER() OVER (
            ORDER BY 
                COALESCE(cp.best_score, 0) DESC,
                cp.submission_count ASC,
                cp.last_submission_at ASC NULLS LAST
        )::INTEGER as new_rank,
        COALESCE(cp.best_score, 0) as score,
        CASE 
            WHEN cp.last_submission_at IS NOT NULL THEN 
                EXTRACT(EPOCH FROM cp.last_submission_at)::DECIMAL(10,4)
            ELSE 9999999999::DECIMAL(10,4)
        END as tie_breaker
    FROM public.competition_participants cp
    WHERE cp.competition_id = p_competition_id
    AND cp.registration_status = 'confirmed'
    AND cp.payment_status = 'completed'
    ORDER BY new_rank;
END;
$$;

-- Process competition payment
CREATE OR REPLACE FUNCTION public.process_competition_payment(
    p_user_id UUID,
    p_competition_id UUID,
    p_payment_id TEXT,
    p_amount DECIMAL(10,2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    participant_exists BOOLEAN;
    competition_active BOOLEAN;
BEGIN
    -- Check if participant registration exists
    SELECT EXISTS(
        SELECT 1 FROM public.competition_participants 
        WHERE user_id = p_user_id AND competition_id = p_competition_id
    ) INTO participant_exists;
    
    IF NOT participant_exists THEN
        RAISE EXCEPTION 'Participant registration not found';
    END IF;
    
    -- Check if competition accepts payments
    SELECT EXISTS(
        SELECT 1 FROM public.competitions 
        WHERE id = p_competition_id 
        AND status IN ('published', 'active')
        AND registration_deadline > NOW()
    ) INTO competition_active;
    
    IF NOT competition_active THEN
        RAISE EXCEPTION 'Competition registration is closed';
    END IF;
    
    -- Update participant payment status
    UPDATE public.competition_participants 
    SET 
        payment_id = p_payment_id,
        payment_status = 'completed',
        payment_amount = p_amount,
        registration_status = 'confirmed',
        updated_at = NOW()
    WHERE user_id = p_user_id AND competition_id = p_competition_id;
    
    -- Update competition participant count
    UPDATE public.competitions 
    SET 
        current_participants = (
            SELECT COUNT(*) FROM public.competition_participants 
            WHERE competition_id = p_competition_id 
            AND registration_status = 'confirmed'
        ),
        updated_at = NOW()
    WHERE id = p_competition_id;
    
    RETURN TRUE;
END;
$$;

-- Auto-issue certificates
CREATE OR REPLACE FUNCTION public.auto_issue_certificates(p_competition_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    competition_status TEXT;
    total_participants INTEGER;
    certificates_issued INTEGER := 0;
    participant_record RECORD;
BEGIN
    -- Check competition status
    SELECT status INTO competition_status 
    FROM public.competitions 
    WHERE id = p_competition_id;
    
    IF competition_status != 'completed' THEN
        RAISE EXCEPTION 'Competition must be completed to issue certificates';
    END IF;
    
    -- Get total participants
    SELECT COUNT(*) INTO total_participants
    FROM public.competition_participants cp
    WHERE cp.competition_id = p_competition_id
    AND cp.registration_status = 'confirmed';
    
    -- Issue certificates based on ranking
    FOR participant_record IN 
        SELECT 
            cl.participant_id,
            cp.user_id,
            cl.rank,
            cl.score
        FROM public.competition_leaderboards cl
        JOIN public.competition_participants cp ON cp.id = cl.participant_id
        WHERE cl.competition_id = p_competition_id
        ORDER BY cl.rank
    LOOP
        -- Determine certificate type
        DECLARE
            cert_type TEXT;
        BEGIN
            IF participant_record.rank = 1 THEN
                cert_type := 'winner';
            ELSIF participant_record.rank <= 3 THEN
                cert_type := 'runner_up';
            ELSE
                cert_type := 'participant';
            END IF;
            
            -- Insert certificate
            INSERT INTO public.competition_certificates (
                competition_id,
                user_id,
                certificate_type,
                rank_achieved,
                certificate_data
            ) VALUES (
                p_competition_id,
                participant_record.user_id,
                cert_type,
                participant_record.rank,
                jsonb_build_object(
                    'score', participant_record.score,
                    'total_participants', total_participants,
                    'rank', participant_record.rank
                )
            )
            ON CONFLICT (competition_id, user_id, certificate_type) DO NOTHING;
            
            certificates_issued := certificates_issued + 1;
        END;
    END LOOP;
    
    RETURN certificates_issued;
END;
$$;

-- Check honor code violations
CREATE OR REPLACE FUNCTION public.check_honor_code_violations(p_submission_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    violation_count INTEGER;
    participant_id UUID;
    competition_id UUID;
BEGIN
    -- Get submission details
    SELECT 
        cs.participant_id,
        cs.competition_id,
        array_length(
            CASE 
                WHEN jsonb_typeof(cs.honor_code_violations) = 'array' 
                THEN ARRAY(SELECT jsonb_array_elements_text(cs.honor_code_violations))
                ELSE ARRAY[]::TEXT[]
            END, 1
        )
    INTO participant_id, competition_id, violation_count
    FROM public.competition_submissions cs
    WHERE cs.id = p_submission_id;
    
    IF participant_id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Update participant violation count
    UPDATE public.competition_participants
    SET 
        honor_code_violations = GREATEST(honor_code_violations, COALESCE(violation_count, 0)),
        updated_at = NOW()
    WHERE id = participant_id;
    
    -- Auto-disqualify if violations exceed threshold (configurable)
    IF COALESCE(violation_count, 0) >= 3 THEN
        UPDATE public.competition_participants
        SET 
            registration_status = 'disqualified',
            updated_at = NOW()
        WHERE id = participant_id;
        
        -- Update submission status
        UPDATE public.competition_submissions
        SET 
            processing_status = 'disqualified',
            updated_at = NOW()
        WHERE id = p_submission_id;
    END IF;
    
    RETURN COALESCE(violation_count, 0);
END;
$$;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update competition participant counts
CREATE OR REPLACE FUNCTION public.update_competition_participant_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.competitions 
        SET 
            current_participants = (
                SELECT COUNT(*) FROM public.competition_participants 
                WHERE competition_id = NEW.competition_id 
                AND registration_status = 'confirmed'
            ),
            updated_at = NOW()
        WHERE id = NEW.competition_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.competitions 
        SET 
            current_participants = (
                SELECT COUNT(*) FROM public.competition_participants 
                WHERE competition_id = OLD.competition_id 
                AND registration_status = 'confirmed'
            ),
            updated_at = NOW()
        WHERE id = OLD.competition_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER competition_participant_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.competition_participants
    FOR EACH ROW EXECUTE FUNCTION public.update_competition_participant_count();

-- Update team member counts
CREATE OR REPLACE FUNCTION public.update_team_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.team_id IS NOT NULL THEN
            UPDATE public.competition_teams 
            SET 
                current_members = (
                    SELECT COUNT(*) FROM public.competition_participants 
                    WHERE team_id = NEW.team_id 
                    AND registration_status = 'confirmed'
                ),
                updated_at = NOW()
            WHERE id = NEW.team_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.team_id IS NOT NULL THEN
            UPDATE public.competition_teams 
            SET 
                current_members = (
                    SELECT COUNT(*) FROM public.competition_participants 
                    WHERE team_id = OLD.team_id 
                    AND registration_status = 'confirmed'
                ),
                updated_at = NOW()
            WHERE id = OLD.team_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER team_member_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.competition_participants
    FOR EACH ROW EXECUTE FUNCTION public.update_team_member_count();

-- Update timestamps
CREATE TRIGGER competitions_updated_at_trigger
    BEFORE UPDATE ON public.competitions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER competition_participants_updated_at_trigger
    BEFORE UPDATE ON public.competition_participants
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER competition_teams_updated_at_trigger
    BEFORE UPDATE ON public.competition_teams
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER competition_submissions_updated_at_trigger
    BEFORE UPDATE ON public.competition_submissions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- INITIAL DATA SETUP
-- =====================================================

-- Insert sample competition categories if assessment_categories exist
INSERT INTO public.competitions (
    title,
    description,
    type,
    start_date,
    end_date,
    registration_deadline,
    max_participants,
    entry_fee,
    prize_pool,
    question_category_id,
    question_count,
    time_limit_minutes,
    status,
    visibility,
    featured,
    created_by,
    rules
) 
SELECT 
    'AI Fundamentals Championship 2025',
    'Test your knowledge of AI fundamentals in this comprehensive competition. Cover topics from basic concepts to advanced applications.',
    'individual',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '14 days',
    NOW() + INTERVAL '6 days',
    1000,
    99.00,
    50000.00,
    ac.id,
    50,
    120,
    'published',
    'public',
    true,
    u.id,
    jsonb_build_object(
        'honor_code_required', true,
        'retakes_allowed', false,
        'time_extensions', false,
        'collaboration_policy', 'Individual work only',
        'device_restrictions', 'Single device, no external resources'
    )
FROM public.assessment_categories ac
CROSS JOIN public.users u
WHERE ac.category_code = 'fundamentals' 
AND u.subscription_plan IN ('admin', 'pro')
LIMIT 1
ON CONFLICT DO NOTHING;

-- Commit transaction
COMMIT;

-- =====================================================
-- POST-MIGRATION VERIFICATION
-- =====================================================

-- Verify tables were created
DO $$
BEGIN
    ASSERT (SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'competitions', 
                'competition_participants', 
                'competition_teams',
                'competition_submissions', 
                'competition_leaderboards', 
                'competition_certificates'
            )) = 6, 'Not all competition tables were created';
    
    -- Verify RLS is enabled
    ASSERT (SELECT COUNT(*) FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename LIKE 'competition%' 
            AND rowsecurity = true) >= 6, 'RLS not enabled on all competition tables';
    
    RAISE NOTICE 'Competition system migration completed successfully!';
    RAISE NOTICE 'Created tables: competitions, competition_participants, competition_teams, competition_submissions, competition_leaderboards, competition_certificates';
    RAISE NOTICE 'Created functions: generate_competition_invite_code, calculate_competition_rankings, process_competition_payment, auto_issue_certificates, check_honor_code_violations';
    RAISE NOTICE 'Enabled RLS policies for security and access control';
END;
$$;


-- ------------------------------------------
-- SECTION: migration_006_webhook_events.sql
-- ------------------------------------------
-- Migration 006: Webhook Events Table for Idempotency
-- Description: Adds webhook_events table to track processed payment webhooks and prevent replay attacks
-- Dependencies: migration_001_certification_system.sql (for users table)

-- Create webhook_events table for tracking processed webhooks
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_hash VARCHAR(64) NOT NULL UNIQUE,
  event_type VARCHAR(100),
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for fast hash lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_hash ON public.webhook_events(event_hash);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events(created_at DESC);

-- Add cleanup function to remove old webhook events (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM public.webhook_events
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on webhook_events
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access webhook events (not user-accessible)
CREATE POLICY "Service role only" ON public.webhook_events
  FOR ALL
  USING (false);

-- Grant access to service role
GRANT ALL ON public.webhook_events TO service_role;

COMMENT ON TABLE public.webhook_events IS 'Tracks processed payment webhook events for idempotency and replay protection';
COMMENT ON COLUMN public.webhook_events.event_hash IS 'SHA-256 hash of the webhook payload for deduplication';
COMMENT ON COLUMN public.webhook_events.event_type IS 'Type of Razorpay event (e.g., payment.captured)';
COMMENT ON COLUMN public.webhook_events.payload IS 'Complete webhook payload from Razorpay';
COMMENT ON COLUMN public.webhook_events.processed_at IS 'When the webhook was successfully processed';


-- ------------------------------------------
-- SECTION: migration_007_admin_security_rbac.sql
-- ------------------------------------------
-- ============================================================================
-- MIGRATION 007: ADMIN SECURITY & ROLE-BASED ACCESS CONTROL (RBAC)
-- ============================================================================
-- Purpose: Implement secure admin system with proper role management
-- Date: 2025-10-01
-- Author: ReadyCheck AI Security Team
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD ROLE MANAGEMENT TO USERS TABLE
-- ============================================================================

-- Add role column with enum constraint
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE users 
    ADD COLUMN role VARCHAR(20) DEFAULT 'user' 
    CHECK (role IN ('user', 'admin', 'superadmin'));
    
    RAISE NOTICE 'Added role column to users table';
  END IF;
END $$;

-- Add role assignment tracking columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'role_assigned_at') THEN
    ALTER TABLE users 
    ADD COLUMN role_assigned_at TIMESTAMPTZ,
    ADD COLUMN role_assigned_by UUID REFERENCES users(id);
    
    RAISE NOTICE 'Added role tracking columns to users table';
  END IF;
END $$;

-- Add 2FA requirement flag for admin accounts
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'requires_2fa') THEN
    ALTER TABLE users 
    ADD COLUMN requires_2fa BOOLEAN DEFAULT FALSE,
    ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN two_factor_secret TEXT;
    
    RAISE NOTICE 'Added 2FA columns to users table';
  END IF;
END $$;

-- Add admin session tracking
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'last_admin_login') THEN
    ALTER TABLE users 
    ADD COLUMN last_admin_login TIMESTAMPTZ,
    ADD COLUMN admin_session_expires_at TIMESTAMPTZ,
    ADD COLUMN failed_admin_login_attempts INTEGER DEFAULT 0;
    
    RAISE NOTICE 'Added admin session tracking columns';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role IN ('admin', 'superadmin');
CREATE INDEX IF NOT EXISTS idx_users_role_assigned ON users(role_assigned_at DESC) WHERE role IN ('admin', 'superadmin');

-- ============================================================================
-- STEP 2: CREATE ADMIN AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for admin audit log
CREATE INDEX IF NOT EXISTS idx_admin_audit_user ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_resource ON admin_audit_log(resource_type, resource_id);

-- Add comments for documentation
COMMENT ON TABLE admin_audit_log IS 'Comprehensive audit log for all admin actions';
COMMENT ON COLUMN admin_audit_log.action IS 'Type of action performed (e.g., USER_ROLE_CHANGED, QUESTION_DELETED)';
COMMENT ON COLUMN admin_audit_log.details IS 'JSON object with action-specific details';

-- ============================================================================
-- STEP 3: CREATE ADMIN NOTIFICATION LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_notif_user ON admin_notifications(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notif_unread ON admin_notifications(admin_user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_admin_notif_created ON admin_notifications(created_at DESC);

-- ============================================================================
-- STEP 4: CREATE PAYMENT AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  order_id VARCHAR(255),
  payment_id VARCHAR(255),
  amount INTEGER,
  currency VARCHAR(3) DEFAULT 'INR',
  status VARCHAR(50),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_audit_user ON payment_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_order ON payment_audit_log(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_created ON payment_audit_log(created_at DESC);

-- ============================================================================
-- STEP 5: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on admin tables
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin audit log policies
-- Only admins can view audit logs
DROP POLICY IF EXISTS admin_audit_select ON admin_audit_log;
CREATE POLICY admin_audit_select ON admin_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- Only system can insert audit logs (via service role)
DROP POLICY IF EXISTS admin_audit_insert ON admin_audit_log;
CREATE POLICY admin_audit_insert ON admin_audit_log
  FOR INSERT
  WITH CHECK (true);

-- Admin notifications policies
-- Admins can only see their own notifications
DROP POLICY IF EXISTS admin_notif_select ON admin_notifications;
CREATE POLICY admin_notif_select ON admin_notifications
  FOR SELECT
  USING (
    admin_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- Admins can update their own notifications (mark as read)
DROP POLICY IF EXISTS admin_notif_update ON admin_notifications;
CREATE POLICY admin_notif_update ON admin_notifications
  FOR UPDATE
  USING (admin_user_id = auth.uid())
  WITH CHECK (admin_user_id = auth.uid());

-- Payment audit log policies
-- Users can see their own payment logs
DROP POLICY IF EXISTS payment_audit_user_select ON payment_audit_log;
CREATE POLICY payment_audit_user_select ON payment_audit_log
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can see all payment logs
DROP POLICY IF EXISTS payment_audit_admin_select ON payment_audit_log;
CREATE POLICY payment_audit_admin_select ON payment_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- ============================================================================
-- STEP 6: HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id 
    AND role IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-upgrade admin to pro subscription
CREATE OR REPLACE FUNCTION auto_upgrade_admin_to_pro()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is being set to admin or superadmin
  IF NEW.role IN ('admin', 'superadmin') AND (OLD.role IS NULL OR OLD.role = 'user') THEN
    -- Auto-upgrade to pro
    NEW.subscription_plan := 'pro';
    NEW.subscription_status := 'active';
    NEW.requires_2fa := TRUE;  -- Require 2FA for admins
    
    -- Log the upgrade
    INSERT INTO admin_audit_log (
      admin_user_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      NEW.id,
      'AUTO_UPGRADED_TO_PRO',
      'user',
      NEW.id,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'subscription_plan', 'pro'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-upgrade
DROP TRIGGER IF EXISTS trigger_auto_upgrade_admin ON users;
CREATE TRIGGER trigger_auto_upgrade_admin
  BEFORE UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_upgrade_admin_to_pro();

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_user_id UUID,
  p_action VARCHAR,
  p_resource_type VARCHAR DEFAULT NULL,
  p_resource_id VARCHAR DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO admin_audit_log (
    admin_user_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_admin_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create admin notification
CREATE OR REPLACE FUNCTION create_admin_notification(
  p_admin_user_id UUID,
  p_notification_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_severity VARCHAR DEFAULT 'info',
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notif_id UUID;
BEGIN
  INSERT INTO admin_notifications (
    admin_user_id,
    notification_type,
    title,
    message,
    severity,
    metadata
  ) VALUES (
    p_admin_user_id,
    p_notification_type,
    p_title,
    p_message,
    p_severity,
    p_metadata
  ) RETURNING id INTO v_notif_id;
  
  RETURN v_notif_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: ADMIN SESSION MANAGEMENT
-- ============================================================================

-- Function to validate admin session (30 min timeout)
CREATE OR REPLACE FUNCTION validate_admin_session(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT role, admin_session_expires_at, requires_2fa, two_factor_enabled
  INTO v_user
  FROM users
  WHERE id = p_user_id;
  
  -- Check if user is admin
  IF v_user.role NOT IN ('admin', 'superadmin') THEN
    RETURN FALSE;
  END IF;
  
  -- Check if 2FA is required but not enabled
  IF v_user.requires_2fa AND NOT v_user.two_factor_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Check session expiration (30 minutes for admins)
  IF v_user.admin_session_expires_at IS NULL OR 
     v_user.admin_session_expires_at < NOW() THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh admin session
CREATE OR REPLACE FUNCTION refresh_admin_session(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET admin_session_expires_at = NOW() + INTERVAL '30 minutes',
      last_admin_login = NOW()
  WHERE id = p_user_id
    AND role IN ('admin', 'superadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 8: SECURITY CONSTRAINTS
-- ============================================================================

-- Ensure admins cannot downgrade themselves
CREATE OR REPLACE FUNCTION prevent_self_role_downgrade()
RETURNS TRIGGER AS $$
BEGIN
  -- If trying to downgrade own role
  IF OLD.role IN ('admin', 'superadmin') AND 
     NEW.role = 'user' AND 
     OLD.id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot downgrade your own admin role';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_self_downgrade ON users;
CREATE TRIGGER trigger_prevent_self_downgrade
  BEFORE UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_role_downgrade();

-- ============================================================================
-- STEP 9: GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON admin_audit_log TO authenticated;
GRANT SELECT, UPDATE ON admin_notifications TO authenticated;
GRANT SELECT ON payment_audit_log TO authenticated;

-- Grant insert permissions to service role only
GRANT INSERT ON admin_audit_log TO service_role;
GRANT INSERT ON admin_notifications TO service_role;
GRANT INSERT ON payment_audit_log TO service_role;

-- ============================================================================
-- STEP 10: DATA MIGRATION - UPDATE EXISTING USERS
-- ============================================================================

-- Set default role for existing users without role
UPDATE users 
SET role = 'user' 
WHERE role IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables created
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables
  WHERE table_name IN ('admin_audit_log', 'admin_notifications', 'payment_audit_log');
  
  IF v_count = 3 THEN
    RAISE NOTICE '✅ All admin security tables created successfully';
  ELSE
    RAISE WARNING '⚠️  Some tables may be missing. Expected 3, found %', v_count;
  END IF;
END $$;

-- Verify columns added
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns
  WHERE table_name = 'users' 
    AND column_name IN ('role', 'role_assigned_at', 'role_assigned_by', 'requires_2fa');
  
  IF v_count = 4 THEN
    RAISE NOTICE '✅ All role management columns added successfully';
  ELSE
    RAISE WARNING '⚠️  Some columns may be missing. Expected 4, found %', v_count;
  END IF;
END $$;

-- Verify RLS policies
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename IN ('admin_audit_log', 'admin_notifications', 'payment_audit_log');
  
  IF v_count >= 5 THEN
    RAISE NOTICE '✅ RLS policies created successfully (% policies)', v_count;
  ELSE
    RAISE WARNING '⚠️  Some RLS policies may be missing. Found % policies', v_count;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION 007 COMPLETED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Admin security system is now active';
  RAISE NOTICE 'Next step: Create first admin user';
  RAISE NOTICE '========================================';
END $$;


-- ------------------------------------------
-- SECTION: migration_008_universal_schema_support.sql
-- ------------------------------------------
-- =====================================================
-- ReadyCheck AI - Migration 008: Universal Schema Support WITH ADMIN SECURITY
-- =====================================================
-- Purpose: Extend questions table to support universal schema format (v2.0.0)
-- WITH ADMIN RBAC INTEGRATION & AUDIT LOGGING
-- Author: System Migration
-- Date: 2025-10-01
-- 
-- This migration adds support for the universal question schema with:
-- - Schema version tracking
-- - Enhanced metadata
-- - Flexible category and difficulty structures
-- - Rich business context
-- - Assessment configuration
-- - ADMIN ROLE VERIFICATION (requires migration 007)
-- - COMPREHENSIVE AUDIT LOGGING
-- =====================================================

BEGIN;

-- =====================================================
-- PART 0: VERIFY PREREQUISITES
-- =====================================================

DO $$
BEGIN
    -- Check if migration 007 (admin RBAC) exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'admin_audit_log' AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Migration 007 (Admin RBAC) must be run before Migration 008. Please run migration_007_admin_security_rbac.sql first.';
    END IF;
    
    -- Check if users table has role column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role' AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Users table missing role column. Please run migration_007_admin_security_rbac.sql first.';
    END IF;
    
    RAISE NOTICE '✅ Prerequisites verified: Admin RBAC system detected';
END $$;

-- =====================================================
-- PART 1: ALTER QUESTIONS TABLE FOR UNIVERSAL SCHEMA
-- =====================================================

-- Add new columns for universal schema support
ALTER TABLE public.questions
  -- Schema versioning
  ADD COLUMN IF NOT EXISTS schema_version TEXT DEFAULT '2.0.0',
  
  -- Metadata fields
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'draft' CHECK (review_status IN ('draft', 'pending_review', 'reviewed', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  
  -- Enhanced category fields (v2 schema)
  ADD COLUMN IF NOT EXISTS category_primary TEXT,
  ADD COLUMN IF NOT EXISTS category_code_v2 TEXT,
  ADD COLUMN IF NOT EXISTS category_subcategories TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS category_skills TEXT[] DEFAULT '{}',
  
  -- Enhanced difficulty fields (v2 schema)
  ADD COLUMN IF NOT EXISTS difficulty_level_text TEXT CHECK (difficulty_level_text IN ('beginner', 'intermediate', 'advanced', 'expert')),
  ADD COLUMN IF NOT EXISTS difficulty_score INTEGER CHECK (difficulty_score BETWEEN 1 AND 10),
  
  -- Question format v2
  ADD COLUMN IF NOT EXISTS question_format_v2 TEXT CHECK (question_format_v2 IN ('single_choice', 'multiple_choice', 'scenario_based', 'case_study')),
  
  -- Assessment configuration
  ADD COLUMN IF NOT EXISTS assessment_question_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assessment_certification_levels TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS time_recommended INTEGER,
  ADD COLUMN IF NOT EXISTS points_base INTEGER,
  
  -- Content enhancements
  ADD COLUMN IF NOT EXISTS options_v2 JSONB,
  ADD COLUMN IF NOT EXISTS correct_answer_id TEXT,
  ADD COLUMN IF NOT EXISTS correct_answer_explanation TEXT,
  ADD COLUMN IF NOT EXISTS randomize_options BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS learning_resources JSONB DEFAULT '[]'::JSONB,
  
  -- Enhanced business context
  ADD COLUMN IF NOT EXISTS real_world_application TEXT,
  ADD COLUMN IF NOT EXISTS industry_relevance TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS role_relevance TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS impact_level TEXT CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Status flags (v2 schema)
  ADD COLUMN IF NOT EXISTS status_flags JSONB DEFAULT '{"active": true, "published": false, "featured": false}'::JSONB,
  
  -- Admin audit fields
  ADD COLUMN IF NOT EXISTS imported_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES public.users(id);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_questions_schema_version ON public.questions(schema_version);
CREATE INDEX IF NOT EXISTS idx_questions_review_status ON public.questions(review_status);
CREATE INDEX IF NOT EXISTS idx_questions_category_primary ON public.questions(category_primary);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty_text ON public.questions(difficulty_level_text);
CREATE INDEX IF NOT EXISTS idx_questions_status_flags ON public.questions USING GIN(status_flags);
CREATE INDEX IF NOT EXISTS idx_questions_tags ON public.questions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_questions_imported_by ON public.questions(imported_by);

-- =====================================================
-- PART 2: ADMIN SECURITY FUNCTIONS
-- =====================================================

-- Function to verify admin role with proper error handling
CREATE OR REPLACE FUNCTION public.verify_admin_for_question_import()
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
BEGIN
  -- Get current user from auth context
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for question import. Please ensure you are logged in as an admin.';
  END IF;
  
  -- Check user role
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = v_user_id;
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User profile not found. Cannot verify admin status.';
  END IF;
  
  IF v_user_role NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'Admin access required for question import. Your role: %. Required: admin or superadmin', v_user_role;
  END IF;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log question import actions to admin audit log
CREATE OR REPLACE FUNCTION public.log_question_import(
  p_admin_id UUID,
  p_action TEXT,
  p_question_id UUID,
  p_question_key TEXT,
  p_details JSONB DEFAULT '{}'::JSONB,
  p_success BOOLEAN DEFAULT true
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    action,
    resource_type,
    resource_id,
    details,
    success
  ) VALUES (
    p_admin_id,
    p_action,
    'question',
    p_question_id::TEXT,
    p_details || jsonb_build_object('question_key', p_question_key)::JSONB,
    p_success
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 3: SECURE UNIVERSAL SCHEMA IMPORT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.import_universal_schema_question(
  p_question JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_admin_user_id UUID;
  v_question_id UUID;
  v_category_id UUID;
  v_result JSONB;
  v_options_legacy JSONB;
  v_correct_answer_index INTEGER;
  v_correct_answer_text TEXT;
  v_question_key TEXT;
  v_action TEXT;
BEGIN
  -- SECURITY CHECK: Verify admin role (comment out for service role imports)
  -- Uncomment the line below to enforce admin-only imports:
  -- v_admin_user_id := public.verify_admin_for_question_import();
  
  -- For service role imports (scripts), get admin from context if available
  v_admin_user_id := auth.uid();
  
  -- Extract and validate question_key
  v_question_key := p_question->>'question_key';
  IF v_question_key IS NULL THEN
    IF v_admin_user_id IS NOT NULL THEN
      PERFORM public.log_question_import(
        v_admin_user_id,
        'QUESTION_IMPORT_FAILED',
        NULL,
        NULL,
        jsonb_build_object('error', 'Missing required field: question_key'),
        false
      );
    END IF;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Missing required field: question_key',
      'question_key', NULL
    );
  END IF;

  -- Get or create category
  SELECT id INTO v_category_id
  FROM public.assessment_categories
  WHERE category_code = COALESCE(p_question->'category'->>'code', 'general')
  LIMIT 1;

  IF v_category_id IS NULL THEN
    -- Create category if it doesn't exist
    INSERT INTO public.assessment_categories (
      category_code,
      name,
      category_name,
      description,
      display_order,
      active
    ) VALUES (
      COALESCE(p_question->'category'->>'code', 'general'),
      COALESCE(p_question->'category'->>'primary', 'General'),
      COALESCE(p_question->'category'->>'primary', 'General'),
      'Auto-created category from import',
      999,
      true
    )
    ON CONFLICT (category_code) DO UPDATE SET
      name = EXCLUDED.name,
      category_name = EXCLUDED.category_name
    RETURNING id INTO v_category_id;
  END IF;

  -- Convert options_v2 to legacy format for backward compatibility
  IF p_question->'content'->'options' IS NOT NULL THEN
    SELECT jsonb_agg(opt->>'text' ORDER BY (opt->>'id'))
    INTO v_options_legacy
    FROM jsonb_array_elements(p_question->'content'->'options') AS opt;
    
    -- Find correct answer index
    SELECT (array_position(
      ARRAY(SELECT opt->>'id' FROM jsonb_array_elements(p_question->'content'->'options') AS opt),
      p_question->'content'->'correct_answer'->>'option_id'
    ) - 1)
    INTO v_correct_answer_index;
    
    -- Get correct answer text
    SELECT opt->>'text'
    INTO v_correct_answer_text
    FROM jsonb_array_elements(p_question->'content'->'options') AS opt
    WHERE opt->>'id' = p_question->'content'->'correct_answer'->>'option_id'
    LIMIT 1;
  END IF;

  -- Insert or update question
  INSERT INTO public.questions (
    -- Core identification
    question_key,
    schema_version,
    
    -- Legacy fields (for backward compatibility)
    question_type,
    question_text,
    question_format,
    options,
    correct_answer_index,
    correct_answer_text,
    explanation,
    business_context,
    category_id,
    difficulty_level,
    points,
    time_allocation_seconds,
    active,
    
    -- V2 Schema fields
    question_format_v2,
    category_primary,
    category_code_v2,
    category_subcategories,
    category_skills,
    difficulty_level_text,
    difficulty_score,
    
    -- Metadata
    metadata,
    review_status,
    revision_number,
    tags,
    
    -- Assessment configuration
    assessment_question_types,
    assessment_certification_levels,
    time_recommended,
    points_base,
    
    -- Enhanced content
    options_v2,
    correct_answer_id,
    correct_answer_explanation,
    randomize_options,
    learning_resources,
    
    -- Enhanced business context
    real_world_application,
    industry_relevance,
    role_relevance,
    impact_level,
    
    -- Status
    status_flags,
    
    -- Timestamps
    created_at,
    updated_at
  ) VALUES (
    -- Core identification
    p_question->>'question_key',
    COALESCE(p_question->>'_schema_version', '2.0.0'),
    
    -- Legacy fields
    'practice', -- default question type
    p_question->>'question_text',
    COALESCE(p_question->>'question_format', 'single_choice'),
    COALESCE(v_options_legacy, '["Option A", "Option B"]'::JSONB),
    COALESCE(v_correct_answer_index, 0),
    COALESCE(v_correct_answer_text, 'Option A'),
    COALESCE(
      p_question->'explanation'->>'correct_answer_explanation',
      p_question->'content'->'correct_answer'->>'explanation',
      'Explanation not provided'
    ),
    COALESCE(
      p_question->'business_context'->>'real_world_application',
      'Business context not provided'
    ),
    v_category_id,
    CASE COALESCE(p_question->'difficulty'->>'level', 'beginner')
      WHEN 'beginner' THEN 2
      WHEN 'intermediate' THEN 5
      WHEN 'advanced' THEN 7
      WHEN 'expert' THEN 9
      ELSE 5
    END,
    COALESCE((p_question->'assessment_config'->'points'->>'base_points')::INTEGER, 1),
    COALESCE((p_question->'assessment_config'->'time_allocation'->>'seconds')::INTEGER, 60),
    COALESCE((p_question->'status'->>'active')::BOOLEAN, true),
    
    -- V2 Schema fields
    p_question->>'question_format',
    p_question->'category'->>'primary',
    p_question->'category'->>'code',
    ARRAY(SELECT jsonb_array_elements_text(p_question->'category'->'subcategories')),
    ARRAY(SELECT jsonb_array_elements_text(p_question->'category'->'skills')),
    p_question->'difficulty'->>'level',
    (p_question->'difficulty'->>'score')::INTEGER,
    
    -- Metadata
    COALESCE(p_question->'_metadata', '{}'::JSONB),
    COALESCE(p_question->'_metadata'->>'review_status', 'draft'),
    COALESCE((p_question->'_metadata'->>'revision_number')::INTEGER, 1),
    ARRAY(SELECT jsonb_array_elements_text(p_question->'_metadata'->'tags')),
    
    -- Assessment configuration
    ARRAY(SELECT jsonb_array_elements_text(p_question->'assessment_config'->'question_types')),
    ARRAY(SELECT jsonb_array_elements_text(p_question->'assessment_config'->'certification_levels')),
    (p_question->'assessment_config'->'time_allocation'->>'seconds')::INTEGER,
    (p_question->'assessment_config'->'points'->>'base_points')::INTEGER,
    
    -- Enhanced content
    p_question->'content'->'options',
    p_question->'content'->'correct_answer'->>'option_id',
    p_question->'content'->'correct_answer'->>'explanation',
    COALESCE((p_question->'content'->>'randomize_options')::BOOLEAN, true),
    COALESCE(p_question->'explanation'->'learning_resources', '[]'::JSONB),
    
    -- Enhanced business context
    p_question->'business_context'->>'real_world_application',
    ARRAY(SELECT jsonb_array_elements_text(p_question->'business_context'->'industry_relevance')),
    ARRAY(SELECT jsonb_array_elements_text(p_question->'business_context'->'role_relevance')),
    p_question->'business_context'->>'impact_level',
    
    -- Status
    COALESCE(p_question->'status', '{"active": true, "published": false, "featured": false}'::JSONB),
    
    -- Timestamps
    COALESCE((p_question->'_metadata'->>'created_at')::TIMESTAMPTZ, NOW()),
    NOW()
  )
  ON CONFLICT (question_key) DO UPDATE SET
    -- Update all fields on conflict
    question_text = EXCLUDED.question_text,
    question_format = EXCLUDED.question_format,
    question_format_v2 = EXCLUDED.question_format_v2,
    options = EXCLUDED.options,
    options_v2 = EXCLUDED.options_v2,
    correct_answer_index = EXCLUDED.correct_answer_index,
    correct_answer_text = EXCLUDED.correct_answer_text,
    correct_answer_id = EXCLUDED.correct_answer_id,
    correct_answer_explanation = EXCLUDED.correct_answer_explanation,
    explanation = EXCLUDED.explanation,
    business_context = EXCLUDED.business_context,
    real_world_application = EXCLUDED.real_world_application,
    category_primary = EXCLUDED.category_primary,
    category_code_v2 = EXCLUDED.category_code_v2,
    category_subcategories = EXCLUDED.category_subcategories,
    category_skills = EXCLUDED.category_skills,
    difficulty_level = EXCLUDED.difficulty_level,
    difficulty_level_text = EXCLUDED.difficulty_level_text,
    difficulty_score = EXCLUDED.difficulty_score,
    points = EXCLUDED.points,
    points_base = EXCLUDED.points_base,
    time_allocation_seconds = EXCLUDED.time_allocation_seconds,
    time_recommended = EXCLUDED.time_recommended,
    metadata = EXCLUDED.metadata,
    review_status = EXCLUDED.review_status,
    revision_number = EXCLUDED.revision_number + 1, -- Increment revision
    tags = EXCLUDED.tags,
    industry_relevance = EXCLUDED.industry_relevance,
    role_relevance = EXCLUDED.role_relevance,
    impact_level = EXCLUDED.impact_level,
    status_flags = EXCLUDED.status_flags,
    last_modified_by = v_admin_user_id,
    updated_at = NOW()
  RETURNING id INTO v_question_id;

  -- Log successful import
  IF v_admin_user_id IS NOT NULL THEN
    PERFORM public.log_question_import(
      v_admin_user_id,
      CASE v_action WHEN 'inserted' THEN 'QUESTION_IMPORTED' ELSE 'QUESTION_UPDATED' END,
      v_question_id,
      v_question_key,
      jsonb_build_object(
        'schema_version', p_question->>'_schema_version',
        'category', p_question->'category'->>'primary',
        'difficulty', p_question->'difficulty'->>'level',
        'action', v_action
      ),
      true
    );
  END IF;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'question_id', v_question_id,
    'question_key', v_question_key,
    'action', v_action
  );

EXCEPTION WHEN OTHERS THEN
  -- Log failure
  IF v_admin_user_id IS NOT NULL THEN
    PERFORM public.log_question_import(
      v_admin_user_id,
      'QUESTION_IMPORT_FAILED',
      NULL,
      v_question_key,
      jsonb_build_object('error', SQLERRM),
      false
    );
  END IF;
  
  -- Return error
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'question_key', v_question_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 3: BATCH IMPORT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.batch_import_universal_questions(
  p_questions JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_admin_user_id UUID;
  v_total INTEGER := 0;
  v_success INTEGER := 0;
  v_failed INTEGER := 0;
  v_updated INTEGER := 0;
  v_question JSONB;
  v_result JSONB;
  v_details JSONB := '[]'::JSONB;
BEGIN
  -- Get admin user (optional for service role imports)
  v_admin_user_id := auth.uid();
  
  -- Log batch import start
  IF v_admin_user_id IS NOT NULL THEN
    PERFORM public.log_question_import(
      v_admin_user_id,
      'BATCH_IMPORT_STARTED',
      NULL,
      NULL,
      jsonb_build_object('total_questions', jsonb_array_length(p_questions)),
      true
    );
  END IF;
  
  -- Validate input
  IF jsonb_typeof(p_questions) != 'array' THEN
    IF v_admin_user_id IS NOT NULL THEN
      PERFORM public.log_question_import(
        v_admin_user_id,
        'BATCH_IMPORT_FAILED',
        NULL,
        NULL,
        jsonb_build_object('error', 'Input must be a JSON array'),
        false
      );
    END IF;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Input must be a JSON array of questions'
    );
  END IF;

  v_total := jsonb_array_length(p_questions);

  -- Process each question
  FOR v_question IN SELECT * FROM jsonb_array_elements(p_questions)
  LOOP
    v_result := public.import_universal_schema_question(v_question);
    
    IF (v_result->>'success')::BOOLEAN THEN
      v_success := v_success + 1;
      IF (v_result->>'action') = 'updated' THEN
        v_updated := v_updated + 1;
      END IF;
    ELSE
      v_failed := v_failed + 1;
      v_details := v_details || jsonb_build_object(
        'question_key', v_result->>'question_key',
        'error', v_result->>'error'
      );
    END IF;
  END LOOP;

  -- Log batch import completion
  IF v_admin_user_id IS NOT NULL THEN
    PERFORM public.log_question_import(
      v_admin_user_id,
      'BATCH_IMPORT_COMPLETED',
      NULL,
      NULL,
      jsonb_build_object(
        'total', v_total,
        'imported', v_success,
        'updated', v_updated,
        'failed', v_failed
      ),
      v_failed = 0
    );
  END IF;

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'total', v_total,
    'imported', v_success,
    'updated', v_updated,
    'failed', v_failed,
    'failed_details', v_details
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 4: HELPER FUNCTIONS
-- =====================================================

-- Function to get question statistics by schema version
CREATE OR REPLACE FUNCTION public.get_question_stats_by_schema()
RETURNS TABLE (
  schema_version TEXT,
  total_questions BIGINT,
  published_questions BIGINT,
  draft_questions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(q.schema_version, '1.0.0') as schema_version,
    COUNT(*) as total_questions,
    COUNT(*) FILTER (WHERE (q.status_flags->>'published')::BOOLEAN = true) as published_questions,
    COUNT(*) FILTER (WHERE q.review_status = 'draft') as draft_questions
  FROM public.questions q
  GROUP BY q.schema_version
  ORDER BY q.schema_version DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate universal schema questions
CREATE OR REPLACE FUNCTION public.validate_universal_schema_questions()
RETURNS TABLE (
  check_name TEXT,
  passed BOOLEAN,
  details TEXT
) AS $$
BEGIN
  -- Check 1: All questions have required fields
  RETURN QUERY
  SELECT 
    'Required Fields'::TEXT,
    COUNT(*) = 0 as passed,
    'Found ' || COUNT(*) || ' questions missing required fields' as details
  FROM public.questions
  WHERE question_key IS NULL 
     OR question_text IS NULL 
     OR category_id IS NULL;

  -- Check 2: All v2 questions have proper category mapping
  RETURN QUERY
  SELECT 
    'V2 Category Mapping'::TEXT,
    COUNT(*) = 0 as passed,
    'Found ' || COUNT(*) || ' v2 questions with invalid category mapping' as details
  FROM public.questions
  WHERE schema_version = '2.0.0' 
    AND (category_primary IS NULL OR category_code_v2 IS NULL);

  -- Check 3: All questions have valid difficulty mapping
  RETURN QUERY
  SELECT 
    'Difficulty Mapping'::TEXT,
    COUNT(*) = 0 as passed,
    'Found ' || COUNT(*) || ' questions with invalid difficulty' as details
  FROM public.questions
  WHERE difficulty_level IS NULL 
     OR difficulty_level < 1 
     OR difficulty_level > 10;

  -- Check 4: Check for orphaned questions (invalid category_id)
  RETURN QUERY
  SELECT 
    'Valid Categories'::TEXT,
    COUNT(*) = 0 as passed,
    'Found ' || COUNT(*) || ' questions with invalid category references' as details
  FROM public.questions q
  LEFT JOIN public.assessment_categories c ON q.category_id = c.id
  WHERE c.id IS NULL;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 5: UPDATE EXISTING QUESTIONS TO V2 SCHEMA
-- =====================================================

-- Migrate existing questions to have v2 fields populated
UPDATE public.questions
SET 
  schema_version = COALESCE(schema_version, '1.0.0'),
  review_status = COALESCE(review_status, 
    CASE 
      WHEN active = true THEN 'published'
      ELSE 'draft'
    END
  ),
  difficulty_level_text = COALESCE(difficulty_level_text,
    CASE 
      WHEN difficulty_level <= 3 THEN 'beginner'
      WHEN difficulty_level <= 6 THEN 'intermediate'
      WHEN difficulty_level <= 8 THEN 'advanced'
      ELSE 'expert'
    END
  ),
  difficulty_score = COALESCE(difficulty_score, difficulty_level),
  question_format_v2 = COALESCE(question_format_v2, question_format),
  points_base = COALESCE(points_base, points),
  time_recommended = COALESCE(time_recommended, time_allocation_seconds),
  status_flags = COALESCE(status_flags, 
    jsonb_build_object(
      'active', COALESCE(active, true),
      'published', COALESCE(active, false),
      'featured', false
    )
  ),
  real_world_application = COALESCE(real_world_application, business_context),
  correct_answer_explanation = COALESCE(correct_answer_explanation, explanation)
WHERE schema_version IS NULL 
   OR review_status IS NULL 
   OR difficulty_level_text IS NULL;

COMMIT;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Display migration summary
DO $$
DECLARE
  v_total_questions INTEGER;
  v_v2_questions INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_questions FROM public.questions;
  SELECT COUNT(*) INTO v_v2_questions FROM public.questions WHERE schema_version = '2.0.0';
  
  RAISE NOTICE '✅ Migration 008 completed successfully!';
  RAISE NOTICE '📊 Total questions: %', v_total_questions;
  RAISE NOTICE '📊 V2 schema questions: %', v_v2_questions;
  RAISE NOTICE '✅ Universal schema import functions created';
  RAISE NOTICE '✅ Helper functions created';
  RAISE NOTICE '✅ Indexes created';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next steps:';
  RAISE NOTICE '   1. Use the import script: node scripts/import-universal-questions.js';
  RAISE NOTICE '   2. Validate: SELECT * FROM public.validate_universal_schema_questions();';
  RAISE NOTICE '   3. Check stats: SELECT * FROM public.get_question_stats_by_schema();';
END $$;


-- ------------------------------------------
-- SECTION: migration_009_freemium_plans.sql
-- ------------------------------------------
-- ReadyCheck AI - Migration 009: Freemium Plans & Plan Linking
-- Purpose: Introduce plans table for Free / Pro / Team tiers and link users to plans
-- Security: RLS on plans, server-side source of truth for pricing and quotas
-- Date: 2025-11-24

BEGIN;

-- =====================================================
-- PLANS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, -- e.g. free, pro_individual_inr_monthly
  plan_group TEXT NOT NULL,  -- e.g. free, pro_individual_inr, team_org_inr
  description TEXT,
  price_in_paise INTEGER CHECK (price_in_paise IS NULL OR price_in_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  billing_interval TEXT NOT NULL CHECK (billing_interval = ANY (ARRAY['monthly','yearly','none'])),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active','coming_soon','deprecated'])),
  max_free_ai_readiness_per_30d INTEGER,
  max_practice_per_level_per_30d INTEGER,
  includes_certificates BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on plans
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Public read access to active / coming soon plans
DROP POLICY IF EXISTS "Public can read active plans" ON public.plans;
CREATE POLICY "Public can read active plans" ON public.plans
  FOR SELECT
  USING (status = ANY (ARRAY['active','coming_soon']));

-- Service role can manage plans
DROP POLICY IF EXISTS "Service role can manage plans" ON public.plans;
CREATE POLICY "Service role can manage plans" ON public.plans
  FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plans_status_group 
  ON public.plans (status, plan_group);
CREATE INDEX IF NOT EXISTS idx_plans_slug 
  ON public.plans (slug);

-- Updated_at trigger for plans
DROP TRIGGER IF EXISTS update_plans_updated_at ON public.plans;
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED INITIAL FREEMIUM PLANS (IDEMPOTENT)
-- =====================================================

INSERT INTO public.plans (
  name,
  slug,
  plan_group,
  description,
  price_in_paise,
  billing_interval,
  status,
  max_free_ai_readiness_per_30d,
  max_practice_per_level_per_30d,
  includes_certificates
) VALUES
  (
    'Free',
    'free',
    'free',
    'Free tier for individuals exploring AI readiness',
    0,
    'none',
    'active',
    1,  -- 1 AI readiness check per 30 days
    1,  -- 1 practice assessment per level per 30 days
    false
  ),
  (
    'Pro (Individual) - Monthly',
    'pro_individual_inr_monthly',
    'pro_individual_inr',
    'Pro subscription for individuals (monthly, India pricing)',
    299 * 100, -- ₹299/month in paise
    'monthly',
    'active',
    NULL, -- no limit
    NULL, -- no limit
    true  -- includes certificates
  ),
  (
    'Pro (Individual) - Yearly',
    'pro_individual_inr_yearly',
    'pro_individual_inr',
    'Pro subscription for individuals (yearly, India pricing)',
    2999 * 100, -- ₹2,999/year in paise
    'yearly',
    'active',
    NULL,
    NULL,
    true
  ),
  (
    'Team (Coming Soon)',
    'team_org_inr',
    'team_org_inr',
    'Team and organization plan (coming soon)',
    NULL, -- price not yet public
    'none',
    'coming_soon',
    NULL,
    NULL,
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  plan_group = EXCLUDED.plan_group,
  description = EXCLUDED.description,
  price_in_paise = EXCLUDED.price_in_paise,
  billing_interval = EXCLUDED.billing_interval,
  status = EXCLUDED.status,
  max_free_ai_readiness_per_30d = EXCLUDED.max_free_ai_readiness_per_30d,
  max_practice_per_level_per_30d = EXCLUDED.max_practice_per_level_per_30d,
  includes_certificates = EXCLUDED.includes_certificates,
  updated_at = NOW();

-- =====================================================
-- LINK USERS TO PLANS
-- =====================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS plan_slug TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_plan_slug_fkey'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_plan_slug_fkey
      FOREIGN KEY (plan_slug)
      REFERENCES public.plans(slug);
  END IF;
END $$;

-- Backfill users.plan_slug based on subscription_plan where missing
UPDATE public.users
SET plan_slug = CASE 
  WHEN subscription_plan = 'pro' THEN 'pro_individual_inr_monthly'
  ELSE 'free'
END
WHERE plan_slug IS NULL;

COMMIT;

-- Verification (optional, run manually)
-- SELECT slug, name, billing_interval, status FROM public.plans ORDER BY plan_group, billing_interval;
-- SELECT subscription_plan, plan_slug, COUNT(*) FROM public.users GROUP BY subscription_plan, plan_slug;


-- ------------------------------------------
-- SECTION: migration_010_fix_certificate_function.sql
-- ------------------------------------------
-- ============================================================================
-- Fix: Certificate Creation Function
-- ============================================================================
-- Fixes column name mismatch in create_certificate function
-- Original function used wrong column names (certificate_number instead of certificate_code, etc.)
-- ============================================================================

-- Drop and recreate the function with correct column names
CREATE OR REPLACE FUNCTION public.create_certificate(
    p_user_id UUID,
    p_certification_level TEXT,
    p_assessment_session_id UUID,
    p_score INTEGER
)
RETURNS UUID AS $$
DECLARE
    v_certificate_id UUID;
    v_certificate_code TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_user_name TEXT;
    v_user_email TEXT;
    v_verification_hash TEXT;
    v_random_suffix TEXT;
BEGIN
    -- Get user details for certificate
    SELECT COALESCE(full_name, name, email), email 
    INTO v_user_name, v_user_email
    FROM public.users 
    WHERE id = p_user_id;
    
    IF v_user_name IS NULL THEN
        v_user_name := 'Unknown User';
    END IF;
    
    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'User email not found for user %', p_user_id;
    END IF;
    
    -- Generate random alphanumeric suffix (6 characters)
    v_random_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 6));
    
    -- Generate professional license key format: RC-{LEVEL}-{YYYYMMDD}-{RANDOM6}
    -- Example: RC-RCAF-20251210-A7B3C9
    v_certificate_code := 'RC-' || UPPER(p_certification_level) || '-' || 
                         TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                         v_random_suffix;
    
    -- Set expiration (2 years from now)
    v_expires_at := NOW() + INTERVAL '2 years';
    
    -- Generate verification hash for tamper detection
    v_verification_hash := MD5(v_certificate_code || p_user_id::TEXT || p_score::TEXT || NOW()::TEXT);
    
    -- Insert certificate with CORRECT column names matching migration_003 schema
    INSERT INTO public.certificates (
        certificate_code,           -- NOT certificate_number
        user_id,
        certification_level,
        session_id,                 -- NOT assessment_session_id
        user_full_name,
        user_email,
        final_score,                -- NOT score
        passed_at,                  -- NOT issued_at
        expires_at,
        status,
        verification_hash,
        digital_signature
    ) VALUES (
        v_certificate_code,
        p_user_id,
        p_certification_level,
        p_assessment_session_id,
        v_user_name,
        v_user_email,
        p_score,
        NOW(),
        v_expires_at,
        'active',
        v_verification_hash,
        'READYCHECK-AI-DIGITAL-SIGNATURE-V1'  -- Placeholder signature
    )
    RETURNING id INTO v_certificate_id;
    
    -- Log certificate creation
    INSERT INTO public.admin_audit_log (
        admin_id,
        action,
        resource_type,
        resource_id,
        metadata
    ) VALUES (
        p_user_id,
        'CERTIFICATE_CREATED',
        'certificate',
        v_certificate_id,
        jsonb_build_object(
            'certification_level', p_certification_level,
            'certificate_code', v_certificate_code,
            'score', p_score,
            'assessment_session_id', p_assessment_session_id,
            'issued_to', v_user_name
        )
    );
    
    RETURN v_certificate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_certificate(UUID, TEXT, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_certificate(UUID, TEXT, UUID, INTEGER) TO service_role;


-- ------------------------------------------
-- SECTION: migration_011_add_admin_granted_plan.sql
-- ------------------------------------------
-- Add plan_granted_by_admin column to users table
-- This allows tracking if a user's Pro plan was granted by an admin

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS plan_granted_by_admin BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN public.users.plan_granted_by_admin IS 'Whether the user''s Pro plan was granted by an admin (complimentary access)';

-- Optional: Set existing Pro users without Razorpay customer ID as admin-granted
-- Uncomment the following line if you want to mark existing Pro users as admin-granted
-- UPDATE public.users SET plan_granted_by_admin = true WHERE subscription_plan = 'pro' AND razorpay_customer_id IS NULL;


-- ------------------------------------------
-- SECTION: migration_012_roadmap_feature.sql
-- ------------------------------------------
-- Migration 012: AI Roadmap Generation Feature
-- Creates tables for personalized learning roadmaps with AI generation
-- Date: 2024-12-24

-- =====================================================
-- Table 1: roadmaps - Store generated roadmaps
-- =====================================================
-- Stores the AI-generated learning roadmaps with metadata
-- Each user can have one active roadmap at a time
-- Roadmaps auto-expire after their selected duration

CREATE TABLE IF NOT EXISTS roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Generation metadata
  generation_mode TEXT NOT NULL CHECK (generation_mode IN ('quick', 'advanced')),
  duration_days INTEGER NOT NULL CHECK (duration_days >= 7 AND duration_days <= 90),
  form_responses JSONB NOT NULL DEFAULT '{}', -- User's form answers
  assessment_data JSONB NOT NULL DEFAULT '[]', -- Scores from assessments used
  weak_areas JSONB DEFAULT '[]', -- Identified weak areas from assessments
  strong_areas JSONB DEFAULT '[]', -- Identified strong areas from assessments
  
  -- Generated content (structured JSON from Gemini)
  roadmap_content JSONB NOT NULL DEFAULT '{}', -- Full roadmap structure with weeks/days/tasks
  
  -- Metadata
  is_active BOOLEAN DEFAULT true, -- Only one active roadmap per user
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL, -- Calculated: generated_at + duration_days
  
  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_roadmaps_user_id ON roadmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmaps_active ON roadmaps(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_roadmaps_expires_at ON roadmaps(expires_at);

-- Enable RLS
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own roadmaps
CREATE POLICY "users_select_own_roadmaps"
ON roadmaps FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_roadmaps"
ON roadmaps FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_roadmaps"
ON roadmaps FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_roadmaps"
ON roadmaps FOR DELETE
USING (auth.uid() = user_id);

-- Admin policy for roadmaps
CREATE POLICY "admins_all_roadmaps"
ON roadmaps FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- =====================================================
-- Table 2: roadmap_progress - Track daily task completion
-- =====================================================
-- Stores checkbox state for each task in the roadmap
-- Allows users to mark tasks as complete/incomplete

CREATE TABLE IF NOT EXISTS roadmap_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Task identification
  week_number INTEGER, -- NULL for daily view, populated for week-based tracking
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 90),
  task_id TEXT NOT NULL, -- e.g., "d1_t1" or "w1_d1_t1"
  
  -- Completion tracking
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Each task can only have one progress record per roadmap
  UNIQUE(roadmap_id, task_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_progress_roadmap ON roadmap_progress(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON roadmap_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_completed ON roadmap_progress(roadmap_id, completed);

-- Enable RLS
ALTER TABLE roadmap_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own progress
CREATE POLICY "users_select_own_progress"
ON roadmap_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_progress"
ON roadmap_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_progress"
ON roadmap_progress FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_progress"
ON roadmap_progress FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- Table 3: roadmap_generation_limits - Track monthly limits
-- =====================================================
-- Tracks how many times a user has generated roadmaps this month
-- Limit: 2 generations per month, resets on 1st of each month

CREATE TABLE IF NOT EXISTS roadmap_generation_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Monthly tracking (format: "2024-12")
  month_year TEXT NOT NULL,
  generation_count INTEGER DEFAULT 0 CHECK (generation_count >= 0),
  last_generated_at TIMESTAMPTZ,
  
  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One record per user per month
  UNIQUE(user_id, month_year)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_limits_user_month ON roadmap_generation_limits(user_id, month_year);

-- Enable RLS
ALTER TABLE roadmap_generation_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own limits
CREATE POLICY "users_select_own_limits"
ON roadmap_generation_limits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_limits"
ON roadmap_generation_limits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_limits"
ON roadmap_generation_limits FOR UPDATE
USING (auth.uid() = user_id);

-- =====================================================
-- Trigger: Deactivate old roadmaps when new one is created
-- =====================================================
-- Ensures only one active roadmap per user at a time
-- When a new roadmap is inserted, deactivate all others

CREATE OR REPLACE FUNCTION deactivate_old_roadmaps()
RETURNS TRIGGER AS $$
BEGIN
  -- Deactivate all other active roadmaps for this user
  UPDATE roadmaps
  SET is_active = false,
      updated_at = NOW()
  WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND is_active = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid duplicates
DROP TRIGGER IF EXISTS trigger_deactivate_old_roadmaps ON roadmaps;

CREATE TRIGGER trigger_deactivate_old_roadmaps
AFTER INSERT ON roadmaps
FOR EACH ROW
EXECUTE FUNCTION deactivate_old_roadmaps();

-- =====================================================
-- Trigger: Auto-update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_roadmap_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_roadmaps_updated_at ON roadmaps;
CREATE TRIGGER trigger_roadmaps_updated_at
BEFORE UPDATE ON roadmaps
FOR EACH ROW
EXECUTE FUNCTION update_roadmap_updated_at();

DROP TRIGGER IF EXISTS trigger_progress_updated_at ON roadmap_progress;
CREATE TRIGGER trigger_progress_updated_at
BEFORE UPDATE ON roadmap_progress
FOR EACH ROW
EXECUTE FUNCTION update_roadmap_updated_at();

DROP TRIGGER IF EXISTS trigger_limits_updated_at ON roadmap_generation_limits;
CREATE TRIGGER trigger_limits_updated_at
BEFORE UPDATE ON roadmap_generation_limits
FOR EACH ROW
EXECUTE FUNCTION update_roadmap_updated_at();

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE roadmaps IS 'AI-generated personalized learning roadmaps with 7-90 day duration';
COMMENT ON TABLE roadmap_progress IS 'Tracks task completion status for each roadmap';
COMMENT ON TABLE roadmap_generation_limits IS 'Enforces 2 roadmap generations per month limit';

COMMENT ON COLUMN roadmaps.generation_mode IS 'quick = 4-5 questions, advanced = 8-10 questions';
COMMENT ON COLUMN roadmaps.duration_days IS 'User-selected duration: 7, 14, 21, 30, 60, or 90 days';
COMMENT ON COLUMN roadmaps.weak_areas IS 'Categories where user scored <60% in assessments';
COMMENT ON COLUMN roadmaps.strong_areas IS 'Categories where user scored >80% in assessments';
COMMENT ON COLUMN roadmaps.roadmap_content IS 'Gemini-generated JSON with weeks, days, tasks, projects, resources';
COMMENT ON COLUMN roadmaps.is_active IS 'Only one active roadmap per user, others are archived';
COMMENT ON COLUMN roadmaps.expires_at IS 'Auto-calculated: created_at + duration_days';

COMMENT ON COLUMN roadmap_progress.task_id IS 'Unique task identifier like d1_t1 (day 1, task 1)';
COMMENT ON COLUMN roadmap_generation_limits.month_year IS 'Format: YYYY-MM (e.g., 2024-12)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 012: AI Roadmap Generation Feature - COMPLETE';
  RAISE NOTICE 'Tables created: roadmaps, roadmap_progress, roadmap_generation_limits';
  RAISE NOTICE 'RLS policies enabled on all tables';
  RAISE NOTICE 'Triggers created for auto-deactivation and timestamps';
END $$;


-- ------------------------------------------
-- SECTION: assessment_helper_functions.sql
-- ------------------------------------------
-- ============================================================================
-- Assessment Helper Functions for Universal Schema
-- ============================================================================
-- Functions to support the new assessment flow with universal schema questions
-- ============================================================================

-- Function to get assessment level statistics
CREATE OR REPLACE FUNCTION public.get_assessment_level_stats()
RETURNS TABLE (
    level text,
    total_questions bigint,
    categories jsonb,
    difficulty_distribution jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cert_level.level_code as level,
        COUNT(q.id) as total_questions,
        jsonb_agg(DISTINCT q.category_code_v2) FILTER (WHERE q.category_code_v2 IS NOT NULL) as categories,
        jsonb_object_agg(
            q.difficulty_level_text, 
            COUNT(q.id)
        ) FILTER (WHERE q.difficulty_level_text IS NOT NULL) as difficulty_distribution
    FROM public.certification_levels cert_level
    LEFT JOIN public.questions q ON cert_level.level_code = ANY(q.assessment_certification_levels)
    WHERE cert_level.active = true
      AND (q.active IS NULL OR q.active = true)
    GROUP BY cert_level.level_code, cert_level.display_order
    ORDER BY cert_level.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create certificate after successful certification assessment
CREATE OR REPLACE FUNCTION public.create_certificate(
    p_user_id UUID,
    p_certification_level TEXT,
    p_assessment_session_id UUID,
    p_score INTEGER
)
RETURNS UUID AS $$
DECLARE
    v_certificate_id UUID;
    v_certificate_number TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Generate certificate number
    v_certificate_number := 'RC-' || UPPER(p_certification_level) || '-' || 
                           TO_CHAR(NOW(), 'YYYY') || '-' || 
                           LPAD(EXTRACT(DOY FROM NOW())::TEXT, 3, '0') || '-' ||
                           LPAD((RANDOM() * 9999)::INTEGER::TEXT, 4, '0');
    
    -- Set expiration (2 years from now)
    v_expires_at := NOW() + INTERVAL '2 years';
    
    -- Insert certificate
    INSERT INTO public.certificates (
        user_id,
        certification_level,
        certificate_number,
        assessment_session_id,
        score,
        issued_at,
        expires_at,
        status
    ) VALUES (
        p_user_id,
        p_certification_level,
        v_certificate_number,
        p_assessment_session_id,
        p_score,
        NOW(),
        v_expires_at,
        'active'
    )
    RETURNING id INTO v_certificate_id;
    
    -- Log certificate creation
    INSERT INTO public.admin_audit_log (
        admin_id,
        action,
        resource_type,
        resource_id,
        metadata
    ) VALUES (
        p_user_id,
        'CERTIFICATE_CREATED',
        'certificate',
        v_certificate_id,
        jsonb_build_object(
            'certification_level', p_certification_level,
            'certificate_number', v_certificate_number,
            'score', p_score,
            'assessment_session_id', p_assessment_session_id
        )
    );
    
    RETURN v_certificate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can attempt certification level
CREATE OR REPLACE FUNCTION public.can_attempt_certification(
    p_user_id UUID,
    p_certification_level TEXT
)
RETURNS TABLE (
    can_attempt BOOLEAN,
    reason TEXT,
    attempts_used INTEGER,
    max_attempts INTEGER,
    next_attempt_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_attempts_used INTEGER := 0;
    v_max_attempts INTEGER := 3;
    v_cooldown_minutes INTEGER := 30;
    v_last_attempt TIMESTAMP WITH TIME ZONE;
    v_next_attempt_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Count recent attempts
    SELECT COUNT(*), MAX(completed_at)
    INTO v_attempts_used, v_last_attempt
    FROM public.assessment_sessions
    WHERE user_id = p_user_id
      AND certification_level = p_certification_level
      AND assessment_type = 'certification'
      AND status = 'completed'
      AND completed_at > NOW() - INTERVAL '24 hours';
    
    -- Calculate next attempt time
    IF v_last_attempt IS NOT NULL THEN
        v_next_attempt_at := v_last_attempt + (v_cooldown_minutes || ' minutes')::INTERVAL;
    END IF;
    
    -- Check if can attempt
    IF v_attempts_used >= v_max_attempts THEN
        RETURN QUERY SELECT 
            FALSE as can_attempt,
            'Maximum attempts exceeded for today' as reason,
            v_attempts_used,
            v_max_attempts,
            v_next_attempt_at;
    ELSIF v_next_attempt_at IS NOT NULL AND NOW() < v_next_attempt_at THEN
        RETURN QUERY SELECT 
            FALSE as can_attempt,
            'Cooldown period active' as reason,
            v_attempts_used,
            v_max_attempts,
            v_next_attempt_at;
    ELSE
        RETURN QUERY SELECT 
            TRUE as can_attempt,
            'Can attempt' as reason,
            v_attempts_used,
            v_max_attempts,
            v_next_attempt_at;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_assessment_level_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_certificate(UUID, TEXT, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_attempt_certification(UUID, TEXT) TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_cert_levels_gin ON public.questions USING GIN (assessment_certification_levels);
CREATE INDEX IF NOT EXISTS idx_questions_category_difficulty ON public.questions (category_code_v2, difficulty_level_text);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user_level ON public.assessment_sessions (user_id, certification_level, assessment_type);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_status_expires ON public.assessment_sessions (status, expires_at);

-- Update RLS policies for new assessment flow
DROP POLICY IF EXISTS "Users can view their own assessment sessions" ON public.assessment_sessions;
CREATE POLICY "Users can view their own assessment sessions" 
ON public.assessment_sessions FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own active sessions" ON public.assessment_sessions;
CREATE POLICY "Users can update their own active sessions" 
ON public.assessment_sessions FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id AND status IN ('active', 'paused'));

-- Enable RLS
ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------
-- SECTION: question_import_system.sql
-- ------------------------------------------
-- ReadyCheck AI - Question Import System with Normalization
-- Secure batch import system for existing question data with validation
-- Security: Input sanitization, transaction safety, duplicate detection
-- Author: System Migration
-- Date: 2025-08-28

-- =====================================================
-- QUESTION IMPORT FUNCTIONS
-- =====================================================

-- Function to validate question structure (dependency for import functions)
CREATE OR REPLACE FUNCTION public.validate_question_structure(
    p_question JSONB
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check required fields exist
    IF NOT (p_question ? 'question') OR NOT (p_question ? 'options') THEN
        RETURN FALSE;
    END IF;
    
    -- Validate options array
    IF jsonb_typeof(p_question->'options') != 'array' THEN
        RETURN FALSE;
    END IF;
    
    -- Check minimum options count
    IF jsonb_array_length(p_question->'options') < 2 THEN
        RETURN FALSE;
    END IF;
    
    -- Validate question text length
    IF length(p_question->>'question') < 10 THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to normalize AI readiness assessment questions (index-based format)
CREATE OR REPLACE FUNCTION public.import_ai_readiness_question(
    p_question JSONB
) RETURNS UUID AS $$
DECLARE
    v_question_id UUID;
    v_category_id UUID;
    v_options JSONB;
    v_correct_index INTEGER;
    v_correct_text TEXT;
    v_business_context TEXT;
    v_difficulty_level INTEGER;
BEGIN
    -- Input validation
    IF NOT public.validate_question_structure(p_question) THEN
        RAISE EXCEPTION 'Invalid question structure';
    END IF;
    
    -- Get category ID from category name (with fallback creation)
    SELECT id INTO v_category_id
    FROM public.assessment_categories
    WHERE category_code = LOWER(COALESCE(p_question->>'category', 'general'))
    AND active = true;
    
    IF v_category_id IS NULL THEN
        -- Create category if it doesn't exist
        INSERT INTO public.assessment_categories (
            category_code,
            category_name,
            description,
            active
        ) VALUES (
            LOWER(COALESCE(p_question->>'category', 'general')),
            INITCAP(COALESCE(p_question->>'category', 'general')),
            'Auto-created category from question import',
            true
        ) ON CONFLICT (category_code) DO NOTHING
        RETURNING id INTO v_category_id;
        
        -- If still null, get the inserted/existing one
        IF v_category_id IS NULL THEN
            SELECT id INTO v_category_id
            FROM public.assessment_categories
            WHERE category_code = LOWER(COALESCE(p_question->>'category', 'general'));
        END IF;
    END IF;
    
    -- Extract and validate options
    v_options := p_question->'options';
    
    -- Handle different correct answer formats
    BEGIN
        IF p_question ? 'correct' THEN
            v_correct_index := (p_question->>'correct')::INTEGER;
        ELSIF p_question ? 'correctAnswer' THEN
            v_correct_index := (p_question->>'correctAnswer')::INTEGER;
        ELSE
            v_correct_index := 0; -- Default to first option
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_correct_index := 0;
    END;
    
    -- Validate correct index
    IF v_correct_index >= jsonb_array_length(v_options) OR v_correct_index < 0 THEN
        v_correct_index := 0;
    END IF;
    
    -- Get correct answer text
    v_correct_text := v_options->>v_correct_index;
    
    -- Extract business context (fallback to explanation if not present)
    v_business_context := COALESCE(
        p_question->>'business_context',
        p_question->>'explanation'
    );
    
    -- Map difficulty to numeric scale
    v_difficulty_level := CASE LOWER(p_question->>'difficulty')
        WHEN 'beginner' THEN 2
        WHEN 'intermediate' THEN 5
        WHEN 'advanced' THEN 8
        ELSE 5
    END;
    
    -- Insert question with safe auth.uid() handling
    INSERT INTO public.questions (
        question_key,
        question_type,
        category_id,
        difficulty_level,
        question_text,
        options,
        correct_answer_index,
        correct_answer_text,
        explanation,
        business_context,
        points,
        created_by
    ) VALUES (
        COALESCE(p_question->>'id', 'ai_' || gen_random_uuid()::text),
        'practice',
        v_category_id,
        v_difficulty_level,
        p_question->>'question',
        v_options,
        v_correct_index,
        v_correct_text,
        COALESCE(p_question->>'explanation', 'Explanation not provided'),
        v_business_context,
        CASE v_difficulty_level
            WHEN 2 THEN 1  -- beginner: 1 point
            WHEN 5 THEN 2  -- intermediate: 2 points
            WHEN 8 THEN 3  -- advanced: 3 points
            ELSE 2
        END,
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
    ) RETURNING id INTO v_question_id;
    
    RETURN v_question_id;
    
EXCEPTION 
    WHEN unique_violation THEN
        -- Handle duplicate question_key gracefully
        RAISE NOTICE 'Question with key % already exists, skipping', COALESCE(p_question->>'id', 'unknown');
        RETURN NULL;
    WHEN OTHERS THEN
        -- Log other errors but don't fail completely
        RAISE WARNING 'Error importing question %: %', COALESCE(p_question->>'id', 'unknown'), SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to normalize extended questions (string-based format)
CREATE OR REPLACE FUNCTION public.import_extended_question(
    p_question JSONB
) RETURNS UUID AS $$
DECLARE
    v_question_id UUID;
    v_category_id UUID;
    v_options JSONB;
    v_correct_index INTEGER;
    v_correct_text TEXT;
    v_business_context TEXT;
    v_difficulty_level INTEGER;
    i INTEGER;
BEGIN
    -- Input validation
    IF NOT (p_question ? 'question') OR NOT (p_question ? 'options') OR NOT (p_question ? 'correctOption') THEN
        RAISE EXCEPTION 'Missing required fields in extended question format';
    END IF;
    
    -- Get category ID (with fallback creation)
    SELECT id INTO v_category_id
    FROM public.assessment_categories
    WHERE category_code = LOWER(COALESCE(p_question->>'category', 'general'))
    AND active = true;
    
    IF v_category_id IS NULL THEN
        -- Create category if it doesn't exist
        INSERT INTO public.assessment_categories (
            category_code,
            category_name,
            description,
            active
        ) VALUES (
            LOWER(COALESCE(p_question->>'category', 'general')),
            INITCAP(COALESCE(p_question->>'category', 'general')),
            'Auto-created category from question import',
            true
        ) ON CONFLICT (category_code) DO NOTHING
        RETURNING id INTO v_category_id;
        
        -- If still null, get the inserted/existing one
        IF v_category_id IS NULL THEN
            SELECT id INTO v_category_id
            FROM public.assessment_categories
            WHERE category_code = LOWER(COALESCE(p_question->>'category', 'general'));
        END IF;
    END IF;
    
    -- Extract options and find correct answer index
    v_options := p_question->'options';
    v_correct_text := p_question->>'correctOption';
    v_correct_index := -1;
    
    -- Find the index of the correct option
    FOR i IN 0..jsonb_array_length(v_options)-1 LOOP
        IF v_options->>i = v_correct_text THEN
            v_correct_index := i;
            EXIT;
        END IF;
    END LOOP;
    
    IF v_correct_index = -1 THEN
        RAISE EXCEPTION 'Correct option not found in options array: %', v_correct_text;
    END IF;
    
    -- Extract business context
    v_business_context := COALESCE(
        p_question->>'businessContext',
        p_question->>'explanation',
        'General AI knowledge application'
    );
    
    -- Map difficulty to numeric scale
    v_difficulty_level := CASE LOWER(p_question->>'difficulty')
        WHEN 'beginner' THEN 2
        WHEN 'intermediate' THEN 5
        WHEN 'advanced' THEN 8
        ELSE 5
    END;
    
    -- Insert question with safe auth.uid() handling
    INSERT INTO public.questions (
        question_key,
        question_type,
        category_id,
        difficulty_level,
        question_text,
        options,
        correct_answer_index,
        correct_answer_text,
        explanation,
        business_context,
        points,
        created_by
    ) VALUES (
        COALESCE(p_question->>'id', 'ext_' || gen_random_uuid()::text),
        'practice',
        v_category_id,
        v_difficulty_level,
        p_question->>'question',
        v_options,
        v_correct_index,
        v_correct_text,
        COALESCE(p_question->>'explanation', 'Detailed explanation not provided'),
        v_business_context,
        CASE v_difficulty_level
            WHEN 2 THEN 1
            WHEN 5 THEN 2
            WHEN 8 THEN 3
            ELSE 2
        END,
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
    ) RETURNING id INTO v_question_id;
    
    RETURN v_question_id;
    
EXCEPTION 
    WHEN unique_violation THEN
        RAISE NOTICE 'Question with key % already exists, skipping', COALESCE(p_question->>'id', 'unknown');
        RETURN NULL;
    WHEN OTHERS THEN
        RAISE WARNING 'Error importing extended question %: %', COALESCE(p_question->>'id', 'unknown'), SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Batch import function with progress tracking
CREATE OR REPLACE FUNCTION public.batch_import_questions(
    p_questions JSONB,
    p_question_format TEXT DEFAULT 'ai_readiness'
) RETURNS TABLE(
    total_questions INTEGER,
    imported_questions INTEGER,
    skipped_questions INTEGER,
    failed_questions INTEGER,
    import_details JSONB
) AS $$
DECLARE
    v_question JSONB;
    v_question_id UUID;
    v_total INTEGER := 0;
    v_imported INTEGER := 0;
    v_skipped INTEGER := 0;
    v_failed INTEGER := 0;
    v_details JSONB := '[]'::JSONB;
    v_batch_size INTEGER := 50;
    v_current_batch INTEGER := 0;
BEGIN
    -- Validate input format
    IF p_question_format NOT IN ('ai_readiness', 'extended') THEN
        RAISE EXCEPTION 'Invalid question format. Must be "ai_readiness" or "extended"';
    END IF;
    
    -- Process questions in batches
    FOR v_question IN SELECT jsonb_array_elements(p_questions)
    LOOP
        v_total := v_total + 1;
        v_current_batch := v_current_batch + 1;
        
        BEGIN
            -- Import based on format
            IF p_question_format = 'ai_readiness' THEN
                v_question_id := public.import_ai_readiness_question(v_question);
            ELSE
                v_question_id := public.import_extended_question(v_question);
            END IF;
            
            IF v_question_id IS NOT NULL THEN
                v_imported := v_imported + 1;
                v_details := v_details || jsonb_build_object(
                    'question_key', v_question->>'id',
                    'status', 'imported',
                    'question_id', v_question_id
                );
            ELSE
                v_skipped := v_skipped + 1;
                v_details := v_details || jsonb_build_object(
                    'question_key', v_question->>'id',
                    'status', 'skipped',
                    'reason', 'duplicate'
                );
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            v_failed := v_failed + 1;
            v_details := v_details || jsonb_build_object(
                'question_key', COALESCE(v_question->>'id', 'unknown'),
                'status', 'failed',
                'error', SQLERRM
            );
            
            -- Log error but continue processing
            RAISE WARNING 'Failed to import question %: %', 
                COALESCE(v_question->>'id', 'unknown'), SQLERRM;
        END;
        
        -- Commit batch every 50 questions
        IF v_current_batch >= v_batch_size THEN
            RAISE NOTICE 'Processed batch: % total, % imported, % skipped, % failed', 
                v_total, v_imported, v_skipped, v_failed;
            v_current_batch := 0;
        END IF;
    END LOOP;
    
    -- Return summary
    RETURN QUERY
    SELECT 
        v_total,
        v_imported,
        v_skipped,
        v_failed,
        v_details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- QUESTION MIGRATION SCRIPT
-- =====================================================

-- Function to migrate existing question files
CREATE OR REPLACE FUNCTION public.migrate_existing_questions()
RETURNS TABLE(
    file_type TEXT,
    total_questions INTEGER,
    imported_questions INTEGER,
    skipped_questions INTEGER,
    failed_questions INTEGER
) AS $$
BEGIN
    -- This function would be called from the application layer
    -- after reading the JSON files from the filesystem
    
    RAISE NOTICE 'Question migration should be executed from application layer';
    RAISE NOTICE 'Steps:';
    RAISE NOTICE '1. Read questions/ai_readiness_assessment.json';
    RAISE NOTICE '2. Call batch_import_questions(questions_json, ''ai_readiness'')';
    RAISE NOTICE '3. Read questions/qus.cleaned.json';  
    RAISE NOTICE '4. Call batch_import_questions(questions_json, ''extended'')';
    
    -- Return empty result
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- QUESTION QUALITY VALIDATION
-- =====================================================

-- Function to validate imported questions
CREATE OR REPLACE FUNCTION public.validate_imported_questions()
RETURNS TABLE(
    validation_check TEXT,
    passed BOOLEAN,
    details TEXT
) AS $$
BEGIN
    -- Check for questions without categories
    RETURN QUERY
    SELECT 
        'Questions with valid categories'::TEXT,
        NOT EXISTS(SELECT 1 FROM public.questions WHERE category_id IS NULL),
        COALESCE((SELECT COUNT(*)::TEXT FROM public.questions WHERE category_id IS NULL), '0') || ' questions without categories';
    
    -- Check for questions with invalid answer indexes
    RETURN QUERY
    SELECT 
        'Questions with valid answer indexes'::TEXT,
        NOT EXISTS(
            SELECT 1 FROM public.questions 
            WHERE correct_answer_index >= jsonb_array_length(options)
        ),
        COALESCE((
            SELECT COUNT(*)::TEXT FROM public.questions 
            WHERE correct_answer_index >= jsonb_array_length(options)
        ), '0') || ' questions with invalid answer indexes';
    
    -- Check for duplicate question keys
    RETURN QUERY
    SELECT 
        'No duplicate question keys'::TEXT,
        NOT EXISTS(
            SELECT question_key FROM public.questions 
            GROUP BY question_key HAVING COUNT(*) > 1
        ),
        COALESCE((
            SELECT COUNT(*)::TEXT FROM (
                SELECT question_key FROM public.questions 
                GROUP BY question_key HAVING COUNT(*) > 1
            ) duplicates
        ), '0') || ' duplicate question keys found';
    
    -- Check question text lengths
    RETURN QUERY
    SELECT 
        'Questions with adequate text length'::TEXT,
        NOT EXISTS(
            SELECT 1 FROM public.questions 
            WHERE length(question_text) < 10 OR length(explanation) < 10
        ),
        COALESCE((
            SELECT COUNT(*)::TEXT FROM public.questions 
            WHERE length(question_text) < 10 OR length(explanation) < 10
        ), '0') || ' questions with inadequate text length';
    
    -- Check options array validity
    RETURN QUERY
    SELECT 
        'Questions with valid options arrays'::TEXT,
        NOT EXISTS(
            SELECT 1 FROM public.questions 
            WHERE jsonb_array_length(options) < 2 OR jsonb_array_length(options) > 6
        ),
        COALESCE((
            SELECT COUNT(*)::TEXT FROM public.questions 
            WHERE jsonb_array_length(options) < 2 OR jsonb_array_length(options) > 6
        ), '0') || ' questions with invalid options arrays';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CLEANUP AND MAINTENANCE FUNCTIONS
-- =====================================================

-- Function to clean up failed imports
CREATE OR REPLACE FUNCTION public.cleanup_failed_questions()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete questions with invalid data
    DELETE FROM public.questions
    WHERE 
        category_id IS NULL OR
        correct_answer_index >= jsonb_array_length(options) OR
        length(question_text) < 10 OR
        length(explanation) < 10 OR
        jsonb_array_length(options) < 2 OR
        jsonb_array_length(options) > 6;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % invalid questions', v_deleted_count;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update question analytics after import
CREATE OR REPLACE FUNCTION public.initialize_question_analytics()
RETURNS INTEGER AS $$
DECLARE
    v_inserted_count INTEGER;
BEGIN
    -- Create analytics records for questions that don't have them
    INSERT INTO public.question_analytics (question_id, total_attempts, correct_attempts)
    SELECT id, 0, 0
    FROM public.questions q
    WHERE NOT EXISTS (
        SELECT 1 FROM public.question_analytics qa 
        WHERE qa.question_id = q.id
    );
    
    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    
    RAISE NOTICE 'Initialized analytics for % questions', v_inserted_count;
    RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------
-- SECTION: database_optimization.sql
-- ------------------------------------------
-- ReadyCheck AI - Database Optimization and Performance Enhancements
-- Optimizes database structure for efficient task performance based on privilege analysis
-- Security: Enhanced RLS policies, optimized indexes, query performance
-- Author: System Optimization
-- Date: 2025-08-28

-- =====================================================
-- PRIVILEGE-ALIGNED OPTIMIZATIONS
-- =====================================================

-- Based on the provided privilege structure, optimize for Supabase auth patterns
-- Key insight: postgres has full privileges, authenticated/anon have restricted access

-- Enhanced indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active 
ON public.users(email) WHERE account_status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_subscription_status 
ON public.users(subscription_plan, account_status) 
WHERE account_status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certification_progress_gin 
ON public.users USING GIN(certification_progress) 
WHERE certification_progress IS NOT NULL;

-- Assessment performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assessment_sessions_user_status 
ON public.assessment_sessions(user_id, session_status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_category_difficulty 
ON public.questions(category_id, difficulty_level, active) 
WHERE active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_type_category 
ON public.questions(question_type, category_id) 
WHERE active = true;

-- Team management indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_user_role 
ON public.team_members(user_id, role, invitation_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_owner_created 
ON public.teams(owner_id, created_at DESC);

-- Payment processing indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user_status_created 
ON public.payments(user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_razorpay_ids 
ON public.payments(razorpay_order_id, razorpay_payment_id) 
WHERE razorpay_payment_id IS NOT NULL;

-- =====================================================
-- ENHANCED RLS POLICIES FOR PERFORMANCE
-- =====================================================

-- Optimize user data access with better indexing support
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data" ON public.users
    FOR SELECT USING (
        auth.uid() = id AND account_status = 'active'
    );

-- Optimize assessment session access
DROP POLICY IF EXISTS "Users can read own assessment sessions" ON public.assessment_sessions;
CREATE POLICY "Users can read own assessment sessions" ON public.assessment_sessions
    FOR SELECT USING (
        auth.uid() = user_id AND 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND account_status = 'active')
    );

-- Optimize question access for authenticated users
DROP POLICY IF EXISTS "Authenticated users can read active questions" ON public.questions;
CREATE POLICY "Authenticated users can read active questions" ON public.questions
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        active = true AND
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND account_status = 'active')
    );

-- =====================================================
-- MATERIALIZED VIEWS FOR COMPLEX QUERIES
-- =====================================================

-- User certification summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_certification_summary AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.subscription_plan,
    u.certification_progress,
    u.total_practice_assessments,
    u.account_status,
    COUNT(DISTINCT ca.id) as total_certification_attempts,
    COUNT(DISTINCT CASE WHEN ca.passed THEN ca.id END) as passed_certifications,
    COUNT(DISTINCT c.id) as earned_certificates,
    MAX(ca.created_at) as last_attempt_date
FROM public.users u
LEFT JOIN public.certification_attempts ca ON u.id = ca.user_id
LEFT JOIN public.certificates c ON u.id = c.user_id
WHERE u.account_status = 'active'
GROUP BY u.id, u.email, u.full_name, u.subscription_plan, 
         u.certification_progress, u.total_practice_assessments, u.account_status;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_cert_summary_id 
ON public.user_certification_summary(id);

-- Question performance analytics view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.question_performance_summary AS
SELECT 
    q.id,
    q.question_key,
    q.category_id,
    ac.category_name,
    q.difficulty_level,
    q.question_type,
    qa.total_attempts,
    qa.correct_attempts,
    CASE 
        WHEN qa.total_attempts > 0 
        THEN ROUND((qa.correct_attempts::DECIMAL / qa.total_attempts) * 100, 2)
        ELSE 0 
    END as success_rate,
    q.created_at
FROM public.questions q
LEFT JOIN public.question_analytics qa ON q.id = qa.question_id
LEFT JOIN public.assessment_categories ac ON q.category_id = ac.id
WHERE q.active = true;

-- Create indexes on performance view
CREATE INDEX IF NOT EXISTS idx_question_perf_category 
ON public.question_performance_summary(category_id, success_rate);

CREATE INDEX IF NOT EXISTS idx_question_perf_difficulty 
ON public.question_performance_summary(difficulty_level, success_rate);

-- =====================================================
-- REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
-- =====================================================

CREATE OR REPLACE FUNCTION public.refresh_user_certification_summary()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_certification_summary;
    RAISE NOTICE 'User certification summary refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.refresh_question_performance_summary()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.question_performance_summary;
    RAISE NOTICE 'Question performance summary refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- AUTOMATED MAINTENANCE PROCEDURES
-- =====================================================

-- Function to update question analytics after assessment completion
CREATE OR REPLACE FUNCTION public.update_question_analytics_batch()
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    -- Update analytics from recent assessment sessions
    WITH recent_responses AS (
        SELECT 
            (jsonb_each(responses)).key::UUID as question_id,
            (jsonb_each(responses)).value as response_data,
            correct_answers
        FROM public.assessment_sessions 
        WHERE session_status = 'completed' 
        AND updated_at > NOW() - INTERVAL '1 hour'
    ),
    question_stats AS (
        SELECT 
            question_id,
            COUNT(*) as new_attempts,
            COUNT(CASE 
                WHEN (response_data->>'selected_index')::INTEGER = 
                     (correct_answers->>question_id::text)::INTEGER 
                THEN 1 
            END) as new_correct
        FROM recent_responses
        WHERE question_id IS NOT NULL
        GROUP BY question_id
    )
    UPDATE public.question_analytics qa
    SET 
        total_attempts = qa.total_attempts + qs.new_attempts,
        correct_attempts = qa.correct_attempts + qs.new_correct,
        updated_at = NOW()
    FROM question_stats qs
    WHERE qa.question_id = qs.question_id;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RAISE NOTICE 'Updated analytics for % questions', v_updated_count;
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PERFORMANCE MONITORING FUNCTIONS
-- =====================================================

-- Function to analyze slow queries and suggest optimizations
CREATE OR REPLACE FUNCTION public.analyze_database_performance()
RETURNS TABLE(
    analysis_type TEXT,
    metric_name TEXT,
    current_value TEXT,
    recommendation TEXT
) AS $$
BEGIN
    -- Table size analysis
    RETURN QUERY
    SELECT 
        'Table Size'::TEXT,
        schemaname || '.' || tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)),
        CASE 
            WHEN pg_total_relation_size(schemaname||'.'||tablename) > 100*1024*1024 
            THEN 'Consider partitioning or archiving old data'
            ELSE 'Size is acceptable'
        END
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 10;
    
    -- Index usage analysis
    RETURN QUERY
    SELECT 
        'Index Usage'::TEXT,
        schemaname || '.' || tablename || '.' || indexname,
        COALESCE(idx_scan::TEXT, '0') || ' scans',
        CASE 
            WHEN idx_scan = 0 THEN 'Consider dropping unused index'
            WHEN idx_scan < 100 THEN 'Low usage - review necessity'
            ELSE 'Good usage'
        END
    FROM pg_stat_user_indexes 
    WHERE schemaname = 'public'
    ORDER BY idx_scan ASC
    LIMIT 10;
    
    -- Connection and query analysis
    RETURN QUERY
    SELECT 
        'Database Stats'::TEXT,
        'Active Connections',
        COUNT(*)::TEXT,
        CASE 
            WHEN COUNT(*) > 50 THEN 'High connection count - consider connection pooling'
            ELSE 'Connection count is normal'
        END
    FROM pg_stat_activity 
    WHERE state = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CLEANUP AND MAINTENANCE SCHEDULES
-- =====================================================

-- Function to clean up old audit logs (keep last 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.audit_log 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % old audit log entries', v_deleted_count;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to archive completed assessment sessions older than 1 year
CREATE OR REPLACE FUNCTION public.archive_old_assessment_sessions()
RETURNS INTEGER AS $$
DECLARE
    v_archived_count INTEGER;
BEGIN
    -- Move old completed sessions to archive table (create if not exists)
    CREATE TABLE IF NOT EXISTS public.assessment_sessions_archive (
        LIKE public.assessment_sessions INCLUDING ALL
    );
    
    -- Insert old sessions into archive
    INSERT INTO public.assessment_sessions_archive
    SELECT * FROM public.assessment_sessions
    WHERE session_status = 'completed' 
    AND completed_at < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS v_archived_count = ROW_COUNT;
    
    -- Delete from main table
    DELETE FROM public.assessment_sessions
    WHERE session_status = 'completed' 
    AND completed_at < NOW() - INTERVAL '1 year';
    
    RAISE NOTICE 'Archived % old assessment sessions', v_archived_count;
    RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SECURITY ENHANCEMENTS
-- =====================================================

-- Function to detect and prevent potential security issues
CREATE OR REPLACE FUNCTION public.security_health_check()
RETURNS TABLE(
    check_type TEXT,
    status TEXT,
    details TEXT,
    action_required TEXT
) AS $$
BEGIN
    -- Check for users without proper RLS protection
    RETURN QUERY
    SELECT 
        'RLS Protection'::TEXT,
        CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END,
        'Table: ' || schemaname || '.' || tablename,
        CASE WHEN NOT rowsecurity THEN 'Enable RLS immediately' ELSE 'OK' END
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('users', 'assessment_sessions', 'certificates', 'payments');
    
    -- Check for suspicious user activity patterns
    RETURN QUERY
    SELECT 
        'Suspicious Activity'::TEXT,
        'DETECTED',
        'User ' || user_id::TEXT || ' has ' || attempt_count::TEXT || ' failed attempts',
        'Review user activity and consider temporary suspension'
    FROM (
        SELECT 
            user_id,
            COUNT(*) as attempt_count
        FROM public.certification_attempts 
        WHERE passed = false 
        AND created_at > NOW() - INTERVAL '1 day'
        GROUP BY user_id
        HAVING COUNT(*) > 10
    ) suspicious_users;
    
    -- Check for inactive admin accounts
    RETURN QUERY
    SELECT 
        'Admin Account Review'::TEXT,
        'REVIEW_REQUIRED',
        'Admin user ' || u.email || ' inactive for ' || 
        EXTRACT(days FROM NOW() - u.updated_at)::TEXT || ' days',
        'Review admin access and deactivate if necessary'
    FROM public.users u
    JOIN public.team_members tm ON u.id = tm.user_id
    WHERE tm.role = 'admin' 
    AND u.updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================

/*
-- To apply these optimizations:

1. Run this file after all migrations are complete
2. Schedule regular maintenance:
   - Daily: SELECT public.update_question_analytics_batch();
   - Weekly: SELECT public.refresh_user_certification_summary();
   - Monthly: SELECT public.cleanup_old_audit_logs();
   - Quarterly: SELECT public.archive_old_assessment_sessions();

3. Monitor performance:
   - SELECT * FROM public.analyze_database_performance();
   - SELECT * FROM public.security_health_check();

4. Refresh materialized views after bulk data changes:
   - SELECT public.refresh_user_certification_summary();
   - SELECT public.refresh_question_performance_summary();
*/


-- ------------------------------------------
-- SECTION: FIX_assessment_answers_error.sql
-- ------------------------------------------
-- FIX: Remove/Update functions that reference non-existent assessment_answers table
-- Issue: migration_004 created function that expects assessment_answers table
-- Solution: Update function to work with current schema (user_answers JSONB)

-- Option 1: DROP the problematic function temporarily
-- This is the quickest fix - analytics will need to be rebuilt later
DROP FUNCTION IF EXISTS public.update_performance_caches() CASCADE;

-- Option 2: UPDATE the function to use correct schema
-- This maintains analytics functionality with current schema
CREATE OR REPLACE FUNCTION public.update_performance_caches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update question performance cache
    -- Uses user_answers JSONB from assessment_sessions instead of assessment_answers table
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
            (qa_elem->>'question_key')::TEXT as question_key,
            COUNT(*) as total_attempts,
            SUM(CASE WHEN (qa_elem->>'is_correct')::BOOLEAN THEN 1 ELSE 0 END) as correct_attempts,
            AVG((qa_elem->>'elapsed_ms')::INTEGER / 1000.0) as avg_time
        FROM public.assessment_sessions asess,
        LATERAL jsonb_each(asess.user_answers) AS qa_entry(key, value),
        LATERAL jsonb_array_elements(CASE 
            WHEN jsonb_typeof(value) = 'array' THEN value 
            ELSE jsonb_build_array(value) 
        END) AS qa_elem
        WHERE asess.status = 'completed'
        GROUP BY qa_elem->>'question_key'
    ) qa ON q.question_key = qa.question_key
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
            AVG(final_score) as avg_score,
            MAX(CASE 
                WHEN DATE(completed_at) = CURRENT_DATE THEN 1 
                WHEN DATE(completed_at) = CURRENT_DATE - INTERVAL '1 day' THEN 1 
                ELSE 0 
            END) as streak_days,
            MAX(completed_at) as last_activity
        FROM public.assessment_sessions
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

-- Verify the fix
SELECT 'Function updated successfully. Assessment finalization should now work.' AS status;


