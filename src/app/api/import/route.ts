import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type {
  AccountType,
  ActionItemStatus,
  AssetType,
  CashRole,
  TransactionType,
} from "@prisma/client";

export const dynamic = "force-dynamic";

interface ImportPayload {
  version: number;
  accounts?: Array<{
    id: string;
    name: string;
    type: AccountType;
    institution: string;
    cashRole?: CashRole;
    monthlyDcaTarget?: string | number | null;
    externalKey?: string | null;
    externalProvider?: string | null;
    createdAt: string;
  }>;
  balances?: Array<{
    id: string;
    accountId: string;
    amount: string | number;
    date: string;
    note?: string | null;
  }>;
  assets?: Array<{
    id: string;
    name: string;
    type: AssetType;
    description?: string | null;
    createdAt: string;
  }>;
  valuations?: Array<{
    id: string;
    assetId: string;
    value: string | number;
    date: string;
    note?: string | null;
  }>;
  crypto?: Array<{
    id: string;
    symbol: string;
    coingeckoId: string;
    quantity: string | number;
    lastUpdated: string;
  }>;
  liabilities?: Array<{
    id: string;
    name: string;
    remainingBalance: string | number;
    date: string;
    note?: string | null;
    externalKey?: string | null;
    externalProvider?: string | null;
  }>;
  actionItems?: Array<{
    id: string;
    title: string;
    description?: string | null;
    status: ActionItemStatus;
    dueDate?: string | null;
    completedAt?: string | null;
    order: number;
    createdAt: string;
  }>;
  transactions?: Array<{
    id: string;
    accountId: string;
    date: string;
    type: TransactionType;
    amount: string | number;
    note?: string | null;
    createdAt: string;
  }>;
}

