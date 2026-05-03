import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SIDECAR_URL = process.env.SIDECAR_URL ?? "http://127.0.0.1:8765";

/** Efface le state woob (cookies + polling pending). À utiliser quand
 *  l'utilisateur veut interrompre un sync bloqué — la session woob côté
 *  sidecar reste blocked sur poll_decoupled, mais on libère le state pour
 *  qu'au prochain /sync/cm la 2FA reparte de zéro. */
export async function POST() {
  try {
    const r = await fetch(`${SIDECAR_URL}/sync/cm/reset`, {
      method: "POST",
      signal: AbortSignal.timeout(5_000),
    });
    const j = await r.json();
    return NextResponse.json(j, { status: r.ok ? 200 : 500 });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    );
  }
}
