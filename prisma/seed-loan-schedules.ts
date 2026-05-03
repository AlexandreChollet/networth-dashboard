/**
 * Seed des échéanciers d'amortissement des prêts immo CM.
 * Lit prisma/seed-loan-1.csv et seed-loan-2.csv et insère :
 * - 1 LiabilityAccount par prêt (idempotent : recherche par nom)
 * - 1 LoanSchedule par ligne d'échéance
 *
 * Idempotent : les lignes déjà présentes (unique sur liabilityAccountId+dueDate)
 * sont upsertées.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

interface LoanInfo {
  name: string;
  reference: string;
  csvFile: string;
  note: string;
}

const LOANS: LoanInfo[] = [
  {
    name: "Prêt Modulimmo immo (1)",
    reference: "PRET MODULIMMO 15519 39043 00023706302",
    csvFile: "seed-loan-1.csv",
    note: "104 000 € initial · taux 1,05 % · APPARTEMENT ANCIEN AVEC TRAVAUX HABITATION PPALE · fin 06/2035",
  },
  {
    name: "Prêt Modulimmo immo (2)",
    reference: "PRET MODULIMMO 15519 39043 00023706303",
    csvFile: "seed-loan-2.csv",
    note: "82 500 € initial · taux 1,49 % · différé partiel jusqu'à 05/2035 puis amort jusqu'à 07/2045",
  },
];

interface ScheduleRow {
  dueDate: Date;
  capitalBefore: number;
  principalPayment: number;
  interestPayment: number;
  insurancePayment: number | null;
  totalPayment: number;
}

function parseCsv(path: string): ScheduleRow[] {
  const content = readFileSync(path, "utf-8");
  const lines = content.trim().split("\n");
  const rows: ScheduleRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const [dueDate, cap, prin, int, ins, tot] = lines[i].split(",");
    rows.push({
      dueDate: new Date(dueDate + "T00:00:00Z"),
      capitalBefore: parseFloat(cap),
      principalPayment: parseFloat(prin),
      interestPayment: parseFloat(int),
      insurancePayment: ins ? parseFloat(ins) : null,
      totalPayment: parseFloat(tot),
    });
  }
  return rows;
}

async function main() {
  for (const loan of LOANS) {
    const csvPath = join(__dirname, loan.csvFile);
    const rows = parseCsv(csvPath);
    if (rows.length === 0) {
      console.warn(`Skip ${loan.name} (CSV vide)`);
      continue;
    }

    // Cherche un LiabilityAccount existant par nom, sinon crée-le.
    let liability = await prisma.liabilityAccount.findFirst({
      where: { name: loan.name },
    });
    if (!liability) {
      liability = await prisma.liabilityAccount.create({
        data: {
          name: loan.name,
          remainingBalance: rows[0].capitalBefore,
          date: rows[0].dueDate,
          note: loan.note,
        },
      });
      console.log(`+ LiabilityAccount créé : ${loan.name} (${liability.id})`);
    } else {
      console.log(`= LiabilityAccount existant : ${loan.name} (${liability.id})`);
    }

    // Insère/upsert chaque ligne du schedule.
    let inserted = 0;
    let updated = 0;
    for (const row of rows) {
      const result = await prisma.loanSchedule.upsert({
        where: {
          liabilityAccountId_dueDate: {
            liabilityAccountId: liability.id,
            dueDate: row.dueDate,
          },
        },
        update: {
          capitalBefore: row.capitalBefore,
          principalPayment: row.principalPayment,
          interestPayment: row.interestPayment,
          insurancePayment: row.insurancePayment,
          totalPayment: row.totalPayment,
        },
        create: {
          liabilityAccountId: liability.id,
          dueDate: row.dueDate,
          capitalBefore: row.capitalBefore,
          principalPayment: row.principalPayment,
          interestPayment: row.interestPayment,
          insurancePayment: row.insurancePayment,
          totalPayment: row.totalPayment,
        },
      });
      // Heuristique : si l'horodatage updatedAt aurait été récent, on update.
      // Comme la table n'a pas updatedAt, on compte tout en "ok".
      if (result) inserted += 1;
    }
    console.log(`  → ${inserted} lignes upsert (loan ${loan.name})`);
    console.log(
      `    plage ${rows[0].dueDate.toISOString().slice(0, 10)} → ${rows[rows.length - 1].dueDate.toISOString().slice(0, 10)}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
