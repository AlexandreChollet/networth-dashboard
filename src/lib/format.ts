const eurFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const eurFormatterCompact = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatEUR(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return "—";
  return eurFormatter.format(n);
}

export function formatEURCompact(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return "—";
  return eurFormatterCompact.format(n);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return dateFormatter.format(new Date(d));
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return dateTimeFormatter.format(new Date(d));
}

/** Format compact `dd/MM à HH'h'mm` — ex. `02/05 à 14h30`. */
export function formatDateTimeShort(
  d: Date | string | null | undefined,
): string {
  if (!d) return "—";
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} à ${hh}h${min}`;
}

export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  // Prisma Decimal
  if (typeof value === "object" && value !== null && "toString" in value) {
    return parseFloat((value as { toString: () => string }).toString());
  }
  return 0;
}

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  PEA: "PEA",
  AV: "Assurance-vie",
  LIVRET: "Livret",
  PER: "PER",
  CRYPTO: "Crypto",
  CASH: "Liquidités",
  OTHER: "Autre",
};

export const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  PEA: "hsl(var(--chart-1))",
  AV: "hsl(var(--chart-2))",
  LIVRET: "hsl(var(--chart-3))",
  PER: "hsl(var(--chart-4))",
  CRYPTO: "hsl(var(--chart-5))",
  CASH: "hsl(var(--chart-7))",
  OTHER: "hsl(var(--chart-8))",
};

export const ASSET_TYPE_LABELS: Record<string, string> = {
  REAL_ESTATE: "Immobilier",
  VEHICLE: "Véhicule",
  COLLECTIBLE: "Objet de valeur",
  OTHER: "Autre",
};

export const ASSET_TYPE_COLORS: Record<string, string> = {
  REAL_ESTATE: "hsl(var(--chart-6))",
  VEHICLE: "hsl(var(--chart-3))",
  COLLECTIBLE: "hsl(var(--chart-4))",
  OTHER: "hsl(var(--chart-8))",
};

export const CASH_ROLE_LABELS: Record<string, string> = {
  OPERATIONAL: "Opérationnel",
  DORMANT: "Cash dormant",
  INVESTED: "Investi",
};

export const CASH_ROLE_DESCRIPTIONS: Record<string, string> = {
  OPERATIONAL: "Matelas / charges, à laisser tranquille.",
  DORMANT: "Du cash qui devrait être investi.",
  INVESTED: "Exposé aux marchés.",
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Versement",
  WITHDRAW: "Retrait",
  FEE: "Frais",
  INTEREST: "Intérêts",
  DIVIDEND: "Dividende",
};

/** Signe d'affichage : +1 = entrée d'argent dans le compte, -1 = sortie. */
export const TRANSACTION_DISPLAY_SIGN: Record<string, 1 | -1> = {
  DEPOSIT: 1,
  INTEREST: 1,
  DIVIDEND: 1,
  WITHDRAW: -1,
  FEE: -1,
};

/** Contribution nette aux apports : seuls DEPOSIT (+) et WITHDRAW (-)
 *  comptent. Les intérêts/dividendes sont une performance, pas un apport. */
export const TRANSACTION_CONTRIBUTION_SIGN: Record<string, 1 | -1 | 0> = {
  DEPOSIT: 1,
  WITHDRAW: -1,
  INTEREST: 0,
  DIVIDEND: 0,
  FEE: 0,
};
