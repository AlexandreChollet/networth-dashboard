# Patrimoine — tableau de bord local

Tableau de bord personnel pour suivre votre patrimoine net, **100 % en local, sans télémétrie, sans cloud**.

- Comptes (PEA, AV, livrets, PER, immo, cash, autres) avec historique de soldes
- Cryptos avec valorisation EUR en temps réel via [CoinGecko](https://www.coingecko.com/) (API publique, sans clé)
- Dettes (crédits immo, prêts) avec capital restant dû
- Évolution sur 12 mois, répartition par type, exports/imports JSON
- Mode clair/sombre/système, format français (`1 234,56 €`)

## Stack

| Couche | Choix |
| --- | --- |
| Front | Next.js 16 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS + shadcn/ui (Radix) + Lucide |
| Charts | Recharts |
| Données | Prisma 5 + PostgreSQL 16 (Docker Compose) |
| Thème | `next-themes` (système / clair / sombre) |

## Pré-requis

- **Docker** et **Docker Compose** (v2) — [installation](https://docs.docker.com/engine/install/)
- **Node.js 20+** et **npm 10+** — [installation](https://nodejs.org/) (ou via [`nvm`](https://github.com/nvm-sh/nvm))

> Le port hôte par défaut pour Postgres est **5433** (et non `5432`) afin d'éviter
> les conflits avec une autre instance Postgres locale. Modifiable dans
> `docker-compose.yml` et `.env`.

## Installation

```bash
# 1. Cloner et entrer dans le dossier
git clone <votre-fork> patrimoine && cd patrimoine

# 2. Copier la configuration d'exemple
cp .env.example .env

# 3. Démarrer Postgres (en arrière-plan)
docker compose up -d

# 4. Installer les dépendances
npm install

# 5. Créer le schéma + lancer la migration initiale
npx prisma migrate dev

# 6. (Optionnel) Charger les 3 comptes d'exemple + 1 crypto + 1 dette
npm run seed

# 7. Lancer le serveur de dev
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Scripts

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur Next.js en dev (`localhost:3000`) |
| `npm run build` | Build de production |
| `npm run start` | Lance le build de prod |
| `npm run seed` | Charge les données de démo |
| `npm run prisma:studio` | Ouvre Prisma Studio (`localhost:5555`) |
| `npm run prisma:migrate` | Crée et applique une nouvelle migration |
| `docker compose up -d` | Démarre Postgres |
| `docker compose down` | Arrête Postgres (les données restent dans `./data/postgres`) |

## Données

- **Stockage** : volume Docker monté en bind sur `./data/postgres`. Tout reste sur votre machine.
- **Sauvegarde** : page **Paramètres → Exporter** (fichier JSON daté).
- **Restauration** : page **Paramètres → Importer**, mode *fusion* (upsert par ID) ou *remplacer* (vide la base d'abord).
- **Réinitialiser tout** : `docker compose down && rm -rf data/postgres && docker compose up -d && npx prisma migrate dev`.

## Confidentialité

L'application est conçue privacy-first :

- ❌ Aucune analytics (pas de Vercel Analytics, pas de Plausible, pas de Sentry…)
- ❌ Aucune télémétrie Next.js (`NEXT_TELEMETRY_DISABLED=1` recommandé, déjà off dans les scripts npm)
- ❌ Aucune police web externe (system fonts uniquement)
- ❌ Aucun favicon ni image externe
- ✅ Une seule connexion sortante : `api.coingecko.com` (uniquement si vous avez des cryptos)
- ✅ Toutes les données financières restent dans le Postgres local

Le `.gitignore` exclut `./data/postgres` et `.env` pour empêcher tout commit accidentel.

## Structure

```
src/
├── app/
│   ├── page.tsx                # / (vue d'ensemble)
│   ├── accounts/               # /accounts + détail compte
│   ├── crypto/                 # /crypto (auto-refresh 5 min)
│   ├── liabilities/            # /liabilities
│   ├── settings/               # /settings (export/import JSON)
│   └── api/                    # routes serveur (REST minimal)
├── components/
│   ├── ui/                     # primitives shadcn (button, card, dialog…)
│   ├── charts/                 # donut + line patrimoine
│   ├── accounts/               # dialogs + chart historique
│   └── liabilities/            # dialogs
└── lib/
    ├── db.ts                   # client Prisma singleton
    ├── coingecko.ts            # fetch prix EUR
    ├── format.ts               # EUR FR + helpers
    └── networth.ts             # agrégations métier
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```

## Astuces

- **Changer le port Postgres** : éditer `docker-compose.yml` (mapping hôte) **et**
  `DATABASE_URL` dans `.env`.
- **Trouver l'`id` CoinGecko** : sur [coingecko.com](https://www.coingecko.com/),
  ouvrir la fiche de la crypto, l'ID se trouve dans l'URL (ex.
  `coingecko.com/en/coins/zcash` → `zcash`).
- **Rate limit CoinGecko** : ~30 req/min sur le tier gratuit. L'app cache les
  prix 60 s côté serveur Next, et rafraîchit la page `/crypto` toutes les 5 min.
