-- CreateTable
CREATE TABLE "public"."TimePattern" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "timeMinutes" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimePattern_pkey" PRIMARY KEY ("id")
);
