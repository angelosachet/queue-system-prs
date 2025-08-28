-- CreateTable
CREATE TABLE "public"."Jogador" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "naFila" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "simuladorId" INTEGER,

    CONSTRAINT "Jogador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Simulador" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Simulador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Fila" (
    "id" SERIAL NOT NULL,
    "jogadorId" INTEGER NOT NULL,
    "posicao" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fila_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Jogador" ADD CONSTRAINT "Jogador_simuladorId_fkey" FOREIGN KEY ("simuladorId") REFERENCES "public"."Simulador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Fila" ADD CONSTRAINT "Fila_jogadorId_fkey" FOREIGN KEY ("jogadorId") REFERENCES "public"."Jogador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
