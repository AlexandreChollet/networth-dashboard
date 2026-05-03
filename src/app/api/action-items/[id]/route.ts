import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ActionItemStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

interface PatchBody {
  title?: string;
  description?: string | null;
  status?: ActionItemStatus;
  dueDate?: string | null;
  order?: number;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json()) as PatchBody;

  const data: {
    title?: string;
    description?: string | null;
    status?: ActionItemStatus;
    dueDate?: Date | null;
    order?: number;
    completedAt?: Date | null;
  } = {};

  if (body.title !== undefined) data.title = body.title.trim();
  if (body.description !== undefined)
    data.description = body.description?.trim() || null;
  if (body.dueDate !== undefined)
    data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.order !== undefined) data.order = body.order;
  if (body.status !== undefined) {
    data.status = body.status;
    data.completedAt = body.status === "DONE" ? new Date() : null;
  }

  const item = await prisma.actionItem.update({ where: { id }, data });
  return NextResponse.json(item);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  await prisma.actionItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
