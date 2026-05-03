import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { AccountType, CashRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const account = await prisma.account.findUnique({
    where: { id },
    include: { balances: { orderBy: { date: "desc" } } },
  });
  if (!account) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }
  return NextResponse.json(account);
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    name?: string;
    type?: AccountType;
    institution?: string;
    cashRole?: CashRole;
    monthlyDcaTarget?: number | string | null;
    externalKey?: string | null;
    externalProvider?: string | null;
  };

  const data: {
    name?: string;
    type?: AccountType;
    institution?: string;
    cashRole?: CashRole;
    monthlyDcaTarget?: number | null;
    externalKey?: string | null;
    externalProvider?: string | null;
  } = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.type !== undefined) data.type = body.type;
  if (body.institution !== undefined) data.institution = body.institution;
  if (body.cashRole !== undefined) data.cashRole = body.cashRole;
  if (body.externalKey !== undefined) {
    data.externalKey = body.externalKey?.trim() || null;
  }
  if (body.externalProvider !== undefined) {
    data.externalProvider = body.externalProvider?.trim() || null;
  }
  if (body.monthlyDcaTarget !== undefined) {
    if (
      body.monthlyDcaTarget === null ||
      body.monthlyDcaTarget === "" ||
      body.monthlyDcaTarget === 0
    ) {
      data.monthlyDcaTarget = null;
    } else {
      const n =
        typeof body.monthlyDcaTarget === "string"
          ? parseFloat(body.monthlyDcaTarget)
          : body.monthlyDcaTarget;
      data.monthlyDcaTarget = Number.isFinite(n) && n > 0 ? n : null;
    }
  }

  const account = await prisma.account.update({ where: { id }, data });
  return NextResponse.json(account);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
