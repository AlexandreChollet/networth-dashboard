import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { SyncStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const PROVIDER = "creditmutuel";
const SIDECAR_URL = process.env.SIDECAR_URL ?? "http://127.0.0.1:8765";

interface SidecarAccount {
  externalKey: string;
  label: string;
  balance: number;
  currency: string;
  type: string;
  iban: string | null;
  raw_type: number;
}

interface SidecarOk {
  ok: true;
  provider: string;
  accounts: SidecarAccount[];
}

interface SidecarErr {
  ok: false;
  errorCode: string;
  message: string;
}

type SidecarResponse = SidecarOk | SidecarErr;

/** GET = lit le dernier SyncLog (pour décider côté client si une sync est due). */
export async function GET() {
  const last = await prisma.syncLog.findFirst({
    where: { provider: PROVIDER },
    orderBy: { startedAt: "desc" },
  });
  if (!last) {
    return NextResponse.json({ lastSync: null });
  }
  return NextResponse.json({
    lastSync: {
      id: last.id,
      status: last.status,
      startedAt: last.startedAt,
      completedAt: last.completedAt,
      accountsSynced: last.accountsSynced,
      errorCode: last.errorCode,
      message: last.message,
      detected: last.detected ? JSON.parse(last.detected) : null,
    },
  });
}

/** POST = lance une sync. */
export async function POST() {
  const log = await prisma.syncLog.create({
    data: {
      provider: PROVIDER,
      status: "RUNNING" as SyncStatus,
    },
  });

  let resp: SidecarResponse;
  try {
    const r = await fetch(`${SIDECAR_URL}/sync/cm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      // Le sidecar peut prendre 30s entre login + nav + 2FA.
      signal: AbortSignal.timeout(120_000),
    });
    resp = (await r.json()) as SidecarResponse;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: "ERROR",
        completedAt: new Date(),
        errorCode: "SIDECAR_UNREACHABLE",
        message: `Sidecar injoignable (${SIDECAR_URL}) : ${msg}. Vérifiez que docker compose up -d a démarré le service sidecar.`,
      },
    });
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SIDECAR_UNREACHABLE",
        message: msg,
      },
      { status: 502 },
    );
  }

  if (!resp.ok) {
    const status: SyncStatus =
      resp.errorCode === "SCA_REQUIRED"
        ? "SCA_REQUIRED"
        : resp.errorCode === "AUTH_FAILED"
          ? "AUTH_FAILED"
          : "ERROR";
    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status,
        completedAt: new Date(),
        errorCode: resp.errorCode,
        message: resp.message,
      },
    });
    return NextResponse.json(
      { ok: false, errorCode: resp.errorCode, message: resp.message },
      { status: status === "SCA_REQUIRED" || status === "AUTH_FAILED" ? 401 : 500 },
    );
  }

  // Match avec les comptes ET les dettes mappés du dashboard.
  // - Account.externalKey → on crée un Balance (snapshot d'actif)
  // - LiabilityAccount.externalKey → on crée un nouveau LiabilityAccount
  //   (snapshot de dette : `getLiabilitiesLatest` groupe par name et prend
  //   la plus récente). On stocke abs(balance) car woob renvoie négatif.
  const detected = resp.accounts;
  const detectedKeys = detected.map((a) => a.externalKey);
  const [mappedAccounts, mappedLiabilities] = await Promise.all([
    prisma.account.findMany({
      where: { externalProvider: PROVIDER, externalKey: { in: detectedKeys } },
    }),
    prisma.liabilityAccount.findMany({
      where: { externalProvider: PROVIDER, externalKey: { in: detectedKeys } },
    }),
  ]);
  const accountByKey = new Map(mappedAccounts.map((a) => [a.externalKey!, a]));
  const liabilityByKey = new Map(
    mappedLiabilities.map((l) => [l.externalKey!, l]),
  );

  const now = new Date();
  const noteSuffix = now.toISOString().slice(0, 10);
  let accountsSynced = 0;
  const matched: Array<{
    externalKey: string;
    target: "account" | "liability";
    targetId: string;
    balance: number;
  }> = [];
  const unmatched: Array<{ externalKey: string; label: string; balance: number; type: string }> = [];

  for (const a of detected) {
    const acc = accountByKey.get(a.externalKey);
    if (acc) {
      await prisma.balance.create({
        data: {
          accountId: acc.id,
          amount: a.balance,
          date: now,
          note: `Sync CM ${noteSuffix}`,
        },
      });
      matched.push({
        externalKey: a.externalKey,
        target: "account",
        targetId: acc.id,
        balance: a.balance,
      });
      accountsSynced += 1;
      continue;
    }

    const liab = liabilityByKey.get(a.externalKey);
    if (liab) {
      await prisma.liabilityAccount.create({
        data: {
          name: liab.name,
          remainingBalance: Math.abs(a.balance),
          date: now,
          note: `Sync CM ${noteSuffix}`,
        },
      });
      matched.push({
        externalKey: a.externalKey,
        target: "liability",
        targetId: liab.id,
        balance: Math.abs(a.balance),
      });
      accountsSynced += 1;
      continue;
    }

    unmatched.push({
      externalKey: a.externalKey,
      label: a.label,
      balance: a.balance,
      type: a.type,
    });
  }

  await prisma.syncLog.update({
    where: { id: log.id },
    data: {
      status: "OK",
      completedAt: new Date(),
      accountsSynced,
      detected: JSON.stringify({ matched, unmatched }),
    },
  });

  return NextResponse.json({
    ok: true,
    accountsSynced,
    matched,
    unmatched,
  });
}
