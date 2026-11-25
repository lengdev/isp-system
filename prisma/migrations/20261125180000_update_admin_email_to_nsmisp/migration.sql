-- One-time data update: rename legacy seeded admin email from admin@netpulse.net to admin@nsmisp.net
-- without modifying any other user accounts.
UPDATE "User"
SET
  "email" = 'admin@nsmisp.net',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "email" = 'admin@netpulse.net'
  AND NOT EXISTS (
    SELECT 1 FROM "User" WHERE "email" = 'admin@nsmisp.net'
  );
