import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    symbol?: string;
    coingeckoId?: string;
    quantity?: number | string;
  };
  const updated = await prisma.cryptoHolding.update({
    where: { id },
    data: {
      ...(body.symbol !== undefined && { symbol: body.symbol.toUpperCase() }),
      ...(body.coingeckoId !== undefined && {
        coingeckoId: body.coingeckoId.toLowerCase(),
      }),
      ...(body.quantity !== undefined && {
        quantity:
          typeof body.quantity === "string"
            ? parseFloat(body.quantity)
            : body.quantity,
      }),
      lastUpdated: new Date(),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  await prisma.cryptoHolding.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
