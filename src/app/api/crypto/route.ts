import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.cryptoHolding.findMany({
    orderBy: { symbol: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    symbol: string;
    coingeckoId: string;
    quantity: number | string;
  };
  if (!body.symbol || !body.coingeckoId || body.quantity === undefined) {
    return NextResponse.json(
      { error: "symbol, coingeckoId, quantity requis" },
      { status: 400 },
    );
  }
  const created = await prisma.cryptoHolding.upsert({
    where: { coingeckoId: body.coingeckoId.toLowerCase() },
    update: {
      symbol: body.symbol.toUpperCase(),
      quantity:
        typeof body.quantity === "string"
          ? parseFloat(body.quantity)
          : body.quantity,
      lastUpdated: new Date(),
    },
    create: {
      symbol: body.symbol.toUpperCase(),
      coingeckoId: body.coingeckoId.toLowerCase(),
      quantity:
        typeof body.quantity === "string"
          ? parseFloat(body.quantity)
          : body.quantity,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
