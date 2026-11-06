-- Staff (ADMIN/OWNER) authenticate with a high-entropy secret instead of a
-- password. Only a sha256 hash is stored; the raw secret is shown once.
ALTER TABLE "User" ADD COLUMN "staffSecretHash" TEXT;
ALTER TABLE "User" ADD COLUMN "profileCompletedAt" DATETIME;

CREATE UNIQUE INDEX "User_staffSecretHash_key" ON "User"("staffSecretHash");
