"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  defaultName?: string;
  /** ID d'une LiabilityAccount existante : si fourni, la sauvegarde
   *  envoie un PATCH (édit en place — utile pour mapper l'externalKey
   *  sur une dette historique sans créer de nouveau snapshot). */
  patchTargetId?: string;
  /** Pré-remplit la clé externe + provider quand on ouvre en mode édition. */
  defaultExternalKey?: string | null;
  defaultExternalProvider?: string | null;
  buttonLabel?: string;
  buttonVariant?: "default" | "outline";
  small?: boolean;
}

export function AddLiabilityDialog({
  defaultName,
  patchTargetId,
  defaultExternalKey,
  defaultExternalProvider,
  buttonLabel,
  buttonVariant = "default",
  small,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(defaultName ?? "");
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [note, setNote] = React.useState("");
  const [externalKey, setExternalKey] = React.useState(
    defaultExternalKey ?? "",
  );
  const [externalProvider, setExternalProvider] = React.useState(
    defaultExternalProvider ?? "",
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName(defaultName ?? "");
      setAmount("");
      setNote("");
      setDate(new Date().toISOString().slice(0, 10));
      setExternalKey(defaultExternalKey ?? "");
      setExternalProvider(defaultExternalProvider ?? "");
    }
  }, [open, defaultName, defaultExternalKey, defaultExternalProvider]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // Mode édition (mapping seulement) : PATCH sur la ligne existante.
      // Mode normal (saisie de solde + éventuellement mapping) : POST,
      // crée un nouveau snapshot et porte le mapping sur cette nouvelle ligne.
      const isPatch = !!patchTargetId && !amount;
      const url = isPatch
        ? `/api/liabilities/${patchTargetId}`
        : "/api/liabilities";
      const method = isPatch ? "PATCH" : "POST";
      const body = isPatch
        ? {
            externalKey: externalKey || null,
            externalProvider: externalKey ? externalProvider || null : null,
          }
        : {
            name,
            remainingBalance: parseFloat(amount.replace(",", ".")),
            date,
            note: note || undefined,
            externalKey: externalKey || null,
            externalProvider: externalKey ? externalProvider || null : null,
          };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Erreur ${res.status}`);
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={small ? "sm" : "default"}>
          <Plus />
          {buttonLabel ?? (defaultName ? "Mettre à jour" : "Ajouter une dette")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {defaultName ? `Mettre à jour : ${defaultName}` : "Nouvelle dette"}
            </DialogTitle>
            <DialogDescription>
              Saisir le capital restant dû à une date donnée.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Crédit immo Crédit Mutuel"
              required
              readOnly={!!defaultName}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">
              Capital restant dû (EUR)
              {patchTargetId ? (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  — laisser vide pour ne modifier que le mapping
                </span>
              ) : null}
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="ex. 145000.00"
              required={!patchTargetId}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required={!patchTargetId}
              disabled={!!patchTargetId && !amount}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="note">Note (optionnel)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ex. Échéance 2042"
              disabled={!!patchTargetId && !amount}
            />
          </div>

          <div className="grid grid-cols-[1fr_minmax(140px,180px)] gap-3">
            <div className="grid gap-2">
              <Label htmlFor="liab-externalKey">
                Clé externe (sync auto)
              </Label>
              <Input
                id="liab-externalKey"
                value={externalKey}
                onChange={(e) => setExternalKey(e.target.value)}
                placeholder="ex. 3904300023706306"
              />
              <p className="text-xs text-muted-foreground">
                ID du compte chez le provider. À chaque sync, un nouveau
                snapshot de cette dette sera créé avec le solde reçu.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="liab-externalProvider">Provider</Label>
              <Select
                value={externalProvider || "none"}
                onValueChange={(v) =>
                  setExternalProvider(v === "none" ? "" : v)
                }
              >
                <SelectTrigger id="liab-externalProvider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="creditmutuel">Crédit Mutuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                !name ||
                (!patchTargetId && !amount) ||
                (!!patchTargetId && !amount && !externalKey)
              }
            >
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
