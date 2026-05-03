import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: { valuations: { orderBy: { date: "desc" } } },
  });
  if (!asset) {
    return NextResponse.json({ error: "Asset introuvable" }, { status: 404 });
  }
  return NextResponse.json(asset);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  await prisma.asset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
