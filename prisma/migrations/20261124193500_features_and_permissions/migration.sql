-- CreateEnum
CREATE TYPE "FeatureType" AS ENUM ('MENU', 'PAGE', 'TAB', 'ACTION');

-- CreateEnum
CREATE TYPE "PermissionMode" AS ENUM ('ANY', 'ALL');

-- AlterTable
ALTER TABLE "Permission"
ADD COLUMN "dependsOnKey" TEXT,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Populate dependsOnKey from PERMISSION_DEPENDENCIES
UPDATE "Permission" SET "dependsOnKey" = 'customers.view' WHERE "key" IN ('customers.create', 'customers.edit', 'customers.delete');
UPDATE "Permission" SET "dependsOnKey" = 'packages.view' WHERE "key" IN ('packages.create', 'packages.edit', 'packages.delete', 'subscriptions.view');
UPDATE "Permission" SET "dependsOnKey" = 'subscriptions.view' WHERE "key" IN ('subscriptions.create', 'subscriptions.edit', 'subscriptions.delete');
UPDATE "Permission" SET "dependsOnKey" = 'network.view' WHERE "key" IN ('network.create', 'network.edit', 'network.delete', 'routers.manage', 'routers.reboot', 'pppoe.manage', 'vlans.manage', 'ipam.manage');
UPDATE "Permission" SET "dependsOnKey" = 'billing.view' WHERE "key" IN ('billing.create', 'billing.edit', 'billing.delete', 'payments.view');
UPDATE "Permission" SET "dependsOnKey" = 'payments.view' WHERE "key" IN ('payments.record', 'payments.khqr', 'payments.delete');
UPDATE "Permission" SET "dependsOnKey" = 'accounting.view' WHERE "key" IN ('accounting.create', 'accounting.edit', 'accounting.delete', 'accounting.reports');
UPDATE "Permission" SET "dependsOnKey" = 'inventory.view' WHERE "key" IN ('inventory.create', 'inventory.edit', 'inventory.delete', 'warehouses.manage');
UPDATE "Permission" SET "dependsOnKey" = 'procurement.view' WHERE "key" IN ('procurement.create', 'procurement.edit', 'procurement.delete');
UPDATE "Permission" SET "dependsOnKey" = 'operations.view' WHERE "key" IN ('installations.manage', 'tickets.create', 'tickets.edit', 'tickets.delete', 'technicians.manage');
UPDATE "Permission" SET "dependsOnKey" = 'reports.view' WHERE "key" IN ('reports.create', 'reports.export');
UPDATE "Permission" SET "dependsOnKey" = 'automation.view' WHERE "key" IN ('automation.create', 'automation.edit', 'automation.delete');
UPDATE "Permission" SET "dependsOnKey" = 'settings.view' WHERE "key" IN ('settings.edit', 'audit.view');
UPDATE "Permission" SET "dependsOnKey" = 'users.view' WHERE "key" IN ('users.manage', 'roles.manage');

-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "FeatureType" NOT NULL,
    "label" TEXT NOT NULL,
    "path" TEXT,
    "icon" TEXT,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "permissionMode" "PermissionMode" NOT NULL DEFAULT 'ANY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeaturePermission" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeaturePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Feature_key_key" ON "Feature"("key");

-- CreateIndex
CREATE INDEX "Feature_parentId_idx" ON "Feature"("parentId");

-- CreateIndex
CREATE INDEX "Feature_type_idx" ON "Feature"("type");

-- CreateIndex
CREATE UNIQUE INDEX "FeaturePermission_featureId_permissionId_key" ON "FeaturePermission"("featureId", "permissionId");

-- CreateIndex
CREATE INDEX "FeaturePermission_featureId_idx" ON "FeaturePermission"("featureId");

-- CreateIndex
CREATE INDEX "FeaturePermission_permissionId_idx" ON "FeaturePermission"("permissionId");

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturePermission" ADD CONSTRAINT "FeaturePermission_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturePermission" ADD CONSTRAINT "FeaturePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
