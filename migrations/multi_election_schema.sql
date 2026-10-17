-- ==============================================================================
-- NACOS E-VOTING SYSTEM — MULTI-ELECTION SCHEMA MIGRATION
-- Production-Safe, Non-Destructive DDL & Baseline Association
-- ==============================================================================
-- CRITICAL PRODUCTION NOTICE:
-- The NACOS Election is LIVE in production.
-- This script DOES NOT drop, truncate, or recreate any existing tables.
-- It ONLY adds optional/defaulted columns and creates the new `elections` table.
-- All existing votes, candidates, positions, aspirants, and users remain 100% intact.
-- ==============================================================================

BEGIN;

-- 1. Create Elections Table (If not already created)
CREATE TABLE IF NOT EXISTS public.elections (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    session TEXT NOT NULL,
    description TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'live', 'closed', 'archived')),
    is_voting_enabled BOOLEAN NOT NULL DEFAULT false,
    eligible_levels TEXT[] DEFAULT ARRAY['All']::TEXT[],
    eligible_departments TEXT[] DEFAULT ARRAY['All']::TEXT[],
    aspirant_registration_open BOOLEAN DEFAULT true,
    aspirant_fee_required BOOLEAN DEFAULT true,
    created_by TEXT,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- 2. Non-Destructive Column Additions to Existing Tables
-- Each table receives election_id with DEFAULT 'nacos-election-2024'
ALTER TABLE public.positions 
    ADD COLUMN IF NOT EXISTS election_id TEXT DEFAULT 'nacos-election-2024';

ALTER TABLE public.candidates 
    ADD COLUMN IF NOT EXISTS election_id TEXT DEFAULT 'nacos-election-2024';

ALTER TABLE public.aspirants 
    ADD COLUMN IF NOT EXISTS election_id TEXT DEFAULT 'nacos-election-2024';

ALTER TABLE public.votes 
    ADD COLUMN IF NOT EXISTS election_id TEXT DEFAULT 'nacos-election-2024';

ALTER TABLE public.settings 
    ADD COLUMN IF NOT EXISTS election_id TEXT DEFAULT 'nacos-election-2024';

ALTER TABLE public.audit_logs 
    ADD COLUMN IF NOT EXISTS election_id TEXT DEFAULT 'nacos-election-2024';

-- 3. Seed Primary Baseline Election for the Current Live NACOS Election
INSERT INTO public.elections (
    id,
    title,
    session,
    description,
    start_date,
    end_date,
    status,
    is_voting_enabled,
    eligible_levels,
    eligible_departments,
    aspirant_registration_open,
    aspirant_fee_required,
    created_by,
    created_at,
    updated_at
) VALUES (
    'nacos-election-2024',
    'NACOS General Elections 2024/2025',
    '2024/2025',
    'Official executive elections for the Nigeria Association of Computing Students (NACOS).',
    TO_CHAR(NOW(), 'YYYY-MM-DD'),
    TO_CHAR(NOW() + INTERVAL '7 days', 'YYYY-MM-DD'),
    'live',
    true,
    ARRAY['All']::TEXT[],
    ARRAY['All']::TEXT[],
    true,
    true,
    'admin-1',
    (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
)
ON CONFLICT (id) DO UPDATE SET
    updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

-- 4. Backfill any existing records having NULL election_id to the baseline election
UPDATE public.positions SET election_id = 'nacos-election-2024' WHERE election_id IS NULL;
UPDATE public.candidates SET election_id = 'nacos-election-2024' WHERE election_id IS NULL;
UPDATE public.aspirants SET election_id = 'nacos-election-2024' WHERE election_id IS NULL;
UPDATE public.votes SET election_id = 'nacos-election-2024' WHERE election_id IS NULL;
UPDATE public.settings SET election_id = 'nacos-election-2024' WHERE election_id IS NULL;
UPDATE public.audit_logs SET election_id = 'nacos-election-2024' WHERE election_id IS NULL;

-- 5. Performance Indexes for Scoped Queries
CREATE INDEX IF NOT EXISTS idx_elections_status ON public.elections(status);
CREATE INDEX IF NOT EXISTS idx_positions_election_id ON public.positions(election_id);
CREATE INDEX IF NOT EXISTS idx_candidates_election_id ON public.candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_aspirants_election_id ON public.aspirants(election_id);
CREATE INDEX IF NOT EXISTS idx_votes_election_id ON public.votes(election_id);
CREATE INDEX IF NOT EXISTS idx_votes_scoped_voter ON public.votes(student_id, position, election_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_election_id ON public.audit_logs(election_id);

-- 6. Row Level Security (RLS) Configuration
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'elections' AND policyname = 'Allow public read of active/scheduled elections'
    ) THEN
        CREATE POLICY "Allow public read of active/scheduled elections"
            ON public.elections FOR SELECT
            TO authenticated, anon
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'elections' AND policyname = 'Allow admin manage elections'
    ) THEN
        CREATE POLICY "Allow admin manage elections"
            ON public.elections FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

COMMIT;

-- ==============================================================================
-- POST-MIGRATION BASELINE VERIFICATION QUERIES
-- Run these immediately after applying the migration to confirm baseline consistency:
-- ==============================================================================
--
-- 1. Verify election baseline record:
-- SELECT id, title, session, status, is_voting_enabled FROM public.elections WHERE id = 'nacos-election-2024';
--
-- 2. Verify all votes match baseline:
-- SELECT COUNT(*) AS total_votes_cast FROM public.votes WHERE election_id = 'nacos-election-2024';
--
-- 3. Verify distinct approved voters turnout numerator:
-- SELECT COUNT(DISTINCT v.student_id) AS distinct_approved_voters_who_voted
-- FROM public.votes v
-- JOIN public.users u ON v.student_id = u.id
-- WHERE u.status = 'approved' AND v.election_id = 'nacos-election-2024';
--
-- 4. Verify candidate counts for baseline election:
-- SELECT c.id, c.name, c.position, COUNT(v.id) AS vote_count
-- FROM public.candidates c
-- LEFT JOIN public.votes v ON v.candidate_id = c.id AND v.election_id = 'nacos-election-2024'
-- WHERE c.election_id = 'nacos-election-2024'
-- GROUP BY c.id, c.name, c.position;
-- ==============================================================================

-- ==============================================================================
-- ROLLBACK SCRIPT (In the unlikely event of emergency reversion):
-- ==============================================================================
-- BEGIN;
-- ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS election_id;
-- ALTER TABLE public.settings DROP COLUMN IF EXISTS election_id;
-- ALTER TABLE public.votes DROP COLUMN IF EXISTS election_id;
-- ALTER TABLE public.aspirants DROP COLUMN IF EXISTS election_id;
-- ALTER TABLE public.candidates DROP COLUMN IF EXISTS election_id;
-- ALTER TABLE public.positions DROP COLUMN IF EXISTS election_id;
-- DROP TABLE IF EXISTS public.elections;
-- COMMIT;
-- ==============================================================================
