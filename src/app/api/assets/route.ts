import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { AssetType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const assets = await prisma.asset.findMany({
    include: { valuations: { orderBy: { date: "desc" }, take: 1 } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(assets);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    name: string;
    type: AssetType;
    description?: string;
  };
  if (!body.name || !body.type) {
    return NextResponse.json(
      { error: "name et type requis" },
      { status: 400 },
    );
  }
  const asset = await prisma.asset.create({
    data: {
      name: body.name,
      type: body.type,
      description: body.description ?? null,
    },
  });
  return NextResponse.json(asset, { status: 201 });
}
