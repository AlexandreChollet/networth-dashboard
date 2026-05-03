"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  endpoint: string;
  confirmText?: string;
  redirectTo?: string;
  label?: string;
}

export function DeleteButton({
  endpoint,
  confirmText = "Confirmer la suppression ? Cette action est irréversible.",
  redirectTo,
  label,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function onClick() {
    if (!confirm(confirmText)) return;
    setPending(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      alert(`Suppression impossible : ${e instanceof Error ? e.message : e}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant={label ? "outline" : "ghost"}
      size={label ? "sm" : "icon"}
      onClick={onClick}
      disabled={pending}
      aria-label="Supprimer"
    >
      <Trash2 className="h-4 w-4" />
      {label}
    </Button>
  );
}
