import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { TransactionType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const items = await prisma.transaction.findMany({
    where: { accountId: id },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(items);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    date: string;
    type: TransactionType;
    amount: number | string;
    note?: string;
  };
  if (!body.date || !body.type || body.amount === undefined) {
    return NextResponse.json(
      { error: "date, type, amount requis" },
      { status: 400 },
    );
  }

  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  const amount =
    typeof body.amount === "string" ? parseFloat(body.amount) : body.amount;
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "amount doit être un nombre positif (le signe vient du type)" },
      { status: 400 },
    );
  }

  const tx = await prisma.transaction.create({
    data: {
      accountId: id,
      date: new Date(body.date),
      type: body.type,
      amount,
      note: body.note ?? null,
    },
  });
  return NextResponse.json(tx, { status: 201 });
}
