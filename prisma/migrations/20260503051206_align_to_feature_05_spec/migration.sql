/*
  Warnings:

  - You are about to drop the column `canvasBlobUrl` on the `Project` table. All the data in the column will be lost.
  - The `status` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "canvasBlobUrl",
ADD COLUMN     "canvasJsonPath" TEXT,
ADD COLUMN     "description" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

-- CreateIndex
CREATE INDEX "ProjectCollaborator_projectId_addedAt_idx" ON "ProjectCollaborator"("projectId", "addedAt");
