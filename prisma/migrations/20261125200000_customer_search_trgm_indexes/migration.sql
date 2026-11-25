-- Enable PostgreSQL trigram extension for case-insensitive substring ILIKE search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fast default newest-first ordering across 10k+ customers
CREATE INDEX IF NOT EXISTS "Customer_createdAt_idx" ON "Customer"("createdAt" DESC);

-- Trigram GIN indexes for sub-50ms Khmer & Latin substring search
CREATE INDEX IF NOT EXISTS "Customer_nameKm_trgm_idx" ON "Customer" USING GIN ("nameKm" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Customer_nameEn_trgm_idx" ON "Customer" USING GIN ("nameEn" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Customer_fullName_trgm_idx" ON "Customer" USING GIN ("fullName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Customer_email_trgm_idx" ON "Customer" USING GIN ("email" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Customer_phone_trgm_idx" ON "Customer" USING GIN ("phone" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Customer_code_trgm_idx" ON "Customer" USING GIN ("code" gin_trgm_ops);
