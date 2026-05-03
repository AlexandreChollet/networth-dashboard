import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { AccountType, CashRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const accounts = await prisma.account.findMany({
    include: { balances: { orderBy: { date: "desc" }, take: 1 } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(accounts);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, type, institution, cashRole } = body as {
    name: string;
    type: AccountType;
    institution: string;
    cashRole?: CashRole;
  };
  if (!name || !type || !institution) {
    return NextResponse.json(
      { error: "name, type, institution requis" },
      { status: 400 },
    );
  }
  const account = await prisma.account.create({
    data: { name, type, institution, cashRole: cashRole ?? "OPERATIONAL" },
  });
  return NextResponse.json(account, { status: 201 });
}
