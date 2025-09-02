/*
  Warnings:

  - Made the column `UserId` on table `Queue` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."Queue" DROP CONSTRAINT "Queue_PlayerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Queue" DROP CONSTRAINT "Queue_UserId_fkey";

-- AlterTable
ALTER TABLE "public"."Queue" ALTER COLUMN "PlayerId" DROP NOT NULL,
ALTER COLUMN "UserId" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."SaleRecord" (
    "id" SERIAL NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "simulatorId" INTEGER NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleRecord_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Queue" ADD CONSTRAINT "Queue_PlayerId_fkey" FOREIGN KEY ("PlayerId") REFERENCES "public"."Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Queue" ADD CONSTRAINT "Queue_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaleRecord" ADD CONSTRAINT "SaleRecord_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaleRecord" ADD CONSTRAINT "SaleRecord_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaleRecord" ADD CONSTRAINT "SaleRecord_simulatorId_fkey" FOREIGN KEY ("simulatorId") REFERENCES "public"."Simulator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
