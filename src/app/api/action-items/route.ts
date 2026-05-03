import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ActionItemStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.actionItem.findMany({
    orderBy: [{ status: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    title: string;
    description?: string | null;
    status?: ActionItemStatus;
    dueDate?: string | null;
    order?: number;
  };
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title requis" }, { status: 400 });
  }

  const last = await prisma.actionItem.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = body.order ?? (last ? last.order + 1 : 0);

  const item = await prisma.actionItem.create({
    data: {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      status: body.status ?? "TODO",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      order: nextOrder,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
