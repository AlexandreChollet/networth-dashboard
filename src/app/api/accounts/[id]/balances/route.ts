import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    amount: number | string;
    date: string;
    note?: string;
  };
  if (body.amount === undefined || !body.date) {
    return NextResponse.json(
      { error: "amount et date requis" },
      { status: 400 },
    );
  }

  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  const balance = await prisma.balance.create({
    data: {
      accountId: id,
      amount: typeof body.amount === "string" ? parseFloat(body.amount) : body.amount,
      date: new Date(body.date),
      note: body.note ?? null,
    },
  });
  return NextResponse.json(balance, { status: 201 });
}
