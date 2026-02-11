-- Add pricing fields to supplierPart table and create supplierPartPrice child table
-- This enables quantity-based pricing for customer quote material costing

-- ============================================================================
-- Part 1: Add "last price" fields to supplierPart (backward compat / quick ref)
-- ============================================================================

ALTER TABLE "supplierPart"
ADD COLUMN IF NOT EXISTS "unitPrice" NUMERIC(15, 5),
ADD COLUMN IF NOT EXISTS "lastPurchaseDate" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "lastPOQuantity" NUMERIC(20, 2),
ADD COLUMN IF NOT EXISTS "lastPOId" TEXT;

ALTER TABLE "supplierPart"
ADD CONSTRAINT "supplierPart_lastPOId_fkey"
FOREIGN KEY ("lastPOId") REFERENCES "purchaseOrder"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Part 2: Create supplierPartPrice child table (quantity scales)
-- ============================================================================

CREATE TABLE "supplierPartPrice" (
  "supplierPartId" TEXT NOT NULL,
  "quantity" NUMERIC(20, 2) NOT NULL DEFAULT 1,
  "unitPrice" NUMERIC(15, 5) NOT NULL,
  "leadTime" NUMERIC(10, 5) DEFAULT 0,
  "sourceType" TEXT NOT NULL DEFAULT 'Quote',
  "sourceDocumentId" TEXT,
  "companyId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP WITH TIME ZONE,

  CONSTRAINT "supplierPartPrice_pkey" PRIMARY KEY ("supplierPartId", "quantity"),
  CONSTRAINT "supplierPartPrice_supplierPartId_companyId_fkey"
    FOREIGN KEY ("supplierPartId", "companyId") REFERENCES "supplierPart"("id", "companyId")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "supplierPartPrice_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "company"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "supplierPartPrice_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "user"("id"),
  CONSTRAINT "supplierPartPrice_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "user"("id"),
  CONSTRAINT "supplierPartPrice_sourceType_check"
    CHECK ("sourceType" IN ('Quote', 'PurchaseOrder', 'Manual'))
);

-- RLS: same access patterns as supplierPart
ALTER TABLE "supplierPartPrice" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees with part/purchasing_view can view supplier part prices" ON "supplierPartPrice"
  FOR SELECT
  USING (
    (
      has_company_permission('parts_view', "companyId") OR
      has_company_permission('purchasing_view', "companyId")
    )
    AND has_role('employee', "companyId")
  );

CREATE POLICY "Employees with parts_create can create supplier part prices" ON "supplierPartPrice"
  FOR INSERT
  WITH CHECK (
    has_role('employee', "companyId") AND
    has_company_permission('parts_create', "companyId")
  );

CREATE POLICY "Employees with parts_update can update supplier part prices" ON "supplierPartPrice"
  FOR UPDATE
  USING (
    has_role('employee', "companyId") AND
    has_company_permission('parts_update', "companyId")
  );

CREATE POLICY "Employees with parts_delete can delete supplier part prices" ON "supplierPartPrice"
  FOR DELETE
  USING (
    has_role('employee', "companyId") AND
    has_company_permission('parts_delete', "companyId")
  );

-- Suppliers can view their own supplier part prices
CREATE POLICY "Suppliers can view their own supplier part prices" ON "supplierPartPrice"
  FOR SELECT
  USING (
    has_role('supplier', "companyId") AND
    has_company_permission('parts_view', "companyId") AND
    "supplierPartId" IN (
      SELECT "id" FROM "supplierPart" WHERE "supplierId" IN (
        SELECT "supplierId" FROM "supplierAccount" WHERE id::uuid = auth.uid()
      )
    )
  );
