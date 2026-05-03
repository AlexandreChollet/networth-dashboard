import { cache } from "react";
import { prisma } from "@/lib/db";
import { fetchPrices } from "@/lib/coingecko";
import { toNumber } from "@/lib/format";

export interface AccountWithLatest {
  id: string;
  name: string;
  type: string;
  institution: string;
  cashRole: "OPERATIONAL" | "DORMANT" | "INVESTED";
  monthlyDcaTarget: number | null;
  latestBalance: number;
  latestDate: Date | null;
}

export interface DcaProgress {
  accountId: string;
  accountName: string;
  type: string;
  target: number;
  actual: number;
  /** Pourcentage de l'objectif atteint ce mois-ci (0..n). */
  pct: number;
}

export interface AssetWithLatest {
  id: string;
  name: string;
  type: string;
  description: string | null;
  latestValue: number;
  latestDate: Date | null;
}

export interface CryptoSummary {
  id: string;
  symbol: string;
  coingeckoId: string;
  quantity: number;
  priceEUR: number | null;
  valueEUR: number;
  lastUpdatedAt: Date;
  priceFetchedAt: Date | null;
}

export interface NetWorthSnapshot {
  accounts: AccountWithLatest[];
  assets: AssetWithLatest[];
  crypto: CryptoSummary[];
  liabilities: {
    id: string;
    name: string;
    remainingBalance: number;
    date: Date;
    note?: string | null;
    fromSchedule?: boolean;
  }[];
  totals: {
    accounts: number;
    assets: number;
    crypto: number;
    liabilities: number;
    netWorth: number;
    /** Somme des soldes des comptes marqués DORMANT — argent qui dort. */
    dormantCash: number;
  };
  /** Répartition globale par catégorie : types de comptes + types d'assets + crypto */
  breakdown: Record<string, number>;
  cryptoFetchError: string | null;
}

