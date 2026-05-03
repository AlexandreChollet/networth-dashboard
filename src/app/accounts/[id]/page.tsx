import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UpdateBalanceDialog } from "@/components/accounts/update-balance-dialog";
import { DeleteButton } from "@/components/accounts/delete-button";
import { BalanceHistoryChart } from "@/components/accounts/balance-history-chart";
import { AddTransactionDialog } from "@/components/accounts/add-transaction-dialog";
import { EditAccountDialog } from "@/components/accounts/edit-account-dialog";
import {
  ACCOUNT_TYPE_LABELS,
  CASH_ROLE_LABELS,
  formatDate,
  formatEUR,
  toNumber,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_DISPLAY_SIGN,
  TRANSACTION_CONTRIBUTION_SIGN,
} from "@/lib/format";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AccountDetailPage({ params }: Props) {
  const { id } = await params;
  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      balances: { orderBy: { date: "desc" } },
      transactions: { orderBy: [{ date: "desc" }, { createdAt: "desc" }] },
    },
  });
  if (!account) notFound();

  const latest = account.balances[0];
  const oldest = account.balances[account.balances.length - 1];
  const variation =
    latest && oldest
      ? toNumber(latest.amount) - toNumber(oldest.amount)
      : 0;

  const netContributions = account.transactions.reduce(
    (s, t) =>
      s +
      (TRANSACTION_CONTRIBUTION_SIGN[t.type] ?? 0) * toNumber(t.amount),
    0,
  );
  const totalReturn =
    latest && netContributions !== 0
      ? toNumber(latest.amount) - netContributions
      : null;

  const chartData = [...account.balances]
    .reverse()
    .map((b) => ({ date: b.date.toISOString().slice(0, 10), value: toNumber(b.amount) }));

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/accounts">
            <ArrowLeft /> Retour
          </Link>
        </Button>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{account.name}</h1>
          <p className="text-sm text-muted-foreground">
            {ACCOUNT_TYPE_LABELS[account.type] ?? account.type} ·{" "}
            {account.institution} ·{" "}
            <span
              className={
                account.cashRole === "DORMANT"
                  ? "text-amber-600 dark:text-amber-400"
                  : ""
              }
            >
              {CASH_ROLE_LABELS[account.cashRole] ?? account.cashRole}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <UpdateBalanceDialog accountId={account.id} />
          <EditAccountDialog
            account={{
              id: account.id,
              name: account.name,
              type: account.type,
              institution: account.institution,
              cashRole: account.cashRole,
              monthlyDcaTarget:
                account.monthlyDcaTarget != null
                  ? toNumber(account.monthlyDcaTarget)
                  : null,
              externalKey: account.externalKey,
              externalProvider: account.externalProvider,
            }}
          />
          <DeleteButton
            endpoint={`/api/accounts/${account.id}`}
            confirmText={`Supprimer le compte « ${account.name} » et tout son historique ?`}
            redirectTo="/accounts"
            label="Supprimer"
          />
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Solde actuel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {latest ? formatEUR(toNumber(latest.amount)) : "—"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {latest ? `au ${formatDate(latest.date)}` : "Aucun solde"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Variation totale</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-semibold tabular-nums ${variation >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
            >
              {variation >= 0 ? "+" : "−"}
              {formatEUR(Math.abs(variation))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Depuis {oldest ? formatDate(oldest.date) : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saisies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {account.balances.length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Soldes archivés</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <CardContent>
          <BalanceHistoryChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saisies</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {account.balances.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Pas encore de solde. Cliquez sur « Mettre à jour le solde ».
            </p>
          ) : (
            <ul className="divide-y">
              {account.balances.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-3 px-6 py-3 text-sm"
                >
                  <div>
                    <div className="font-medium tabular-nums">
                      {formatEUR(toNumber(b.amount))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(b.date)}
                      {b.note ? ` · ${b.note}` : ""}
                    </div>
                  </div>
                  <DeleteButton
                    endpoint={`/api/balances/${b.id}`}
                    confirmText="Supprimer ce solde ?"
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {account.transactions.length > 0 || netContributions !== 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Apports nets cumulés</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-semibold tabular-nums ${
                  netContributions >= 0
                    ? ""
                    : "text-destructive"
                }`}
              >
                {netContributions >= 0 ? "" : "−"}
                {formatEUR(Math.abs(netContributions))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Versements − retraits
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Performance</CardDescription>
            </CardHeader>
            <CardContent>
              {totalReturn === null ? (
                <div className="text-2xl font-semibold tabular-nums text-muted-foreground">
                  —
                </div>
              ) : (
                <div
                  className={`text-2xl font-semibold tabular-nums ${
                    totalReturn >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive"
                  }`}
                >
                  {totalReturn >= 0 ? "+" : "−"}
                  {formatEUR(Math.abs(totalReturn))}
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Solde actuel − apports nets
              </p>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Versements et flux</CardTitle>
            <CardDescription>
              Versements, retraits, intérêts et frais. Permet de distinguer
              apports vs performance.
            </CardDescription>
          </div>
          <AddTransactionDialog accountId={account.id} small />
        </CardHeader>
        <CardContent className="p-0">
          {account.transactions.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Pas encore de flux enregistré.
            </p>
          ) : (
            <ul className="divide-y">
              {account.transactions.map((t) => {
                const sign = TRANSACTION_DISPLAY_SIGN[t.type] ?? 1;
                const amount = toNumber(t.amount);
                return (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-6 py-3 text-sm"
                  >
                    <div>
                      <div
                        className={`font-medium tabular-nums ${
                          sign > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                        }`}
                      >
                        {sign > 0 ? "+" : "−"}
                        {formatEUR(amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {TRANSACTION_TYPE_LABELS[t.type] ?? t.type} ·{" "}
                        {formatDate(t.date)}
                        {t.note ? ` · ${t.note}` : ""}
                      </div>
                    </div>
                    <DeleteButton
                      endpoint={`/api/transactions/${t.id}`}
                      confirmText="Supprimer ce flux ?"
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
