/*
  Warnings:

  - Added the required column `SimulatorId` to the `Queue` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Queue" ADD COLUMN     "SimulatorId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Queue" ADD CONSTRAINT "Queue_SimulatorId_fkey" FOREIGN KEY ("SimulatorId") REFERENCES "public"."Simulator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
