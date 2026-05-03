import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.account.count();
  if (existing > 0) {
    console.log(`Seed ignoré: ${existing} compte(s) déjà présent(s).`);
    return;
  }

  const today = new Date();
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const twoMonthsAgo = new Date(today);
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const pea = await prisma.account.create({
    data: {
      name: "PEA Trade Republic",
      type: "PEA",
      institution: "Trade Republic",
      balances: {
        create: [
          { amount: 12000, date: threeMonthsAgo, note: "Solde initial" },
          { amount: 12500, date: twoMonthsAgo },
          { amount: 13200, date: oneMonthAgo },
          { amount: 13900, date: today },
        ],
      },
    },
  });

  const av = await prisma.account.create({
    data: {
      name: "Assurance-vie Linxea Spirit 2",
      type: "AV",
      institution: "Linxea / Spirica",
      balances: {
        create: [
          { amount: 25000, date: threeMonthsAgo },
          { amount: 25400, date: twoMonthsAgo },
          { amount: 25800, date: oneMonthAgo },
          { amount: 26100, date: today },
        ],
      },
    },
  });

  const livret = await prisma.account.create({
    data: {
      name: "Livret A",
      type: "LIVRET",
      institution: "BoursoBank",
      balances: {
        create: [
          { amount: 8500, date: threeMonthsAgo },
          { amount: 8700, date: twoMonthsAgo },
          { amount: 9000, date: oneMonthAgo },
          { amount: 9200, date: today },
        ],
      },
    },
  });

  await prisma.cryptoHolding.create({
    data: {
      symbol: "BTC",
      coingeckoId: "bitcoin",
      quantity: 0.05,
    },
  });

  await prisma.liabilityAccount.create({
    data: {
      name: "Crédit immo Crédit Mutuel",
      remainingBalance: 145000,
      date: today,
      note: "Échéance 2042",
    },
  });

  const actionItems: Array<{
    title: string;
    description?: string;
    status: "TODO" | "IN_PROGRESS" | "DONE";
  }> = [
    {
      title: "Finaliser le transfert PEA Crédit Mutuel → Trade Republic",
      description:
        "Récupérer IFU + date d'ouverture précise du PEA chez CM. Frais remboursés par TR.",
      status: "IN_PROGRESS",
    },
    {
      title: "Demander le rachat total Swiss Life",
      description: "AV à 1 474 €, frais ~1,18 %/an, pas d'antériorité à protéger.",
      status: "TODO",
    },
    {
      title: "Ouvrir PER chez Linxea Spirit Retraite + verser 100 €",
      description: "Économie d'impôt cible ~1 800 €/an à TMI 30 %.",
      status: "TODO",
    },
    {
      title: "Virer 5 000 € du CC pro vers AV Linxea Spirit 2",
      status: "TODO",
    },
    {
      title: "Demander 1 devis prévoyance TNS Madelin",
      description: "Alptis ou courtier local.",
      status: "TODO",
    },
    {
      title: "RDV expert-comptable",
      description: "Confirmer TMI, optimisation micro-entrepreneur.",
      status: "TODO",
    },
    {
      title:
        "Virer 10 000 € du Livret Bleu vers PEA CM avant transfert finalisé",
      status: "TODO",
    },
    {
      title: "Démarrer DCA ETF World sur PEA TR (6 ordres mensuels)",
      description: "À l'arrivée du PEA chez Trade Republic.",
      status: "TODO",
    },
    {
      title:
        "Programmer virements automatiques mensuels (1 500 € / 700 € / 500 €)",
      description: "PEA TR / AV Linxea / PER Linxea.",
      status: "TODO",
    },
    {
      title: "Réfléchir au timing LMNP vs vente locatif",
      description: "Selon date fin de bail. Décision à venir.",
      status: "TODO",
    },
    {
      title: "Supprimer le compte fantôme Livret A BoursoBank du dashboard",
      status: "TODO",
    },
  ];

  for (let i = 0; i < actionItems.length; i++) {
    const it = actionItems[i];
    await prisma.actionItem.create({
      data: {
        title: it.title,
        description: it.description ?? null,
        status: it.status,
        order: i,
      },
    });
  }

  console.log(
    `Seed terminé: ${[pea, av, livret].length} comptes, 1 crypto, 1 passif, ${actionItems.length} actions.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
