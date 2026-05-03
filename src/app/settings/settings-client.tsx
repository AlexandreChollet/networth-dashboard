"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SettingsClient() {
  const router = useRouter();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [importing, setImporting] = React.useState(false);
  const [message, setMessage] = React.useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  async function handleImport(file: File, mode: "merge" | "replace") {
    if (
      mode === "replace" &&
      !confirm(
        "Mode REMPLACER : toutes les données actuelles seront effacées avant l'import. Continuer ?",
      )
    ) {
      return;
    }
    setImporting(true);
    setMessage(null);
    try {
      const text = await file.text();
      const res = await fetch(`/api/import?mode=${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? `Erreur ${res.status}`);
      setMessage({
        kind: "ok",
        text: `Import réussi : ${j.counts.accounts} comptes, ${j.counts.balances} soldes, ${j.counts.assets ?? 0} assets, ${j.counts.valuations ?? 0} valorisations, ${j.counts.crypto} cryptos, ${j.counts.liabilities} dettes.`,
      });
      router.refresh();
    } catch (e) {
      setMessage({
        kind: "err",
        text: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Sauvegarde, restauration et confidentialité.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Exporter les données
          </CardTitle>
          <CardDescription>
            Télécharge un fichier JSON contenant l&apos;intégralité de votre
            base : comptes, soldes, cryptos, dettes. À conserver dans un endroit
            sûr (p. ex. un cloud chiffré ou une clé USB).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/api/export" download>
              <Download /> Télécharger l&apos;export JSON
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> Importer un export
          </CardTitle>
          <CardDescription>
            Choisissez un fichier JSON précédemment exporté. Mode <em>fusion</em> :
            ajoute/met à jour les enregistrements par ID. Mode <em>remplacer</em>{" "}
            : efface les données existantes avant d&apos;importer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-secondary/80"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={importing}
              onClick={() => {
                const f = fileRef.current?.files?.[0];
                if (!f) {
                  setMessage({ kind: "err", text: "Aucun fichier sélectionné." });
                  return;
                }
                void handleImport(f, "merge");
              }}
            >
              <Upload /> Fusionner
            </Button>
            <Button
              variant="destructive"
              disabled={importing}
              onClick={() => {
                const f = fileRef.current?.files?.[0];
                if (!f) {
                  setMessage({ kind: "err", text: "Aucun fichier sélectionné." });
                  return;
                }
                void handleImport(f, "replace");
              }}
            >
              <Upload /> Remplacer tout
            </Button>
          </div>
          {message ? (
            <p
              className={
                message.kind === "ok"
                  ? "text-sm text-emerald-600 dark:text-emerald-400"
                  : "text-sm text-destructive"
              }
            >
              {message.text}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Confidentialité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Cette application est <strong>entièrement locale</strong>. Aucune
            donnée n&apos;est envoyée ou collectée par un tiers.
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Pas d&apos;analytics, pas de télémétrie.</li>
            <li>Pas de polices web externes (system fonts uniquement).</li>
            <li>
              Seule connexion sortante : <strong>api.coingecko.com</strong> pour
              récupérer les prix crypto (rien n&apos;est envoyé, juste les IDs
              demandés).
            </li>
            <li>
              Toutes les données vivent dans Postgres local{" "}
              (<code className="font-mono">./data/postgres</code>).
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
