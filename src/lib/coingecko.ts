// Service serveur — récupère les prix crypto depuis CoinGecko (API publique).
// Aucun token requis sur le tier gratuit.

const COINGECKO_API = "https://api.coingecko.com/api/v3";

export interface CoinPrice {
  coingeckoId: string;
  eur: number;
  lastUpdatedAt: number; // unix seconds
}

export class CoinGeckoError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "CoinGeckoError";
  }
}

/**
 * Récupère les prix EUR pour une liste d'IDs CoinGecko.
 * Utilise /simple/price (endpoint public, pas de clé API).
 */
export async function fetchPrices(ids: string[]): Promise<Map<string, CoinPrice>> {
  const result = new Map<string, CoinPrice>();
  if (ids.length === 0) return result;

  const unique = Array.from(new Set(ids.map((s) => s.toLowerCase().trim()).filter(Boolean)));
  if (unique.length === 0) return result;

  const url = new URL(`${COINGECKO_API}/simple/price`);
  url.searchParams.set("ids", unique.join(","));
  url.searchParams.set("vs_currencies", "eur");
  url.searchParams.set("include_last_updated_at", "true");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { accept: "application/json" },
      // Pas de cache : chaque consultation renvoie un prix frais.
      // Le tier gratuit limite à ~30 req/min — la route /api/crypto/prices
      // n'est appelée qu'au montage de la page + toutes les 5 min côté client.
      cache: "no-store",
    });
  } catch (err) {
    throw new CoinGeckoError(
      `Impossible de joindre CoinGecko: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!res.ok) {
    throw new CoinGeckoError(
      `CoinGecko a renvoyé ${res.status} ${res.statusText}`,
      res.status,
    );
  }

  const data = (await res.json()) as Record<
    string,
    { eur?: number; last_updated_at?: number }
  >;

  for (const id of unique) {
    const entry = data[id];
    if (entry?.eur !== undefined) {
      result.set(id, {
        coingeckoId: id,
        eur: entry.eur,
        lastUpdatedAt: entry.last_updated_at ?? Math.floor(Date.now() / 1000),
      });
    }
  }

  return result;
}
