-- The four seeded community reports were English-only, inside an Arabic-first
-- app: on the Arabic Report screen the whole «بلاغات المجتمع» section read as
-- someone else's language.
--
-- `description` is one column and a real report holds whatever the person
-- wrote, so it cannot carry two languages. A seed is different — it is content
-- we author — so it gets a key, and the app renders the key from
-- content/community-seed.json in the reader's language. A real report still
-- renders its own description verbatim, which is the only honest thing to do
-- with someone else's words.
ALTER TABLE reports ADD COLUMN seed_key TEXT;

UPDATE reports SET seed_key = 'unpaid_fine_sms'
 WHERE is_seed = 1 AND threat_type = 'phishing'
   AND description LIKE 'Got an SMS saying I had an unpaid fine%';

UPDATE reports SET seed_key = 'work_from_home_fee'
 WHERE is_seed = 1 AND threat_type = 'fake_job'
   AND description LIKE 'A work-from-home offer on WhatsApp%';

UPDATE reports SET seed_key = 'bank_fraud_call_otp'
 WHERE is_seed = 1 AND threat_type = 'financial_scam'
   AND description LIKE 'Someone called saying they were the bank%';

UPDATE reports SET seed_key = 'account_suspended_link'
 WHERE is_seed = 1 AND threat_type = 'phishing'
   AND description LIKE 'A message said my account was suspended%';
