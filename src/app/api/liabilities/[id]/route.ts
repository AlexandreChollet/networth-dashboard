import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    name?: string;
    remainingBalance?: number | string;
    date?: string;
    note?: string | null;
    externalKey?: string | null;
    externalProvider?: string | null;
  };

  const data: {
    name?: string;
    remainingBalance?: number;
    date?: Date;
    note?: string | null;
    externalKey?: string | null;
    externalProvider?: string | null;
  } = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.remainingBalance !== undefined) {
    data.remainingBalance =
      typeof body.remainingBalance === "string"
        ? parseFloat(body.remainingBalance)
        : body.remainingBalance;
  }
  if (body.date !== undefined) data.date = new Date(body.date);
  if (body.note !== undefined) data.note = body.note;
  if (body.externalKey !== undefined) {
    data.externalKey = body.externalKey?.trim() || null;
  }
  if (body.externalProvider !== undefined) {
    data.externalProvider = body.externalProvider?.trim() || null;
  }

  const item = await prisma.liabilityAccount.update({ where: { id }, data });
  return NextResponse.json(item);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  await prisma.liabilityAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
