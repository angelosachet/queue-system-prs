-- CreateEnum
CREATE TYPE "public"."ACSessionStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "public"."Simulator" ADD COLUMN     "pcIp" TEXT;

-- CreateTable
CREATE TABLE "public"."ACSession" (
    "id" SERIAL NOT NULL,
    "queueId" INTEGER,
    "playerId" INTEGER,
    "simulatorId" INTEGER NOT NULL,
    "pcIp" TEXT NOT NULL,
    "sessionStatus" "public"."ACSessionStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ACSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ACSession" ADD CONSTRAINT "ACSession_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "public"."Queue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ACSession" ADD CONSTRAINT "ACSession_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ACSession" ADD CONSTRAINT "ACSession_simulatorId_fkey" FOREIGN KEY ("simulatorId") REFERENCES "public"."Simulator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
