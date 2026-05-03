import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    value: number | string;
    date: string;
    note?: string;
  };
  if (body.value === undefined || !body.date) {
    return NextResponse.json(
      { error: "value et date requis" },
      { status: 400 },
    );
  }
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) {
    return NextResponse.json({ error: "Asset introuvable" }, { status: 404 });
  }
  const valuation = await prisma.assetValuation.create({
    data: {
      assetId: id,
      value: typeof body.value === "string" ? parseFloat(body.value) : body.value,
      date: new Date(body.date),
      note: body.note ?? null,
    },
  });
  return NextResponse.json(valuation, { status: 201 });
}
