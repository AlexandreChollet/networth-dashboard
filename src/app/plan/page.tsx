import { prisma } from "@/lib/db";
import { PlanClient } from "./plan-client";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const items = await prisma.actionItem.findMany({
    orderBy: [{ status: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });

  const serialized = items.map((i) => ({
    id: i.id,
    title: i.title,
    description: i.description,
    status: i.status,
    dueDate: i.dueDate ? i.dueDate.toISOString() : null,
    completedAt: i.completedAt ? i.completedAt.toISOString() : null,
    order: i.order,
  }));

  return <PlanClient initialItems={serialized} />;
}
