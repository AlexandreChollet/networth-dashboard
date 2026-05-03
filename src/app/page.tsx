import Link from "next/link";
import {
  ArrowRight,
  TrendingUp,
  Wallet,
  Bitcoin,
  Receipt,
  Building2,
  Coins,
  RefreshCcw,
  AlertTriangle,
  Target,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { BreakdownDonut } from "@/components/charts/breakdown-donut";
import { NetWorthLine } from "@/components/charts/networth-line";
import {
  formatEUR,
  formatDate,
  formatDateTimeShort,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_COLORS,
  ASSET_TYPE_LABELS,
  ASSET_TYPE_COLORS,
} from "@/lib/format";
import {
  getNetWorthSnapshot,
  getNetWorthSeries,
  getMonthlyDcaProgress,
} from "@/lib/networth";
import { AutoSync } from "@/components/sync/auto-sync";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [snapshot, series, dca] = await Promise.all([
    getNetWorthSnapshot(),
    getNetWorthSeries(12),
    getMonthlyDcaProgress(),
  ]);

  const monthLabel = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date());
  const dcaPct =
    dca.totalTarget > 0 ? (dca.totalActual / dca.totalTarget) * 100 : 0;

  const grossAssets =
    snapshot.totals.accounts + snapshot.totals.assets + snapshot.totals.crypto;
  const dormantCash = snapshot.totals.dormantCash;
  const dormantPct = grossAssets > 0 ? (dormantCash / grossAssets) * 100 : 0;
  const dormantAccounts = snapshot.accounts.filter(
    (a) => a.cashRole === "DORMANT",
  );

  const lastCryptoRefresh = snapshot.crypto.reduce<Date | null>((latest, c) => {
    if (!c.priceFetchedAt) return latest;
    const d = new Date(c.priceFetchedAt);
    return !latest || d > latest ? d : latest;
  }, null);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Vue d&apos;ensemble
        </h1>
        <p className="text-sm text-muted-foreground">
          Tout ce qui compose votre patrimoine, agrégé en temps réel.
        </p>
      </header>

      <AutoSync />

      <section className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Coins className="h-4 w-4" /> Patrimoine brut
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold tabular-nums tracking-tight">
              {formatEUR(grossAssets)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Comptes + Assets + Crypto, hors dettes
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Patrimoine net
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold tabular-nums tracking-tight">
              {formatEUR(snapshot.totals.netWorth)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Actifs {formatEUR(grossAssets)} − Dettes{" "}
              {formatEUR(snapshot.totals.liabilities)}
            </p>
          </CardContent>
        </Card>

        <Link href="/accounts" className="group">
          <Card className="h-full transition-colors group-hover:border-foreground/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Comptes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">
                {formatEUR(snapshot.totals.accounts)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {snapshot.accounts.length} compte
                {snapshot.accounts.length > 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/assets" className="group">
          <Card className="h-full transition-colors group-hover:border-foreground/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Assets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">
                {formatEUR(snapshot.totals.assets)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {snapshot.assets.length} bien
                {snapshot.assets.length > 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/crypto" className="group">
          <Card className="h-full transition-colors group-hover:border-foreground/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Bitcoin className="h-4 w-4" /> Crypto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">
                {formatEUR(snapshot.totals.crypto)}
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                {snapshot.crypto.length} actif
                {snapshot.crypto.length > 1 ? "s" : ""}
                {lastCryptoRefresh ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <RefreshCcw className="h-3 w-3" />
                      {formatDateTimeShort(lastCryptoRefresh)}
                    </span>
                  </>
                ) : null}
              </p>
            </CardContent>
          </Card>
        </Link>
      </section>

      {dormantCash > 0 || dca.items.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {dormantCash > 0 ? (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <CardTitle className="text-base">
                      {formatEUR(dormantCash)} de cash dormant
                    </CardTitle>
                    <CardDescription>
                      {dormantPct.toFixed(1)} % du patrimoine brut. Du cash qui
                      devrait être investi (PEA cash, AV à 0, excédent CC…).
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {dormantAccounts.length > 0 ? (
                <CardContent>
                  <ul className="divide-y border-t">
                    {dormantAccounts.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between py-2 text-sm"
                      >
                        <Link
                          href={`/accounts/${a.id}`}
                          className="hover:underline"
                        >
                          <span className="font-medium">{a.name}</span>{" "}
                          <span className="text-muted-foreground">
                            · {ACCOUNT_TYPE_LABELS[a.type] ?? a.type} ·{" "}
                            {a.institution}
                          </span>
                        </Link>
                        <span className="font-medium tabular-nums">
                          {formatEUR(a.latestBalance)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              ) : null}
            </Card>
          ) : null}

          {dca.items.length > 0 ? (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="flex items-start gap-3">
                  <Target className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">
                      DCA · {monthLabel}
                    </CardTitle>
                    <CardDescription>
                      {formatEUR(dca.totalActual)} versés sur{" "}
                      {formatEUR(dca.totalTarget)} ({dcaPct.toFixed(0)} %).
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="divide-y border-t">
                  {dca.items.map((d) => {
                    const pctClamped = Math.min(100, Math.max(0, d.pct));
                    const ok = d.actual >= d.target;
                    return (
                      <li
                        key={d.accountId}
                        className="flex flex-col gap-1 py-2 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/accounts/${d.accountId}`}
                            className="font-medium hover:underline"
                          >
                            {d.accountName}
                          </Link>
                          <span className="tabular-nums">
                            <span
                              className={
                                ok
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-muted-foreground"
                              }
                            >
                              {formatEUR(d.actual)}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              / {formatEUR(d.target)}
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full ${
                              ok ? "bg-emerald-500" : "bg-primary"
                            }`}
                            style={{ width: `${pctClamped}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Évolution sur 12 mois</CardTitle>
            <CardDescription>
              Solde net mensuel. Quand des versements sont enregistrés, la
              ligne « Apports cumulés » apparaît : l&apos;écart avec le
              patrimoine = performance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NetWorthLine data={series} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition par catégorie</CardTitle>
            <CardDescription>Allocation actuelle des actifs.</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownDonut data={snapshot.breakdown} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Comptes
              </CardTitle>
              <CardDescription>Dernière saisie par compte.</CardDescription>
            </div>
            <Link
              href="/accounts"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Tout voir <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {snapshot.accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun compte.{" "}
                <Link href="/accounts" className="underline">
                  Ajouter un compte
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y">
                {snapshot.accounts.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{
                          background:
                            ACCOUNT_TYPE_COLORS[a.type] ?? "hsl(var(--chart-8))",
                        }}
                      />
                      <div>
                        <div className="font-medium">{a.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {ACCOUNT_TYPE_LABELS[a.type] ?? a.type} ·{" "}
                          {a.institution}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium tabular-nums">
                        {formatEUR(a.latestBalance)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(a.latestDate)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Assets
              </CardTitle>
              <CardDescription>Biens physiques.</CardDescription>
            </div>
            <Link
              href="/assets"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Tout voir <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {snapshot.assets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun asset.{" "}
                <Link href="/assets" className="underline">
                  Ajouter un asset
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y">
                {snapshot.assets.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{
                          background:
                            ASSET_TYPE_COLORS[a.type] ?? "hsl(var(--chart-8))",
                        }}
                      />
                      <div>
                        <div className="font-medium">{a.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {ASSET_TYPE_LABELS[a.type] ?? a.type}
                          {a.description ? ` · ${a.description}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium tabular-nums">
                        {formatEUR(a.latestValue)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(a.latestDate)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Dettes
              </CardTitle>
              <CardDescription>Capital restant dû.</CardDescription>
            </div>
            <Link
              href="/liabilities"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Tout voir <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {snapshot.liabilities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune dette enregistrée.
              </p>
            ) : (
              <ul className="divide-y">
                {snapshot.liabilities.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <div>
                      <div className="font-medium">{l.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Mis à jour le {formatDate(l.date)}
                      </div>
                    </div>
                    <div className="font-medium tabular-nums text-destructive">
                      −{formatEUR(l.remainingBalance)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {snapshot.cryptoFetchError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Impossible de récupérer les prix crypto : {snapshot.cryptoFetchError}
        </div>
      ) : null}
    </div>
  );
}
