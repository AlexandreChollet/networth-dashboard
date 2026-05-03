import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [
    accounts,
    balances,
    assets,
    valuations,
    crypto,
    liabilities,
    actionItems,
    transactions,
  ] = await Promise.all([
    prisma.account.findMany(),
    prisma.balance.findMany(),
    prisma.asset.findMany(),
    prisma.assetValuation.findMany(),
    prisma.cryptoHolding.findMany(),
    prisma.liabilityAccount.findMany(),
    prisma.actionItem.findMany(),
    prisma.transaction.findMany(),
  ]);

  const payload = {
    version: 4,
    exportedAt: new Date().toISOString(),
    accounts,
    balances,
    assets,
    valuations,
    crypto,
    liabilities,
    actionItems,
    transactions,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="patrimoine-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
