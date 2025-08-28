/*
  Warnings:

  - You are about to drop the `Fila` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Jogador` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Simulador` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Fila" DROP CONSTRAINT "Fila_jogadorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Jogador" DROP CONSTRAINT "Jogador_simuladorId_fkey";

-- DropTable
DROP TABLE "public"."Fila";

-- DropTable
DROP TABLE "public"."Jogador";

-- DropTable
DROP TABLE "public"."Simulador";

-- CreateTable
CREATE TABLE "public"."Player" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "inQueue" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "simulatorId" INTEGER,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Simulator" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Simulator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Queue" (
    "id" SERIAL NOT NULL,
    "PlayerId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Queue_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Player" ADD CONSTRAINT "Player_simulatorId_fkey" FOREIGN KEY ("simulatorId") REFERENCES "public"."Simulator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Queue" ADD CONSTRAINT "Queue_PlayerId_fkey" FOREIGN KEY ("PlayerId") REFERENCES "public"."Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
