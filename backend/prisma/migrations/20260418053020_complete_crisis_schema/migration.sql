/*
  Warnings:

  - The values [DOCTOR,NURSE,RECEPTIONIST] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `comorbidities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `patients` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `priority_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `queue_status` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `triage_assessments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `vital_signs` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('MEDICAL', 'FIRE', 'SECURITY', 'ADMIN');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('AVAILABLE', 'ON_CALL', 'RESPONDING', 'ON_SCENE', 'TRANSPORTING', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('MEDICAL', 'FIRE', 'SECURITY', 'STRUCTURAL', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('ACTIVE', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('GUEST_REPORT', 'STAFF_UPDATE', 'SENSOR_DATA', 'RESPONDER_STATUS', 'OBSERVATION');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'STAFF', 'RESPONDER', 'GUEST');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'STAFF';
COMMIT;

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_patientId_fkey";

-- DropForeignKey
ALTER TABLE "comorbidities" DROP CONSTRAINT "comorbidities_patientId_fkey";

-- DropForeignKey
ALTER TABLE "priority_history" DROP CONSTRAINT "priority_history_patientId_fkey";

-- DropForeignKey
ALTER TABLE "triage_assessments" DROP CONSTRAINT "triage_assessments_patientId_fkey";

-- DropForeignKey
ALTER TABLE "vital_signs" DROP CONSTRAINT "vital_signs_patientId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "unitId" TEXT,
ALTER COLUMN "role" SET DEFAULT 'STAFF';

-- DropTable
DROP TABLE "audit_logs";

-- DropTable
DROP TABLE "comorbidities";

-- DropTable
DROP TABLE "patients";

-- DropTable
DROP TABLE "priority_history";

-- DropTable
DROP TABLE "queue_status";

-- DropTable
DROP TABLE "triage_assessments";

-- DropTable
DROP TABLE "vital_signs";

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "UnitType" NOT NULL,
    "status" "UnitStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT,
    "eta" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "coordinates" TEXT,
    "reportedById" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detectionMethod" TEXT NOT NULL,
    "primaryUnitId" TEXT,
    "channelId" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "aiSeverity" "Severity",
    "aiType" "IncidentType",
    "aiRoute" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_updates" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL,
    "description" TEXT,
    "updatedById" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "ext" TEXT,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_assignedUnits" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "incidents_incidentId_key" ON "incidents"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_channelId_key" ON "incidents"("channelId");

-- CreateIndex
CREATE INDEX "incidents_severity_status_idx" ON "incidents"("severity", "status");

-- CreateIndex
CREATE INDEX "incidents_zone_idx" ON "incidents"("zone");

-- CreateIndex
CREATE INDEX "messages_channelId_timestamp_idx" ON "messages"("channelId", "timestamp");

-- CreateIndex
CREATE INDEX "reports_incidentId_idx" ON "reports"("incidentId");

-- CreateIndex
CREATE INDEX "reports_submittedById_idx" ON "reports"("submittedById");

-- CreateIndex
CREATE INDEX "status_updates_incidentId_timestamp_idx" ON "status_updates"("incidentId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "_assignedUnits_AB_unique" ON "_assignedUnits"("A", "B");

-- CreateIndex
CREATE INDEX "_assignedUnits_B_index" ON "_assignedUnits"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_primaryUnitId_fkey" FOREIGN KEY ("primaryUnitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_updates" ADD CONSTRAINT "status_updates_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_updates" ADD CONSTRAINT "status_updates_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_assignedUnits" ADD CONSTRAINT "_assignedUnits_A_fkey" FOREIGN KEY ("A") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_assignedUnits" ADD CONSTRAINT "_assignedUnits_B_fkey" FOREIGN KEY ("B") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