export async function POST(req: Request) {
  let body: ImportPayload;
  try {
    body = (await req.json()) as ImportPayload;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  if (
    !body ||
    (body.version !== 1 &&
      body.version !== 2 &&
      body.version !== 3 &&
      body.version !== 4)
  ) {
    return NextResponse.json(
      { error: "Format non reconnu (versions acceptées : 1, 2, 3, 4)" },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const replace = url.searchParams.get("mode") === "replace";

  try {
    await prisma.$transaction(async (tx) => {
      if (replace) {
        await tx.transaction.deleteMany();
        await tx.balance.deleteMany();
        await tx.assetValuation.deleteMany();
        await tx.liabilityAccount.deleteMany();
        await tx.cryptoHolding.deleteMany();
        await tx.account.deleteMany();
        await tx.asset.deleteMany();
        await tx.actionItem.deleteMany();
      }

      for (const a of body.accounts ?? []) {
        const dca =
          a.monthlyDcaTarget == null
            ? null
            : typeof a.monthlyDcaTarget === "string"
              ? parseFloat(a.monthlyDcaTarget)
              : a.monthlyDcaTarget;
        await tx.account.upsert({
          where: { id: a.id },
          update: {
            name: a.name,
            type: a.type,
            institution: a.institution,
            cashRole: a.cashRole ?? "OPERATIONAL",
            monthlyDcaTarget: dca,
            externalKey: a.externalKey ?? null,
            externalProvider: a.externalProvider ?? null,
          },
          create: {
            id: a.id,
            name: a.name,
            type: a.type,
            institution: a.institution,
            cashRole: a.cashRole ?? "OPERATIONAL",
            monthlyDcaTarget: dca,
            externalKey: a.externalKey ?? null,
            externalProvider: a.externalProvider ?? null,
            createdAt: new Date(a.createdAt),
          },
        });
      }

      for (const b of body.balances ?? []) {
        await tx.balance.upsert({
          where: { id: b.id },
          update: {
            amount:
              typeof b.amount === "string" ? parseFloat(b.amount) : b.amount,
            date: new Date(b.date),
            note: b.note ?? null,
          },
          create: {
            id: b.id,
            accountId: b.accountId,
            amount:
              typeof b.amount === "string" ? parseFloat(b.amount) : b.amount,
            date: new Date(b.date),
            note: b.note ?? null,
          },
        });
      }

      for (const a of body.assets ?? []) {
        await tx.asset.upsert({
          where: { id: a.id },
          update: {
            name: a.name,
            type: a.type,
            description: a.description ?? null,
          },
          create: {
            id: a.id,
            name: a.name,
            type: a.type,
            description: a.description ?? null,
            createdAt: new Date(a.createdAt),
          },
        });
      }

      for (const v of body.valuations ?? []) {
        await tx.assetValuation.upsert({
          where: { id: v.id },
          update: {
            value:
              typeof v.value === "string" ? parseFloat(v.value) : v.value,
            date: new Date(v.date),
            note: v.note ?? null,
          },
          create: {
            id: v.id,
            assetId: v.assetId,
            value:
              typeof v.value === "string" ? parseFloat(v.value) : v.value,
            date: new Date(v.date),
            note: v.note ?? null,
          },
        });
      }

      for (const c of body.crypto ?? []) {
        await tx.cryptoHolding.upsert({
          where: { id: c.id },
          update: {
            symbol: c.symbol,
            coingeckoId: c.coingeckoId,
            quantity:
              typeof c.quantity === "string"
                ? parseFloat(c.quantity)
                : c.quantity,
            lastUpdated: new Date(c.lastUpdated),
          },
          create: {
            id: c.id,
            symbol: c.symbol,
            coingeckoId: c.coingeckoId,
            quantity:
              typeof c.quantity === "string"
                ? parseFloat(c.quantity)
                : c.quantity,
            lastUpdated: new Date(c.lastUpdated),
          },
        });
      }

      for (const l of body.liabilities ?? []) {
        await tx.liabilityAccount.upsert({
          where: { id: l.id },
          update: {
            name: l.name,
            remainingBalance:
              typeof l.remainingBalance === "string"
                ? parseFloat(l.remainingBalance)
                : l.remainingBalance,
            date: new Date(l.date),
            note: l.note ?? null,
            externalKey: l.externalKey ?? null,
            externalProvider: l.externalProvider ?? null,
          },
          create: {
            id: l.id,
            name: l.name,
            remainingBalance:
              typeof l.remainingBalance === "string"
                ? parseFloat(l.remainingBalance)
                : l.remainingBalance,
            date: new Date(l.date),
            note: l.note ?? null,
            externalKey: l.externalKey ?? null,
            externalProvider: l.externalProvider ?? null,
          },
        });
      }

      for (const a of body.actionItems ?? []) {
        await tx.actionItem.upsert({
          where: { id: a.id },
          update: {
            title: a.title,
            description: a.description ?? null,
            status: a.status,
            dueDate: a.dueDate ? new Date(a.dueDate) : null,
            completedAt: a.completedAt ? new Date(a.completedAt) : null,
            order: a.order,
          },
          create: {
            id: a.id,
            title: a.title,
            description: a.description ?? null,
            status: a.status,
            dueDate: a.dueDate ? new Date(a.dueDate) : null,
            completedAt: a.completedAt ? new Date(a.completedAt) : null,
            order: a.order,
            createdAt: new Date(a.createdAt),
          },
        });
      }

      for (const t of body.transactions ?? []) {
        await tx.transaction.upsert({
          where: { id: t.id },
          update: {
            accountId: t.accountId,
            date: new Date(t.date),
            type: t.type,
            amount:
              typeof t.amount === "string" ? parseFloat(t.amount) : t.amount,
            note: t.note ?? null,
          },
          create: {
            id: t.id,
            accountId: t.accountId,
            date: new Date(t.date),
            type: t.type,
            amount:
              typeof t.amount === "string" ? parseFloat(t.amount) : t.amount,
            note: t.note ?? null,
            createdAt: new Date(t.createdAt),
          },
        });
      }
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    counts: {
      accounts: body.accounts?.length ?? 0,
      balances: body.balances?.length ?? 0,
      assets: body.assets?.length ?? 0,
      valuations: body.valuations?.length ?? 0,
      crypto: body.crypto?.length ?? 0,
      liabilities: body.liabilities?.length ?? 0,
      actionItems: body.actionItems?.length ?? 0,
      transactions: body.transactions?.length ?? 0,
    },
  });
}
