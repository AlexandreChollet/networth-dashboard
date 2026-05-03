import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddAssetDialog } from "@/components/assets/add-asset-dialog";
import {
  ASSET_TYPE_COLORS,
  ASSET_TYPE_LABELS,
  formatDate,
  formatEUR,
  toNumber,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const assets = await prisma.asset.findMany({
    include: { valuations: { orderBy: { date: "desc" }, take: 1 } },
    orderBy: { createdAt: "asc" },
  });

  const total = assets.reduce(
    (s, a) => s + (a.valuations[0] ? toNumber(a.valuations[0].value) : 0),
    0,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
          <p className="text-sm text-muted-foreground">
            Biens physiques (immobilier, véhicules…) — {assets.length} bien
            {assets.length > 1 ? "s" : ""} · valeur totale{" "}
            <span className="font-medium text-foreground">{formatEUR(total)}</span>
          </p>
        </div>
        <AddAssetDialog />
      </header>

      {assets.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aucun asset enregistré. Cliquez sur « Ajouter un asset » pour
            commencer.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {assets.map((a) => {
            const latest = a.valuations[0];
            return (
              <Link key={a.id} href={`/assets/${a.id}`} className="group">
                <Card className="transition-colors group-hover:border-foreground/20">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{
                            background:
                              ASSET_TYPE_COLORS[a.type] ?? "hsl(var(--chart-8))",
                          }}
                        />
                        <CardTitle className="text-base">{a.name}</CardTitle>
                      </div>
                      <CardDescription>
                        {ASSET_TYPE_LABELS[a.type] ?? a.type}
                        {a.description ? ` · ${a.description}` : ""}
                      </CardDescription>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-end justify-between">
                      <div className="text-2xl font-semibold tabular-nums">
                        {latest ? formatEUR(toNumber(latest.value)) : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {latest
                          ? formatDate(latest.date)
                          : "Pas encore de valorisation"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
