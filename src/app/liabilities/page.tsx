import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddLiabilityDialog } from "@/components/liabilities/add-liability-dialog";
import { DeleteButton } from "@/components/accounts/delete-button";
import { formatDate, formatEUR, toNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LiabilitiesPage() {
  const all = await prisma.liabilityAccount.findMany({
    orderBy: [{ name: "asc" }, { date: "desc" }],
  });

  // Groupe par nom — chaque "dette" = une série d'entrées
  const byName = new Map<string, typeof all>();
  for (const l of all) {
    const arr = byName.get(l.name) ?? [];
    arr.push(l);
    byName.set(l.name, arr);
  }

  const groups = Array.from(byName.entries()).map(([name, entries]) => {
    const sorted = [...entries].sort((a, b) => +b.date - +a.date);
    const latest = sorted[0];
    // Le mapping (externalKey/Provider) n'est porté que par UNE entrée par
    // dette (contrainte d'unicité). On la trouve où qu'elle soit dans
    // l'historique pour la passer au dialog d'édition.
    const mapped = sorted.find((e) => e.externalKey) ?? null;
    return { name, latest, mapped, entries: sorted };
  });

  const total = groups.reduce(
    (s, g) => s + toNumber(g.latest.remainingBalance),
    0,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dettes</h1>
          <p className="text-sm text-muted-foreground">
            Total restant{" "}
            <span className="font-medium text-foreground">{formatEUR(total)}</span>
          </p>
        </div>
        <AddLiabilityDialog />
      </header>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aucune dette enregistrée.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <Card key={g.name}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>{g.name}</CardTitle>
                  <CardDescription>
                    Restant dû{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      −{formatEUR(toNumber(g.latest.remainingBalance))}
                    </span>{" "}
                    au {formatDate(g.latest.date)}
                    {g.mapped?.externalKey ? (
                      <>
                        {" · "}
                        <code className="rounded bg-muted px-1 text-xs">
                          {g.mapped.externalKey}
                        </code>
                      </>
                    ) : null}
                  </CardDescription>
                </div>
                <AddLiabilityDialog
                  defaultName={g.name}
                  patchTargetId={g.mapped?.id ?? g.latest.id}
                  defaultExternalKey={g.mapped?.externalKey ?? null}
                  defaultExternalProvider={g.mapped?.externalProvider ?? null}
                  buttonVariant="outline"
                  small
                  buttonLabel="Mettre à jour"
                />
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y border-t">
                  {g.entries.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center justify-between gap-3 px-6 py-3 text-sm"
                    >
                      <div>
                        <div className="font-medium tabular-nums">
                          −{formatEUR(toNumber(e.remainingBalance))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(e.date)}
                          {e.note ? ` · ${e.note}` : ""}
                        </div>
                      </div>
                      <DeleteButton
                        endpoint={`/api/liabilities/${e.id}`}
                        confirmText="Supprimer cette saisie ?"
                      />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
