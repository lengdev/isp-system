-- AlterTable
ALTER TABLE "Feature" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "costAccountCode" TEXT,
ADD COLUMN     "deferredRevenueAccountCode" TEXT,
ADD COLUMN     "receivableAccountCode" TEXT,
ADD COLUMN     "revenueAccountCode" TEXT,
ADD COLUMN     "taxAccountCode" TEXT;

-- AlterTable
ALTER TABLE "Permission" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "bandwidthTierId" TEXT;

-- CreateTable
CREATE TABLE "PackageBandwidthTier" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "label" TEXT,
    "downloadSpeed" INTEGER NOT NULL,
    "uploadSpeed" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "costing" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "durationLabel" TEXT,
    "dataAllowanceGB" INTEGER,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageBandwidthTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PackageBandwidthTier_packageId_idx" ON "PackageBandwidthTier"("packageId");

-- CreateIndex
CREATE INDEX "Subscription_bandwidthTierId_idx" ON "Subscription"("bandwidthTierId");

-- AddForeignKey
ALTER TABLE "PackageBandwidthTier" ADD CONSTRAINT "PackageBandwidthTier_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_bandwidthTierId_fkey" FOREIGN KEY ("bandwidthTierId") REFERENCES "PackageBandwidthTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill default accounting sets for existing packages
UPDATE "Package"
SET
  "revenueAccountCode" = COALESCE("revenueAccountCode", CASE WHEN "technology" = 'WIRELESS' THEN '4020' ELSE '4010' END),
  "receivableAccountCode" = COALESCE("receivableAccountCode", '1100'),
  "costAccountCode" = COALESCE("costAccountCode", '5100'),
  "taxAccountCode" = COALESCE("taxAccountCode", '2200');

-- Backfill default bandwidth tier for each existing package
INSERT INTO "PackageBandwidthTier" (
  "id",
  "packageId",
  "label",
  "downloadSpeed",
  "uploadSpeed",
  "price",
  "costing",
  "durationDays",
  "durationLabel",
  "dataAllowanceGB",
  "description",
  "sortOrder",
  "isDefault",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT('tier-', p."id", '-default'),
  p."id",
  CONCAT(p."downloadSpeed", ' Mbps'),
  p."downloadSpeed",
  p."uploadSpeed",
  p."monthlyPrice",
  ROUND((p."monthlyPrice" * 0.40)::numeric, 2),
  30,
  '30 Days',
  p."dataAllowanceGB",
  p."description",
  0,
  true,
  p."isActive",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Package" p
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageBandwidthTier" t WHERE t."packageId" = p."id"
);

-- Link existing subscriptions to their package default bandwidth tier
UPDATE "Subscription" s
SET "bandwidthTierId" = (
  SELECT t."id"
  FROM "PackageBandwidthTier" t
  WHERE t."packageId" = s."packageId"
  ORDER BY t."isDefault" DESC, t."sortOrder" ASC
  LIMIT 1
)
WHERE s."bandwidthTierId" IS NULL;
