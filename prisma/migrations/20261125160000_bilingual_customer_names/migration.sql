-- AlterTable: add nullable bilingual customer name columns
ALTER TABLE "Customer"
ADD COLUMN "nameKm" TEXT,
ADD COLUMN "nameEn" TEXT;

-- Backfill existing rows from fullName:
-- If fullName contains Khmer Unicode (U+1780..U+17FF), populate nameKm; otherwise populate nameEn.
UPDATE "Customer"
SET
  "nameKm" = CASE
    WHEN "fullName" ~ '[\u1780-\u17FF]' THEN NULLIF(BTRIM("fullName"), '')
    ELSE NULL
  END,
  "nameEn" = CASE
    WHEN "fullName" !~ '[\u1780-\u17FF]' THEN NULLIF(BTRIM("fullName"), '')
    ELSE NULL
  END;

-- Enforce that at least one non-empty bilingual name is always present
ALTER TABLE "Customer"
ADD CONSTRAINT "Customer_name_required_chk" CHECK (
  ("nameKm" IS NOT NULL AND BTRIM("nameKm") <> '')
  OR ("nameEn" IS NOT NULL AND BTRIM("nameEn") <> '')
);

-- CreateIndex
CREATE INDEX "Customer_nameEn_idx" ON "Customer"("nameEn");

-- CreateIndex
CREATE INDEX "Customer_nameKm_idx" ON "Customer"("nameKm");
