-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRoleType" ADD VALUE 'BILLING_CASHIER';
ALTER TYPE "UserRoleType" ADD VALUE 'FIELD_TECHNICIAN';
ALTER TYPE "UserRoleType" ADD VALUE 'SUPPORT_AGENT';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "familyId" TEXT;

-- CreateIndex
CREATE INDEX "Account_type_idx" ON "Account"("type");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_resource_idx" ON "AuditLog"("resource");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE INDEX "Customer_fullName_idx" ON "Customer"("fullName");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "CustomerActivity_customerId_idx" ON "CustomerActivity"("customerId");

-- CreateIndex
CREATE INDEX "CustomerActivity_createdAt_idx" ON "CustomerActivity"("createdAt");

-- CreateIndex
CREATE INDEX "IPAddress_poolId_idx" ON "IPAddress"("poolId");

-- CreateIndex
CREATE INDEX "IPPool_routerId_idx" ON "IPPool"("routerId");

-- CreateIndex
CREATE INDEX "Installation_status_idx" ON "Installation"("status");

-- CreateIndex
CREATE INDEX "Installation_scheduledDate_idx" ON "Installation"("scheduledDate");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "JournalEntry_entryDate_idx" ON "JournalEntry"("entryDate");

-- CreateIndex
CREATE INDEX "JournalEntry_reference_idx" ON "JournalEntry"("reference");

-- CreateIndex
CREATE INDEX "JournalEntryLine_journalEntryId_idx" ON "JournalEntryLine"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalEntryLine_accountId_idx" ON "JournalEntryLine"("accountId");

-- CreateIndex
CREATE INDEX "PPPoEAccount_routerId_idx" ON "PPPoEAccount"("routerId");

-- CreateIndex
CREATE INDEX "PPPoESession_accountId_idx" ON "PPPoESession"("accountId");

-- CreateIndex
CREATE INDEX "Payment_customerId_idx" ON "Payment"("customerId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "RouterMetric_routerId_timestamp_idx" ON "RouterMetric"("routerId", "timestamp");

-- CreateIndex
CREATE INDEX "SerialNumber_serialNumber_idx" ON "SerialNumber"("serialNumber");

-- CreateIndex
CREATE INDEX "SerialNumber_macAddress_idx" ON "SerialNumber"("macAddress");

-- CreateIndex
CREATE INDEX "SerialNumber_status_idx" ON "SerialNumber"("status");

-- CreateIndex
CREATE INDEX "Session_refreshTokenHash_idx" ON "Session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "Session_familyId_idx" ON "Session"("familyId");

-- CreateIndex
CREATE INDEX "Subscription_customerId_idx" ON "Subscription"("customerId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_customerId_idx" ON "SupportTicket"("customerId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "VLAN_routerId_idx" ON "VLAN"("routerId");
