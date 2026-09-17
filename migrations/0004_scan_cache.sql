-- A 24-hour cache for identical scans.
--
-- The brief asked for KV. No KV namespace is bound and creating one needs
-- Cloudflare credentials this build does not have, so the same behaviour is
-- built on D1, which is already bound and already deploys. Logged in
-- DECISIONS.md as a deliberate divergence.
--
-- `key` is a hash of the normalized input plus the language and type, so the
-- raw message is never stored. `body` is the JSON the API returned.
CREATE TABLE IF NOT EXISTS scan_cache (
  key TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scan_cache_created ON scan_cache (created_at);