export async function getAccountsWithLatest(): Promise<AccountWithLatest[]> {
  const accounts = await prisma.account.findMany({
    include: {
      balances: { orderBy: { date: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    institution: a.institution,
    cashRole: a.cashRole,
    monthlyDcaTarget:
      a.monthlyDcaTarget != null ? toNumber(a.monthlyDcaTarget) : null,
    latestBalance: a.balances[0] ? toNumber(a.balances[0].amount) : 0,
    latestDate: a.balances[0]?.date ?? null,
  }));
}

/** Pour le mois en cours : versements (DEPOSIT) effectués par compte ayant
 *  un objectif `monthlyDcaTarget` non nul. Les comptes sans objectif sont
 *  ignorés. */
export async function getMonthlyDcaProgress(): Promise<{
  items: DcaProgress[];
  totalTarget: number;
  totalActual: number;
}> {
  const accounts = await prisma.account.findMany({
    where: { monthlyDcaTarget: { not: null } },
    orderBy: { createdAt: "asc" },
  });
  if (accounts.length === 0) {
    return { items: [], totalTarget: 0, totalActual: 0 };
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const transactions = await prisma.transaction.findMany({
    where: {
      accountId: { in: accounts.map((a) => a.id) },
      type: "DEPOSIT",
      date: { gte: monthStart, lt: monthEnd },
    },
  });

  const actualByAccount = new Map<string, number>();
  for (const t of transactions) {
    actualByAccount.set(
      t.accountId,
      (actualByAccount.get(t.accountId) ?? 0) + toNumber(t.amount),
    );
  }

  const items: DcaProgress[] = accounts.map((a) => {
    const target = toNumber(a.monthlyDcaTarget);
    const actual = actualByAccount.get(a.id) ?? 0;
    return {
      accountId: a.id,
      accountName: a.name,
      type: a.type,
      target,
      actual,
      pct: target > 0 ? (actual / target) * 100 : 0,
    };
  });

  return {
    items,
    totalTarget: items.reduce((s, i) => s + i.target, 0),
    totalActual: items.reduce((s, i) => s + i.actual, 0),
  };
}

export async function getAssetsWithLatest(): Promise<AssetWithLatest[]> {
  const assets = await prisma.asset.findMany({
    include: {
      valuations: { orderBy: { date: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  return assets.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    description: a.description,
    latestValue: a.valuations[0] ? toNumber(a.valuations[0].value) : 0,
    latestDate: a.valuations[0]?.date ?? null,
  }));
}

/**
 * Mémoïsé par requête (React `cache`) : sur la home, snapshot + series
 * appellent tous les deux cette fonction en parallèle. Sans dédup, on tape
 * CoinGecko deux fois par render et on accélère le rate-limit (429 silencieux
 * → valeurs à 0). Avec `cache`, un seul fetch CoinGecko par requête HTTP.
 */
export const getCryptoSummary = cache(_getCryptoSummary);

async function _getCryptoSummary(): Promise<{
  items: CryptoSummary[];
  error: string | null;
}> {
  const holdings = await prisma.cryptoHolding.findMany({
    orderBy: { symbol: "asc" },
  });
  if (holdings.length === 0) return { items: [], error: null };

  let prices: Awaited<ReturnType<typeof fetchPrices>> = new Map();
  let error: string | null = null;
  try {
    prices = await fetchPrices(holdings.map((h) => h.coingeckoId));
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  // Persiste les nouveaux prix en base, en arrière-plan (best-effort).
  // `lastPriceFetchedAt` = horodatage du fetch côté serveur (= dernier
  // rafraîchissement réussi), distinct du `last_updated_at` retourné par
  // CoinGecko qui correspond à la date de mise à jour du prix chez eux.
  const fetchedAt = new Date();
  const persistOps: Promise<unknown>[] = [];
  for (const h of holdings) {
    const p = prices.get(h.coingeckoId.toLowerCase());
    if (p) {
      persistOps.push(
        prisma.cryptoHolding.update({
          where: { id: h.id },
          data: {
            lastPriceEUR: p.eur,
            lastPriceFetchedAt: fetchedAt,
          },
        }),
      );
    }
  }
  // On attend pour garantir la cohérence dans la même requête.
  // Si l'écriture échoue on log : sans prix persisté la DB resterait à NULL,
  // donc une erreur silencieuse est inacceptable (garantie "jamais NULL").
  if (persistOps.length > 0) {
    try {
      await Promise.all(persistOps);
    } catch (e) {
      console.error("[crypto] persist lastPriceEUR failed:", e);
    }
  }

  const items = holdings.map((h) => {
    const fresh = prices.get(h.coingeckoId.toLowerCase());
    const qty = toNumber(h.quantity);
    // Priorité : prix frais → dernier prix connu en DB → null.
    // On utilise `!= null` (et non `!==`) pour aussi attraper `undefined` —
    // ça arrive si le Prisma client est désync du schéma et ne renvoie pas
    // la colonne. Sinon `toNumber(undefined)` rendrait silencieusement 0.
    const priceEUR =
      fresh?.eur ?? (h.lastPriceEUR != null ? toNumber(h.lastPriceEUR) : null);
    const priceFetchedAt = fresh ? fetchedAt : h.lastPriceFetchedAt;
    return {
      id: h.id,
      symbol: h.symbol,
      coingeckoId: h.coingeckoId,
      quantity: qty,
      priceEUR,
      valueEUR: priceEUR !== null ? priceEUR * qty : 0,
      lastUpdatedAt: h.lastUpdated,
      priceFetchedAt: priceFetchedAt ?? null,
    };
  });

  // Si le fetch a échoué mais que toutes les holdings ont un prix de repli en DB,
  // on absorbe l'erreur silencieusement — l'utilisateur voit les valeurs en cache.
  if (error && items.every((i) => i.priceEUR !== null)) {
    error = null;
  }

  // Cas silencieux : CoinGecko répond 200 mais sans données pour certains IDs
  // (typo, ID inconnu, throttling soft). On signale les holdings qui finissent
  // sans prix exploitable pour qu'ils n'affichent pas un 0 € sans explication.
  if (!error) {
    const missing = items.filter((i) => i.priceEUR === null);
    if (missing.length > 0) {
      error = `Prix indisponible pour : ${missing.map((i) => i.symbol).join(", ")}`;
    }
  }

  return { items, error };
}

/** CRD courant d'un prêt à partir de son schedule = capitalBefore de la
 *  prochaine échéance >= now. Si toutes les échéances sont passées (prêt
 *  remboursé), retourne 0. Si toutes sont futures (prêt pas encore commencé),
 *  retourne le capitalBefore de la 1re. */
function computeCurrentBalanceFromSchedule(
  rows: Array<{ dueDate: Date; capitalBefore: unknown }>,
  now: Date,
): { balance: number; date: Date } | null {
  if (rows.length === 0) return null;
  // rows must be sorted asc by dueDate.
  const next = rows.find((r) => r.dueDate >= now);
  if (next) {
    return { balance: toNumber(next.capitalBefore), date: next.dueDate };
  }
  // Plus aucune échéance future → prêt remboursé.
  return { balance: 0, date: rows[rows.length - 1].dueDate };
}

export async function getLiabilitiesLatest() {
  const all = await prisma.liabilityAccount.findMany({
    orderBy: [{ name: "asc" }, { date: "desc" }],
    include: {
      schedule: {
        orderBy: { dueDate: "asc" },
        select: { dueDate: true, capitalBefore: true },
      },
    },
  });

  // Groupe par nom : on garde la dernière saisie manuelle ET on récupère
  // le schedule s'il existe sur n'importe quelle entrée du même nom.
  const byName = new Map<string, (typeof all)[number]>();
  const scheduleByName = new Map<
    string,
    Array<{ dueDate: Date; capitalBefore: unknown }>
  >();
  for (const l of all) {
    if (!byName.has(l.name)) byName.set(l.name, l);
    if (l.schedule.length > 0 && !scheduleByName.has(l.name)) {
      scheduleByName.set(l.name, l.schedule);
    }
  }

  const now = new Date();
  return Array.from(byName.values()).map((l) => {
    const schedule = scheduleByName.get(l.name);
    if (schedule && schedule.length > 0) {
      const computed = computeCurrentBalanceFromSchedule(schedule, now);
      if (computed) {
        return {
          id: l.id,
          name: l.name,
          remainingBalance: computed.balance,
          date: computed.date,
          note: l.note,
          fromSchedule: true,
        };
      }
    }
    return {
      id: l.id,
      name: l.name,
      remainingBalance: toNumber(l.remainingBalance),
      date: l.date,
      note: l.note,
      fromSchedule: false,
    };
  });
}

export async function getNetWorthSnapshot(): Promise<NetWorthSnapshot> {
  const [accounts, assets, crypto, liabilities] = await Promise.all([
    getAccountsWithLatest(),
    getAssetsWithLatest(),
    getCryptoSummary(),
    getLiabilitiesLatest(),
  ]);

  const accountsTotal = accounts.reduce((s, a) => s + a.latestBalance, 0);
  const assetsTotal = assets.reduce((s, a) => s + a.latestValue, 0);
  const cryptoTotal = crypto.items.reduce((s, c) => s + c.valueEUR, 0);
  const liabilitiesTotal = liabilities.reduce(
    (s, l) => s + l.remainingBalance,
    0,
  );
  const dormantCashTotal = accounts.reduce(
    (s, a) => s + (a.cashRole === "DORMANT" ? a.latestBalance : 0),
    0,
  );

  const breakdown: Record<string, number> = {};
  for (const a of accounts) {
    breakdown[a.type] = (breakdown[a.type] ?? 0) + a.latestBalance;
  }
  for (const a of assets) {
    breakdown[a.type] = (breakdown[a.type] ?? 0) + a.latestValue;
  }
  if (cryptoTotal > 0) {
    breakdown.CRYPTO = (breakdown.CRYPTO ?? 0) + cryptoTotal;
  }

  return {
    accounts,
    assets,
    crypto: crypto.items,
    liabilities,
    totals: {
      accounts: accountsTotal,
      assets: assetsTotal,
      crypto: cryptoTotal,
      liabilities: liabilitiesTotal,
      netWorth: accountsTotal + assetsTotal + cryptoTotal - liabilitiesTotal,
      dormantCash: dormantCashTotal,
    },
    breakdown,
    cryptoFetchError: crypto.error,
  };
}

/**
 * Évolution du patrimoine sur les N derniers mois.
 * Pour chaque mois : dernier solde connu par compte + dernière valuation par asset
 * (avant la fin du mois) + valeur crypto courante au dernier point.
 */
export interface NetWorthSeriesPoint {
  date: string;
  net: number;
  assets: number;
  liabilities: number;
  /** Apports nets cumulés jusqu'à la fin du mois (sum DEPOSIT − sum WITHDRAW
   *  sur tous les comptes). 0 si aucune transaction enregistrée — la ligne
   *  est alors masquée à l'affichage. */
  contributions: number;
}

export async function getNetWorthSeries(
  months = 12,
): Promise<NetWorthSeriesPoint[]> {
  const accounts = await prisma.account.findMany({
    include: { balances: { orderBy: { date: "asc" } } },
  });
  const assetsRows = await prisma.asset.findMany({
    include: { valuations: { orderBy: { date: "asc" } } },
  });
  const liabilities = await prisma.liabilityAccount.findMany({
    orderBy: { date: "asc" },
  });
  const transactions = await prisma.transaction.findMany({
    where: { type: { in: ["DEPOSIT", "WITHDRAW"] } },
    orderBy: { date: "asc" },
  });

  const now = new Date();
  const cryptoSummary = await getCryptoSummary();
  const cryptoTotalNow = cryptoSummary.items.reduce(
    (s, c) => s + c.valueEUR,
    0,
  );

  const points: NetWorthSeriesPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    cursor.setHours(23, 59, 59, 999);
    const label = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;

    let assetsTotal = 0;
    for (const a of accounts) {
      const lastBal = [...a.balances].reverse().find((b) => b.date <= cursor);
      if (lastBal) assetsTotal += toNumber(lastBal.amount);
    }
    for (const a of assetsRows) {
      const lastVal = [...a.valuations].reverse().find((v) => v.date <= cursor);
      if (lastVal) assetsTotal += toNumber(lastVal.value);
    }

    if (i === 0) assetsTotal += cryptoTotalNow;

    let liab = 0;
    const byName = new Map<string, (typeof liabilities)[number]>();
    for (const l of liabilities) {
      if (l.date <= cursor) {
        const prev = byName.get(l.name);
        if (!prev || l.date > prev.date) byName.set(l.name, l);
      }
    }
    for (const l of byName.values()) liab += toNumber(l.remainingBalance);

    let contributions = 0;
    for (const t of transactions) {
      if (t.date > cursor) break;
      const sign = t.type === "DEPOSIT" ? 1 : -1;
      contributions += sign * toNumber(t.amount);
    }

    points.push({
      date: label,
      net: assetsTotal - liab,
      assets: assetsTotal,
      liabilities: liab,
      contributions,
    });
  }

  return points;
}
