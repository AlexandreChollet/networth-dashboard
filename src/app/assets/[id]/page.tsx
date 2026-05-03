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
import { UpdateValuationDialog } from "@/components/assets/update-valuation-dialog";
import { DeleteButton } from "@/components/accounts/delete-button";
import { BalanceHistoryChart } from "@/components/accounts/balance-history-chart";
import {
  ASSET_TYPE_LABELS,
  formatDate,
  formatEUR,
  toNumber,
} from "@/lib/format";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({ params }: Props) {
  const { id } = await params;
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: { valuations: { orderBy: { date: "desc" } } },
  });
  if (!asset) notFound();

  const latest = asset.valuations[0];
  const oldest = asset.valuations[asset.valuations.length - 1];
  const variation =
    latest && oldest ? toNumber(latest.value) - toNumber(oldest.value) : 0;

  const chartData = [...asset.valuations]
    .reverse()
    .map((v) => ({ date: v.date.toISOString().slice(0, 10), value: toNumber(v.value) }));

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/assets">
            <ArrowLeft /> Retour
          </Link>
        </Button>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{asset.name}</h1>
          <p className="text-sm text-muted-foreground">
            {ASSET_TYPE_LABELS[asset.type] ?? asset.type}
            {asset.description ? ` · ${asset.description}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <UpdateValuationDialog assetId={asset.id} />
          <DeleteButton
            endpoint={`/api/assets/${asset.id}`}
            confirmText={`Supprimer l'asset « ${asset.name} » et toutes ses valorisations ?`}
            redirectTo="/assets"
            label="Supprimer"
          />
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Valeur estimée</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {latest ? formatEUR(toNumber(latest.value)) : "—"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {latest ? `au ${formatDate(latest.date)}` : "Aucune valorisation"}
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
              {asset.valuations.length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Valorisations archivées</p>
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
          {asset.valuations.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Pas encore de valorisation. Cliquez sur « Nouvelle valorisation ».
            </p>
          ) : (
            <ul className="divide-y">
              {asset.valuations.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-3 px-6 py-3 text-sm"
                >
                  <div>
                    <div className="font-medium tabular-nums">
                      {formatEUR(toNumber(v.value))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(v.date)}
                      {v.note ? ` · ${v.note}` : ""}
                    </div>
                  </div>
                  <DeleteButton
                    endpoint={`/api/valuations/${v.id}`}
                    confirmText="Supprimer cette valorisation ?"
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
