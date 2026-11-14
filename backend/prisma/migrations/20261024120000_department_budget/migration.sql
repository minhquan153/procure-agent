CREATE TABLE "DepartmentBudget" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "budgetLimit" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DepartmentBudget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DepartmentBudget_departmentId_fiscalYear_key"
ON "DepartmentBudget"("departmentId", "fiscalYear");

CREATE INDEX "DepartmentBudget_fiscalYear_idx"
ON "DepartmentBudget"("fiscalYear");

ALTER TABLE "DepartmentBudget"
ADD CONSTRAINT "DepartmentBudget_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
