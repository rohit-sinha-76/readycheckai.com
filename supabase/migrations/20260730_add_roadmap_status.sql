ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed';
UPDATE roadmaps SET status = 'completed' WHERE status IS NULL;
