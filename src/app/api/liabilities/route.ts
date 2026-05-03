import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.liabilityAccount.findMany({
    orderBy: [{ name: "asc" }, { date: "desc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    name: string;
    remainingBalance: number | string;
    date: string;
    note?: string;
    externalKey?: string | null;
    externalProvider?: string | null;
  };
  if (!body.name || body.remainingBalance === undefined || !body.date) {
    return NextResponse.json(
      { error: "name, remainingBalance, date requis" },
      { status: 400 },
    );
  }
  const item = await prisma.liabilityAccount.create({
    data: {
      name: body.name,
      remainingBalance:
        typeof body.remainingBalance === "string"
          ? parseFloat(body.remainingBalance)
          : body.remainingBalance,
      date: new Date(body.date),
      note: body.note ?? null,
      externalKey: body.externalKey?.trim() || null,
      externalProvider: body.externalKey ? body.externalProvider?.trim() || null : null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
