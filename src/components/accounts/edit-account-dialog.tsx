"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
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
import {
  ACCOUNT_TYPE_LABELS,
  CASH_ROLE_DESCRIPTIONS,
  CASH_ROLE_LABELS,
} from "@/lib/format";

const TYPES = ["PEA", "AV", "LIVRET", "PER", "CASH", "OTHER"] as const;
const CASH_ROLES = ["OPERATIONAL", "DORMANT", "INVESTED"] as const;
type AccountType = (typeof TYPES)[number];
type CashRole = (typeof CASH_ROLES)[number];

interface Props {
  account: {
    id: string;
    name: string;
    type: string;
    institution: string;
    cashRole: string;
    monthlyDcaTarget: number | null;
    externalKey: string | null;
    externalProvider: string | null;
  };
}

export function EditAccountDialog({ account }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(account.name);
  const [type, setType] = React.useState<AccountType>(
    account.type as AccountType,
  );
  const [institution, setInstitution] = React.useState(account.institution);
  const [cashRole, setCashRole] = React.useState<CashRole>(
    account.cashRole as CashRole,
  );
  const [monthlyDcaTarget, setMonthlyDcaTarget] = React.useState(
    account.monthlyDcaTarget != null ? String(account.monthlyDcaTarget) : "",
  );
  const [externalKey, setExternalKey] = React.useState(
    account.externalKey ?? "",
  );
  const [externalProvider, setExternalProvider] = React.useState(
    account.externalProvider ?? "",
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName(account.name);
      setType(account.type as AccountType);
      setInstitution(account.institution);
      setCashRole(account.cashRole as CashRole);
      setMonthlyDcaTarget(
        account.monthlyDcaTarget != null ? String(account.monthlyDcaTarget) : "",
      );
      setExternalKey(account.externalKey ?? "");
      setExternalProvider(account.externalProvider ?? "");
      setError(null);
    }
  }, [open, account]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          institution,
          cashRole,
          monthlyDcaTarget: monthlyDcaTarget
            ? parseFloat(monthlyDcaTarget.replace(",", "."))
            : null,
          externalKey: externalKey || null,
          externalProvider: externalKey ? externalProvider || null : null,
        }),
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
        <Button variant="outline" size="sm">
          <Pencil />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Modifier le compte</DialogTitle>
            <DialogDescription>
              Renommer, changer le type ou le rôle (cash dormant / investi…).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="edit-name">Nom</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-type">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as AccountType)}
            >
              <SelectTrigger id="edit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-institution">Établissement</Label>
            <Input
              id="edit-institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-cashRole">Rôle</Label>
            <Select
              value={cashRole}
              onValueChange={(v) => setCashRole(v as CashRole)}
            >
              <SelectTrigger id="edit-cashRole">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CASH_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {CASH_ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {CASH_ROLE_DESCRIPTIONS[cashRole]}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-monthlyDcaTarget">
              Objectif DCA mensuel (EUR, optionnel)
            </Label>
            <Input
              id="edit-monthlyDcaTarget"
              type="number"
              step="0.01"
              min="0"
              value={monthlyDcaTarget}
              onChange={(e) => setMonthlyDcaTarget(e.target.value)}
              placeholder="ex. 1500"
            />
            <p className="text-xs text-muted-foreground">
              Versements mensuels visés. Vide = pas d&apos;objectif.
            </p>
          </div>

          <div className="grid grid-cols-[1fr_minmax(140px,180px)] gap-3">
            <div className="grid gap-2">
              <Label htmlFor="edit-externalKey">
                Clé externe (sync auto)
              </Label>
              <Input
                id="edit-externalKey"
                value={externalKey}
                onChange={(e) => setExternalKey(e.target.value)}
                placeholder="ex. 00012345678X"
              />
              <p className="text-xs text-muted-foreground">
                ID du compte chez le provider, copié depuis l&apos;alerte
                « comptes non mappés ».
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-externalProvider">Provider</Label>
              <Select
                value={externalProvider || "none"}
                onValueChange={(v) =>
                  setExternalProvider(v === "none" ? "" : v)
                }
              >
                <SelectTrigger id="edit-externalProvider">
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting || !name || !institution}>
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
