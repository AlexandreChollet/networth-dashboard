"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTimeShort, formatEUR } from "@/lib/format";

const STALE_AFTER_MS = 24 * 60 * 60 * 1000; // 24h

interface LastSync {
  id: string;
  status:
    | "RUNNING"
    | "OK"
    | "AUTH_FAILED"
    | "SCA_REQUIRED"
    | "ERROR";
  startedAt: string;
  completedAt: string | null;
  accountsSynced: number;
  errorCode: string | null;
  message: string | null;
  detected: {
    matched: Array<{ externalKey: string; accountId: string; balance: number }>;
    unmatched: Array<{
      externalKey: string;
      label: string;
      balance: number;
      type: string;
    }>;
  } | null;
}

type Phase =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "fresh"; last: LastSync }
  | { kind: "syncing" }
  | { kind: "synced"; matched: number; unmatched: LastSync["detected"] }
  | { kind: "error"; errorCode: string; message: string };

export function AutoSync() {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>({ kind: "checking" });
  const triggeredRef = React.useRef(false);

  const runSync = React.useCallback(async () => {
    setPhase({ kind: "syncing" });
    try {
      const r = await fetch("/api/sync/cm", { method: "POST" });
      const j = await r.json();
      if (j.ok) {
        setPhase({
          kind: "synced",
          matched: j.accountsSynced,
          unmatched: { matched: j.matched, unmatched: j.unmatched },
        });
        router.refresh();
      } else {
        setPhase({
          kind: "error",
          errorCode: j.errorCode ?? "UNKNOWN",
          message: j.message ?? "Erreur inconnue",
        });
      }
    } catch (e) {
      setPhase({
        kind: "error",
        errorCode: "NETWORK",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }, [router]);

  React.useEffect(() => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;

    (async () => {
      try {
        const r = await fetch("/api/sync/cm");
        const j = (await r.json()) as { lastSync: LastSync | null };
        const last = j.lastSync;

        if (!last) {
          // Jamais syncé — on attend un clic explicite.
          setPhase({ kind: "idle" });
          return;
        }

        const completedAt = last.completedAt
          ? new Date(last.completedAt).getTime()
          : 0;
        const stale = Date.now() - completedAt > STALE_AFTER_MS;

        if (last.status === "OK" && !stale) {
          setPhase({ kind: "fresh", last });
          return;
        }

        if (last.status === "OK" && stale) {
          // Sync auto silencieuse en arrière-plan
          await runSync();
          return;
        }

        // Dernier statut = erreur, on affiche le diagnostic et propose un retry
        setPhase({
          kind: "error",
          errorCode: last.errorCode ?? "UNKNOWN",
          message: last.message ?? "Échec de la dernière sync",
        });
      } catch (e) {
        setPhase({
          kind: "error",
          errorCode: "NETWORK",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    })();
  }, [runSync]);

  if (phase.kind === "checking" || phase.kind === "idle") {
    return phase.kind === "idle" ? (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCcw className="h-4 w-4" />
            <span>Synchronisation Crédit Mutuel jamais effectuée.</span>
          </div>
          <Button size="sm" onClick={runSync}>
            Lancer la première sync
          </Button>
        </CardContent>
      </Card>
    ) : null;
  }

  if (phase.kind === "syncing") {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
              Synchronisation Crédit Mutuel en cours… (10–30 s en cas
              normal ; jusqu&apos;à 2 min si tu dois valider sur ton app
              CM Confirmation Mobile).
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                await fetch("/api/sync/cm/reset", { method: "POST" });
              } catch {}
              setPhase({ kind: "idle" });
            }}
          >
            Annuler
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase.kind === "fresh") {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              Crédit Mutuel · {phase.last.accountsSynced} compte(s) à jour ·
              dernier rafraîchissement{" "}
              {formatDateTimeShort(phase.last.completedAt)}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={runSync}>
            <RefreshCcw className="h-3.5 w-3.5" />
            Forcer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase.kind === "synced") {
    const unmatched = phase.unmatched?.unmatched ?? [];
    return (
      <Card>
        <CardContent className="space-y-2 py-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              Crédit Mutuel synchronisé — {phase.matched} compte(s) mis à jour.
            </span>
          </div>
          {unmatched.length > 0 ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
              <div className="mb-1 flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                {unmatched.length} compte(s) détecté(s) non mappé(s)
              </div>
              <ul className="ml-6 list-disc space-y-0.5 text-xs text-muted-foreground">
                {unmatched.map((u) => (
                  <li key={u.externalKey}>
                    <span className="font-medium text-foreground">
                      {u.label}
                    </span>{" "}
                    · {formatEUR(u.balance)} ·{" "}
                    <code className="rounded bg-muted px-1">
                      {u.externalKey}
                    </code>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Mappez chaque compte côté{" "}
                <Link
                  href="/settings"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Paramètres
                </Link>
                {" "}ou directement sur la fiche du compte (champ « clé externe »).
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  // error
  const isSca = phase.errorCode === "SCA_REQUIRED";
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
        <div className="flex items-start gap-2">
          {isSca ? (
            <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
          )}
          <div>
            <div className="font-medium">
              {isSca
                ? "Validation requise sur l'app Confirmation Mobile"
                : `Sync Crédit Mutuel échouée (${phase.errorCode})`}
            </div>
            <div className="text-xs text-muted-foreground">{phase.message}</div>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={runSync}>
          <RefreshCcw className="h-3.5 w-3.5" />
          Réessayer
        </Button>
      </CardContent>
    </Card>
  );
}
