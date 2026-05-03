"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Circle, CircleDot, Pencil, Plus, Trash2 } from "lucide-react";
import { AddActionItemDialog } from "@/components/plan/add-action-item-dialog";
import { EditActionItemDialog } from "@/components/plan/edit-action-item-dialog";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Status = "TODO" | "IN_PROGRESS" | "DONE";

export interface PlanItem {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  dueDate: string | null;
  completedAt: string | null;
  order: number;
}

const STATUS_LABEL: Record<Status, string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  DONE: "Fait",
};

const NEXT_STATUS: Record<Status, Status> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "TODO",
};

export function PlanClient({ initialItems }: { initialItems: PlanItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<PlanItem | null>(null);

  async function cycleStatus(item: PlanItem) {
    setPendingId(item.id);
    try {
      const res = await fetch(`/api/action-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: NEXT_STATUS[item.status] }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setPendingId(null);
    }
  }

  async function remove(item: PlanItem) {
    if (!confirm(`Supprimer « ${item.title} » ?`)) return;
    setPendingId(item.id);
    try {
      const res = await fetch(`/api/action-items/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setPendingId(null);
    }
  }

  const groups: Array<{ status: Status; items: PlanItem[] }> = [
    {
      status: "IN_PROGRESS",
      items: initialItems.filter((i) => i.status === "IN_PROGRESS"),
    },
    { status: "TODO", items: initialItems.filter((i) => i.status === "TODO") },
    { status: "DONE", items: initialItems.filter((i) => i.status === "DONE") },
  ];

  const todoCount = groups[0].items.length + groups[1].items.length;
  const doneCount = groups[2].items.length;
  const total = todoCount + doneCount;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Plan d&apos;action
          </h1>
          <p className="text-sm text-muted-foreground">
            {total === 0
              ? "Aucune action enregistrée."
              : `${doneCount} / ${total} fait${doneCount > 1 ? "s" : ""}`}
          </p>
        </div>
        <AddActionItemDialog />
      </header>

      <div className="space-y-6">
        {groups.map((g) =>
          g.items.length === 0 ? null : (
            <Card key={g.status}>
              <CardHeader>
                <CardTitle className="text-base">
                  {STATUS_LABEL[g.status]}{" "}
                  <span className="text-muted-foreground">
                    ({g.items.length})
                  </span>
                </CardTitle>
                {g.status === "TODO" ? (
                  <CardDescription>
                    Cliquer la pastille pour passer en cours.
                  </CardDescription>
                ) : g.status === "IN_PROGRESS" ? (
                  <CardDescription>
                    Cliquer la pastille pour marquer comme fait.
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y border-t">
                  {g.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 px-6 py-3"
                    >
                      <button
                        onClick={() => cycleStatus(item)}
                        disabled={pendingId === item.id}
                        aria-label={`Statut : ${STATUS_LABEL[item.status]}`}
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                      >
                        {item.status === "TODO" ? (
                          <Circle className="h-5 w-5" />
                        ) : item.status === "IN_PROGRESS" ? (
                          <CircleDot className="h-5 w-5 text-primary" />
                        ) : (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "text-sm font-medium",
                            item.status === "DONE" &&
                              "text-muted-foreground line-through",
                          )}
                        >
                          {item.title}
                        </div>
                        {item.description ? (
                          <div className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground">
                            {item.description}
                          </div>
                        ) : null}
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {item.dueDate ? (
                            <span>Échéance {formatDate(item.dueDate)}</span>
                          ) : null}
                          {item.completedAt ? (
                            <span>Fait le {formatDate(item.completedAt)}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing(item)}
                          aria-label="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(item)}
                          disabled={pendingId === item.id}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ),
        )}

        {total === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
              <p>Pas encore d&apos;action.</p>
              <AddActionItemDialog
                trigger={
                  <Button>
                    <Plus />
                    Ajouter la première
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : null}
      </div>

      {editing ? (
        <EditActionItemDialog
          item={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      ) : null}
    </div>
  );
}
