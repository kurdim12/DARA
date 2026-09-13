-- The Report screen, and the Community Reports section under it.
--
-- Every column here is additive and nullable or defaulted, so existing rows
-- take the defaults and nothing needs backfilling.
--
-- `contact` is the first column in this database that can hold something
-- personal. It is only ever written when a person turns anonymity OFF and
-- types it in themselves, and it is never read back over the API — the
-- community feed selects the type and the description and nothing else.
ALTER TABLE reports ADD COLUMN threat_type        TEXT;
-- What the person says happened, in their own words. Kept apart from
-- message_text, which is the message that was analysed — they are different
-- things and the community feed only ever reads this one.
ALTER TABLE reports ADD COLUMN description        TEXT;
ALTER TABLE reports ADD COLUMN relevant_authority TEXT;
ALTER TABLE reports ADD COLUMN anonymous          INTEGER NOT NULL DEFAULT 1;
ALTER TABLE reports ADD COLUMN contact            TEXT;

-- Community Reports shows only what is explicitly marked public. Nothing a
-- visitor submits is public unless someone sets this, so the feed cannot be
-- filled by whoever is holding the phone.
ALTER TABLE reports ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reports ADD COLUMN is_seed   INTEGER NOT NULL DEFAULT 0;

-- Four seeded reports, from content/community-seed.json, so the section is
-- never empty. They hold no name, no number and no contact detail, because a
-- real anonymous report holds none either.
INSERT INTO reports (source, category, threat_type, description, anonymous, is_public, is_seed, status)
VALUES ('detect', 'other', 'phishing', 'Got an SMS saying I had an unpaid fine and had 24 hours to settle it through a link. The link was not on a government domain.', 1, 1, 1, 'received');
INSERT INTO reports (source, category, threat_type, description, anonymous, is_public, is_seed, status)
VALUES ('detect', 'other', 'fake_job', 'A work-from-home offer on WhatsApp, good salary, no interview, then they asked for a registration fee before anything started.', 1, 1, 1, 'received');
INSERT INTO reports (source, category, threat_type, description, anonymous, is_public, is_seed, status)
VALUES ('detect', 'other', 'financial_scam', 'Someone called saying they were the bank''s fraud department and asked me to read out the code that had just arrived on my phone.', 1, 1, 1, 'received');
INSERT INTO reports (source, category, threat_type, description, anonymous, is_public, is_seed, status)
VALUES ('detect', 'other', 'phishing', 'A message said my account was suspended and one link would restore it. The sender was not a number I have ever had a message from.', 1, 1, 1, 'received');
