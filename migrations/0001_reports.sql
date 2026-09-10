CREATE TABLE reports (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  source              TEXT    NOT NULL CHECK (source IN ('detect','shield')),
  category            TEXT    NOT NULL,
  verdict             TEXT    CHECK (verdict IN ('scam','suspicious','likely_safe')),
  confidence          INTEGER,
  impersonated_entity TEXT,
  channel             TEXT,
  message_text        TEXT,
  is_test             INTEGER NOT NULL DEFAULT 0,
  status              TEXT    NOT NULL DEFAULT 'received'
);
-- No IP, user agent, or device columns. Case number is derived, not stored:
-- 'DR-2026-' || printf('%05d', id)
