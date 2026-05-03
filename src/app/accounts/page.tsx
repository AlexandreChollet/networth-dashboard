import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AddAccountDialog } from "@/components/accounts/add-account-dialog";
import {
  ACCOUNT_TYPE_COLORS,
  ACCOUNT_TYPE_LABELS,
  formatDate,
  formatEUR,
  toNumber,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({
    include: { balances: { orderBy: { date: "desc" }, take: 1 } },
    orderBy: { createdAt: "asc" },
  });

  const total = accounts.reduce(
    (s, a) => s + (a.balances[0] ? toNumber(a.balances[0].amount) : 0),
    0,
  );

  // Regroupement par établissement (`institution`).
  // Tri alphabétique entre groupes ; à l'intérieur on garde l'ordre de création.
  const groups = new Map<string, typeof accounts>();
  for (const a of accounts) {
    const list = groups.get(a.institution) ?? [];
    list.push(a);
    groups.set(a.institution, list);
  }
  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) =>
    a.localeCompare(b, "fr", { sensitivity: "base" }),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comptes</h1>
          <p className="text-sm text-muted-foreground">
            {accounts.length} compte{accounts.length > 1 ? "s" : ""} · total{" "}
            <span className="font-medium text-foreground">{formatEUR(total)}</span>
          </p>
        </div>
        <AddAccountDialog />
      </header>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aucun compte pour le moment. Cliquez sur « Ajouter un compte » pour
            commencer.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {sortedGroups.map(([institution, group]) => {
            const groupTotal = group.reduce(
              (s, a) => s + (a.balances[0] ? toNumber(a.balances[0].amount) : 0),
              0,
            );
            return (
              <section key={institution} className="space-y-3">
                <div className="flex items-baseline justify-between border-b pb-2">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {institution}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {group.length} compte{group.length > 1 ? "s" : ""} ·{" "}
                    <span className="font-medium tabular-nums text-foreground">
                      {formatEUR(groupTotal)}
                    </span>
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.map((a) => {
                    const latest = a.balances[0];
                    return (
                      <Link
                        key={a.id}
                        href={`/accounts/${a.id}`}
                        className="group"
                      >
                        <Card className="transition-colors group-hover:border-foreground/20">
                          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-full"
                                  style={{
                                    background:
                                      ACCOUNT_TYPE_COLORS[a.type] ??
                                      "hsl(var(--chart-8))",
                                  }}
                                />
                                <CardTitle className="text-base">
                                  {a.name}
                                </CardTitle>
                              </div>
                              <CardDescription>
                                {ACCOUNT_TYPE_LABELS[a.type] ?? a.type}
                              </CardDescription>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-end justify-between">
                              <div className="text-2xl font-semibold tabular-nums">
                                {latest
                                  ? formatEUR(toNumber(latest.amount))
                                  : "—"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {latest
                                  ? formatDate(latest.date)
                                  : "Pas encore de solde"}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
