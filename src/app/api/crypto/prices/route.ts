import { NextResponse } from "next/server";
import { getCryptoSummary } from "@/lib/networth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { items, error } = await getCryptoSummary();
  const total = items.reduce((s, i) => s + i.valueEUR, 0);
  return NextResponse.json({
    items: items.map((i) => ({
      id: i.id,
      symbol: i.symbol,
      coingeckoId: i.coingeckoId,
      quantity: i.quantity,
      priceEUR: i.priceEUR,
      valueEUR: i.valueEUR,
      lastUpdated: i.lastUpdatedAt,
      priceFetchedAt: i.priceFetchedAt,
    })),
    total,
    error,
  });
}
