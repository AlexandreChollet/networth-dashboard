import { CryptoClient } from "./crypto-client";
import { getCryptoSummary } from "@/lib/networth";

export const dynamic = "force-dynamic";

export default async function CryptoPage() {
  const { items, error } = await getCryptoSummary();

  // On sérialise pour pouvoir passer au composant client (Date → ISO string)
  const initial = items.map((c) => ({
    id: c.id,
    symbol: c.symbol,
    coingeckoId: c.coingeckoId,
    quantity: c.quantity,
    priceEUR: c.priceEUR,
    valueEUR: c.valueEUR,
    lastUpdated: c.lastUpdatedAt.toISOString(),
    priceFetchedAt: c.priceFetchedAt ? c.priceFetchedAt.toISOString() : null,
  }));

  return <CryptoClient initialItems={initial} initialError={error} />;
}
