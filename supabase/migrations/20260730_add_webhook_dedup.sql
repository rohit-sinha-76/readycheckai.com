CREATE TABLE IF NOT EXISTS processed_webhooks (
  event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payload_hash VARCHAR(64) NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_processed_at ON processed_webhooks(processed_at);
