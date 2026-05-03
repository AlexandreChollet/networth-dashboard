"use client";

import * as React from "react";
import { Plus, RefreshCcw, Pencil, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEUR, formatDateTime, formatDateTimeShort } from "@/lib/format";

const REFRESH_MS = 5 * 60 * 1000; // 5 min

interface CryptoItem {
  id: string;
  symbol: string;
  coingeckoId: string;
  quantity: number;
  priceEUR: number | null;
  valueEUR: number;
  lastUpdated: string;
  priceFetchedAt: string | null;
}

interface Props {
  initialItems: CryptoItem[];
  initialError: string | null;
}

/**
 * Le serveur renvoie toujours le dernier prix connu (persisté en DB) si
 * CoinGecko est indispo : on n'a pas besoin de cache localStorage.
 * On garde simplement le state courant si un fetch en arrière-plan échoue,
 * pour ne jamais flasher à 0 €.
 */
export function CryptoClient({ initialItems, initialError }: Props) {
  const [items, setItems] = React.useState<CryptoItem[]>(initialItems);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(initialError);

  const load = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/crypto/prices", { cache: "no-store" });
      const j = (await res.json()) as {
        items: CryptoItem[];
        total: number;
        error: string | null;
      };
      setItems(j.items);
      setError(j.error);
    } catch (e) {
      // En cas d'erreur réseau on conserve l'affichage courant
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const total = items.reduce((s, i) => s + i.valueEUR, 0);

  const lastSuccessfulRefresh = items.reduce<Date | null>((latest, c) => {
    if (!c.priceFetchedAt) return latest;
    const d = new Date(c.priceFetchedAt);
    return !latest || d > latest ? d : latest;
  }, null);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Crypto</h1>
          <p className="text-sm text-muted-foreground">
            Valeur totale{" "}
            <span className="font-medium text-foreground">
              {formatEUR(total)}
            </span>{" "}
            · prix CoinGecko, rafraîchis toutes les 5 minutes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastSuccessfulRefresh ? (
            <span
              className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"
              title="Dernier rafraîchissement réussi"
            >
              <RefreshCcw className="h-3 w-3" />
              {formatDateTimeShort(lastSuccessfulRefresh)}
            </span>
          ) : null}
          <Button
            variant="outline"
            size="icon"
            onClick={load}
            disabled={refreshing}
            aria-label="Rafraîchir"
          >
            <RefreshCcw className={refreshing ? "animate-spin" : ""} />
          </Button>
          <CryptoFormDialog onSaved={load} />
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Prix indisponibles côté CoinGecko ({error}). Affichage des derniers
          prix connus.
        </div>
      ) : null}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aucun actif crypto. Cliquez sur « Ajouter » pour en créer un.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((c) => (
            <Card key={c.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">{c.symbol}</CardTitle>
                  <CardDescription>{c.coingeckoId}</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <CryptoFormDialog
                    onSaved={load}
                    edit={{
                      id: c.id,
                      symbol: c.symbol,
                      coingeckoId: c.coingeckoId,
                      quantity: c.quantity,
                    }}
                  />
                  <DeleteCryptoButton id={c.id} onDeleted={load} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-semibold tabular-nums">
                      {c.priceEUR !== null ? formatEUR(c.valueEUR) : "—"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {c.quantity} {c.symbol} ·{" "}
                      {c.priceEUR !== null
                        ? formatEUR(c.priceEUR)
                        : "prix indispo"}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {c.priceFetchedAt
                      ? `Cours : ${formatDateTime(c.priceFetchedAt)}`
                      : "—"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}

function CryptoFormDialog({
  onSaved,
  edit,
}: {
  onSaved: () => void;
  edit?: { id: string; symbol: string; coingeckoId: string; quantity: number };
}) {
  const [open, setOpen] = React.useState(false);
  const [symbol, setSymbol] = React.useState(edit?.symbol ?? "");
  const [coingeckoId, setCoingeckoId] = React.useState(edit?.coingeckoId ?? "");
  const [quantity, setQuantity] = React.useState(
    edit ? String(edit.quantity) : "",
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open && edit) {
      setSymbol(edit.symbol);
      setCoingeckoId(edit.coingeckoId);
      setQuantity(String(edit.quantity));
    }
    if (open && !edit) {
      setSymbol("");
      setCoingeckoId("");
      setQuantity("");
    }
  }, [open, edit]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = edit ? `/api/crypto/${edit.id}` : "/api/crypto";
      const method = edit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          coingeckoId,
          quantity: parseFloat(quantity.replace(",", ".")),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Erreur ${res.status}`);
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {edit ? (
          <Button variant="ghost" size="icon" aria-label="Modifier">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus /> Ajouter
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {edit ? "Modifier l'actif" : "Nouvel actif crypto"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="symbol">Symbole</Label>
            <Input
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="ex. BTC"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="coingeckoId">ID CoinGecko</Label>
            <Input
              id="coingeckoId"
              value={coingeckoId}
              onChange={(e) => setCoingeckoId(e.target.value)}
              placeholder="ex. bitcoin"
              required
            />
            <p className="text-xs text-muted-foreground">
              Trouvable sur{" "}
              <span className="font-mono">coingecko.com</span> dans l&apos;URL
              de la coin (ex.{" "}
              <span className="font-mono">/coins/zcash</span> →{" "}
              <span className="font-mono">zcash</span>).
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="quantity">Quantité</Label>
            <Input
              id="quantity"
              type="number"
              step="any"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="ex. 0.05"
              required
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCryptoButton({
  id,
  onDeleted,
}: {
  id: string;
  onDeleted: () => void;
}) {
  const [pending, setPending] = React.useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Supprimer"
      disabled={pending}
      onClick={async () => {
        if (!confirm("Supprimer cet actif crypto ?")) return;
        setPending(true);
        try {
          await fetch(`/api/crypto/${id}`, { method: "DELETE" });
          onDeleted();
        } finally {
          setPending(false);
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
