-- Update CompanySetting column defaults and rename legacy NetPulse branding rows without dropping data
ALTER TABLE "CompanySetting"
  ALTER COLUMN "companyName" SET DEFAULT 'NSMISP High-Speed Broadband LLC',
  ALTER COLUMN "supportEmail" SET DEFAULT 'support@nsmisp.net';

UPDATE "CompanySetting"
SET
  "companyName" = REPLACE("companyName", 'NetPulse', 'NSMISP'),
  "supportEmail" = CASE
    WHEN "supportEmail" = 'support@netpulse.net' THEN 'support@nsmisp.net'
    ELSE "supportEmail"
  END,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "companyName" LIKE '%NetPulse%'
   OR "supportEmail" = 'support@netpulse.net';
