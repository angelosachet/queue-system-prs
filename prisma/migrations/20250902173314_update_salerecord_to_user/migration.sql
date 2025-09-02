-- DropForeignKey
ALTER TABLE "public"."SaleRecord" DROP CONSTRAINT "SaleRecord_playerId_fkey";

-- AddForeignKey
ALTER TABLE "public"."SaleRecord" ADD CONSTRAINT "SaleRecord_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
