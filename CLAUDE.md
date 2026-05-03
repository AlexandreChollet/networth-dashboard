# CLAUDE.md — Patrimoine (networth-dashboard)

Tableau de bord personnel de patrimoine, **strictement local**. Cette note est destinée à un agent Claude qui rejoint le projet : voici ce qu'il faut savoir avant de toucher au code.

## TL;DR

- Next.js 16 (App Router) + React 19 + TypeScript strict
- UI : Tailwind + shadcn/ui (composants vendorés dans `src/components/ui/`)
- Données : Prisma + Postgres 16 (Docker, port hôte **5433**)
- Pas d'auth, pas de multi-utilisateur, pas de cloud
- Une seule API externe : **CoinGecko** (`/simple/price`, sans clé)

## Démarrage rapide

```bash
docker compose up -d        # Postgres sur 5433 + sidecar woob sur 8765
npm install
npx prisma migrate dev      # Crée le schéma
npm run seed                # 3 comptes + 1 crypto + 1 dette de démo
npm run dev                 # http://localhost:3000
```

## Sync Crédit Mutuel (sidecar woob)

Le service `sidecar` (Docker, Python + woob) expose `POST /sync/cm` sur `127.0.0.1:8765`. Next l'appelle via `/api/sync/cm`. Étapes :

1. Renseigner `CM_LOGIN` / `CM_PASSWORD` (et `CM_WEBSITE=par|pro`) dans `.env`. Le sidecar les lit au démarrage. ⚠️ Ne jamais commiter.
2. `docker compose up -d --build sidecar` → premier build ~3 min (compile lxml, cryptography…).
3. Lancer la 1re sync depuis la home → l'app CM Confirmation Mobile va te demander de valider. Les sessions woob persistent dans `./data/woob/` → la SCA n'est pas redéclenchée à chaque appel.
4. Mapper les comptes : à la 1re sync, les comptes CM apparaissent comme « non mappés ». Pour chacun, ouvrir la fiche compte → Modifier → coller la clé externe + provider `creditmutuel`.
5. La sync auto se déclenche au chargement de `/` si la dernière sync OK date de plus de 24h (le cron horaire côté VPS prend le relais avant). Sinon affichage en cache instantané + bouton « Forcer ».

Modèle :
- `Account.externalKey` (unique) + `Account.externalProvider` = mapping
- `SyncLog` (provider, status, timestamps, accountsSynced, detected JSON, errorCode, message)
- Statuts : `RUNNING | OK | AUTH_FAILED | SCA_REQUIRED | ERROR`
- Côté Balance, chaque compte mappé reçoit une nouvelle ligne `Balance` à chaque sync OK (note = `Sync CM YYYY-MM-DD`).

Erreurs typiques :
- `SIDECAR_UNREACHABLE` : `docker compose ps` doit montrer `networth-sidecar healthy`. Sinon `docker compose logs sidecar`.
- `SCA_REQUIRED` : valide sur l'app CM puis re-clique « Réessayer ».
- `AUTH_FAILED` : login/mdp KO (souvent l'espace pro vs particuliers : check `CM_WEBSITE`).

## Règles dures (privacy)

À NE JAMAIS introduire :

- Pas d'analytics, telemetry, Sentry, PostHog, Vercel Analytics, etc.
- Pas de polices web externes (Google Fonts, Adobe Fonts…). System fonts uniquement.
- Pas d'images / icônes / favicons CDN. Lucide est en bundle local.
- Pas de service tiers en dehors de **`api.coingecko.com`** (et seulement pour `/simple/price` avec les IDs nécessaires). Le sidecar `woob` parle directement au webbanking CM, sans intermédiaire — il tourne en local.
- Pas d'OpenGraph / metadata qui exposerait l'instance.
- Le `.gitignore` doit toujours exclure `data/postgres/` et `.env`.

## Modèle de données

```
Account 1───* Balance     (un compte → N soldes datés)
CryptoHolding              (une crypto = symbole + id CoinGecko + quantité)
LiabilityAccount           (une dette = nom + capital restant + date)
```

- **Account.type** : enum `PEA | AV | LIVRET | PER | CRYPTO | IMMO | CASH | OTHER`. Mappage label/couleur dans `src/lib/format.ts` (`ACCOUNT_TYPE_LABELS`, `ACCOUNT_TYPE_COLORS`).
- **Balance.amount** et **LiabilityAccount.remainingBalance** : `Decimal(14,2)`. Toujours convertir avec `toNumber()` côté UI (Prisma renvoie un type `Decimal`).
- **CryptoHolding.quantity** : `Decimal(28,10)` (les fractions de BTC sont profondes).
- **CryptoHolding.coingeckoId** : unique. Toujours stocké en lowercase.
- Les migrations vivent dans `prisma/migrations/`. Une seule a été créée : `init`.

## Architecture des routes

| Route | Type | Rôle |
| --- | --- | --- |
| `/` | Server | Vue d'ensemble (lit via `getNetWorthSnapshot` + `getNetWorthSeries`) |
| `/accounts` | Server | Liste + bouton ajouter (dialog client) |
| `/accounts/[id]` | Server | Détail compte + historique + dialog mise à jour |
| `/crypto` | Client | Auto-refresh 5 min (`crypto-client.tsx`) |
| `/liabilities` | Server | Groupé par nom de dette |
| `/settings` | Client | Export / import JSON |
| `/api/accounts` | REST | GET / POST |
| `/api/accounts/[id]` | REST | GET / DELETE (cascade) |
| `/api/accounts/[id]/balances` | REST | POST |
| `/api/balances/[id]` | REST | DELETE |
| `/api/crypto` | REST | GET / POST (upsert by coingeckoId) |
| `/api/crypto/[id]` | REST | PATCH / DELETE |
| `/api/crypto/prices` | REST | GET (refresh à la demande, cache 60s) |
| `/api/liabilities` | REST | GET / POST |
| `/api/liabilities/[id]` | REST | DELETE |
| `/api/export` | REST | GET — JSON dump complet, version 1 |
| `/api/import` | REST | POST `?mode=merge|replace` |

> Les pages serveur déclarent `export const dynamic = "force-dynamic"` pour que Next ne mette pas en cache.

## Modules clés

- **`src/lib/db.ts`** — singleton PrismaClient (HMR-safe en dev).
- **`src/lib/coingecko.ts`** — `fetchPrices(ids)` avec `next: { revalidate: 60 }`. Gère explicitement le rate limit (CoinGeckoError).
- **`src/lib/networth.ts`** — toutes les agrégations (snapshot courant, série mensuelle 12 mois). Note : la **série historique n'inclut pas l'historique des prix crypto** (CoinGecko gratuit ne le donne pas). La valeur courante est ajoutée uniquement sur le mois en cours. Si tu veux ajouter l'historique, c'est ici qu'il faut brancher.
- **`src/lib/format.ts`** — formatage `Intl` français pour EUR/dates et helpers (`toNumber`, mappages enum→label/couleur).
- **`src/components/charts/*`** — Recharts. Les couleurs viennent des CSS vars `--chart-1` à `--chart-8` (définies dans `globals.css`, deux jeux clair/sombre).
- **`src/components/theme-provider.tsx` / `theme-toggle.tsx`** — `next-themes` avec `defaultTheme="system"` et `enableSystem`.

## Conventions

- Tout est en **français côté UI**, anglais côté code/identifiants/commits.
- Les Server Components lisent Prisma directement. Les mutations passent par `/api/...` + `router.refresh()` côté client.
- Les nombres affichés utilisent `formatEUR()` / `formatEURCompact()` (jamais `.toLocaleString()` direct, pour rester homogène).
- Les dialogues client gèrent leur propre `error`/`submitting` — pas de toast lib (encore une dépendance évitée).

## Migrations / changements de schéma

```bash
# Modifier prisma/schema.prisma puis :
npx prisma migrate dev --name <description-en-snake_case>
# Le client est régénéré automatiquement.
```

Pour repartir d'une base vide :

```bash
docker compose down
rm -rf data/postgres
docker compose up -d
npx prisma migrate dev
npm run seed
```

## Ce qui n'est volontairement PAS implémenté

- **Auth** — l'app est mono-utilisateur, écoute par défaut sur `localhost`.
- **Multi-devises** — tout est en EUR. Un champ `currency` ferait sens si besoin.
- **Historique prix crypto** — voir note dans `getNetWorthSeries`.
- **Export CSV** — l'export JSON est canonique et ré-importable. CSV peut être ajouté côté `/api/export`.
- **Tests** — projet perso, pas de suite. Si tu en ajoutes : Vitest pour les libs, Playwright pour le e2e.

## Dépannage

- **`Bind for 0.0.0.0:5432 failed`** au `docker compose up` : un autre Postgres tourne. Le projet utilise déjà 5433, vérifie qu'aucun autre conteneur ne squatte ce port (`docker ps | grep 5433`).
- **`Can't reach database server at localhost:5433`** : `docker compose ps` doit montrer `networth-postgres` healthy. Sinon `docker compose logs postgres`.
- **CoinGecko 429** : tier gratuit limité. Augmenter `revalidate` dans `src/lib/coingecko.ts` ou espacer le `REFRESH_MS` dans `src/app/crypto/crypto-client.tsx`.
- **Build TS qui crie sur Decimal** : utiliser `toNumber()` (lib/format.ts) plutôt que cast direct.

# Contexte mémoire avec Claude Opussur la situation de l'utilisateur

Contexte patrimonial et stratégie financière
Profil

Âge : 32 ans
Localisation : Nantes
Situation : célibataire, sans enfants
Statut pro : micro-entrepreneur (dev senior), revenus ~4 100€/mois net (~49 200€/an), proche du plafond micro depuis 3 ans
Régime fiscal : IR classique (pas de versement libératoire), TMI 30%
Charges mensuelles : ~1 400€ (loyer 990€ + reste)
Train de vie : modeste et stable, pas de volonté de l'augmenter
Taux d'épargne : ~65% (~2 700€/mois disponibles à investir)
Mentalité : pragmatique, vise la liberté financière (couvrir son train de vie passivement), pas l'enrichissement maximal. Objectif transmission à terme si famille.
Particularité : trouble de l'attention, préfère les réponses synthétiques et actionnables

Patrimoine actuel (mai 2026)
Net : ~133 000€

Brut : ~287 500€
Dettes : ~154 200€

Comptes
CompteInstitutionMontantPEA Trade Republic (en cours de transfert depuis CM)TR17 986€ (en cash, non investi)AV Linxea Spirit 2 (récemment ouverte)Linxea/Spirica0€ (active)Compte chèque EurocompteCrédit Mutuel819€C/C Connect Auto EntrepreneurCrédit Mutuel18 445€Livret Bleu (= Livret A)Crédit Mutuel22 950€ (plafond)LDDS FidélitéCrédit Mutuel12 000€ (plafond)Livret OrdinaireCrédit Mutuel0€
Assets

Appartement T2 Nantes : 190 000€ (bien locatif, 45m², centre-ville, acheté à 26 ans, loué 800€/mois en location nue actuellement)
Toyota Auris 2017 hybride : ~14 624€ (107k km)

Crypto

Zcash (ZEC) : 33,431 ZEC, ~10 666€ (full conviction, accepte la volatilité)
BTC : 0 (option ouverte si diversification crypto plus tard)

Dettes

Crédit conso Crédit Mutuel : 6 587€ restant, 6,38% fixe, 38 mensualités restantes (195€/mois). Pris en 2024 pour la voiture pour préserver le matelas après gros travaux d'appart.
Crédit immo prêt 1 : 65 489€ restant, 1,05% fixe, fin 06/2035, mensualité 632€
Crédit immo prêt 2 : 82 158€ restant, 1,49% fixe, fin 07/2045, différé partiel jusqu'en 2035 (~116€/mois puis ~746€/mois)
Mensualité totale immo stable à ~748€/mois jusqu'en 2045

Enveloppes en cours d'optimisation

AV Swiss Life : 1 474€ (frais de gestion ~1,18%/an, contrat ouvert juin 2024, à racheter en totalité car frais trop élevés et pas d'antériorité fiscale à protéger)
PER : pas encore ouvert (prévu chez Linxea Spirit Retraite)
Prévoyance TNS : pas encore en place (à mettre en place via courtier type Alptis)

Diagnostic stratégique
Points forts

Achat immo à 26 ans (taux 1-1,5% fixe = quasi-gratuit)
Taux d'épargne exceptionnel (65% vs 18% médiane française)
Statut micro saturé = sweet spot fiscal
PEA ouvert tôt (3 ans en mai 2026)
AV Linxea déjà ouverte (compteur 8 ans démarré)
Mentalité saine : visualisation des leviers de liquidité, pas de course au statut, valeur de transmission

Points faibles à corriger

Aucun argent investi en marchés actions (PEA en cash, AV à 0€)
~73 000€ dorment en cash quasi-non rémunéré (27% du patrimoine brut)
Crédit conso à 6,38% non optimisé (peut être remboursé anticipé pour gagner ~845€)
Pas de PER (manque à gagner fiscal de ~1 800€/an à TMI 30%)
Pas de prévoyance TNS (risque de revenu en cas d'arrêt de travail)
Ex-PEA chez Crédit Mutuel (frais élevés, transfert vers Trade Republic en cours)
AV Swiss Life à fermer (frais ~1,18%/an, sous-performance)

Stratégie patrimoniale adoptée
Philosophie générale

Diversification fiscale : PEA + AV + PER + immo, pas un seul panier
Maximiser les enveloppes défiscalisées avant le compte-titres ordinaire
Long terme : horizon 18-30 ans, profiter des intérêts composés
Discipline : virements automatiques mensuels pour éviter les hésitations
Effet de levier immo conservé : ne jamais rembourser anticipé les prêts immo à 1-1,5%
Optionalité : garder une carte des leviers de liquidité (vue dashboard)

Allocation cible long terme (à 50 ans)

Actions (PEA + AV ETF) : ~40-45%
Immobilier (locatif amorti + éventuelle RP) : ~30-35%
Fonds euros / obligations : ~10-15%
PER : ~10%
Liquidités : ~3-5%
Crypto : ~2-5%

Versements mensuels cibles (~2 700€/mois)

PEA Trade Republic : 1 500€/mois en ETF World (80%) + stock picking européen (20%)
AV Linxea Spirit 2 : 700€/mois (50% ETF World, 30% fonds euros Spirica, 20% diversification)
PER Linxea Spirit Retraite : 500€/mois en 80% ETF World / 20% fonds euros (économie d'impôt ~1 800€/an à TMI 30%)

Décisions immo

Locatif : passer en LMNP dès que possible (fin du bail nue actuel) pour amortir comptablement et neutraliser quasi-totalement la fiscalité des loyers. Alternative : vendre si projet RP imminent.
RP : à envisager autour de 35 ans si stabilité personnelle/pro confirmée. Sinon continuer à louer (flexibilité = valeur).
Crédits immo : conservés jusqu'au bout, jamais de remboursement anticipé.

Stratégie de retrait à la retraite (64 ans)
Patrimoine projeté à 64 ans :

Médian (5%/an net) : ~1,6M€ financier + 360k€ immo = ~2M€
Pessimiste (3-4%/an) : ~1,2M€ financier
Optimiste (6-7%/an) : ~2,2M€ financier

Ordre de retrait optimisé fiscalement :

PEA d'abord (18,6% PS uniquement, hors TMI)
AV ensuite (abattement 4 600€/an sur les gains)
PER en dernier, étalé sur 10-15 ans pour rester en TMI basse
Loyers locatif LMNP en complément (~12 000€/an)
Retraite Sécu TNS (~10 000€/an, faible mais existe)

Cible de revenus à la retraite : ~80 000€/an nominal (~43 000€/an en pouvoir d'achat 2026), soit ~3-3,5x le train de vie actuel. Largement suffisant.
Plan d'action en cours d'exécution
Cette semaine

 Transfert PEA Crédit Mutuel → Trade Republic initié (frais remboursés par TR)
 Récupérer IFU + date d'ouverture précise du PEA chez CM
 Demander rachat total Swiss Life (1 474€)
 Ouvrir PER chez Linxea Spirit Retraite + verser 100€
 Virer 5 000€ du CC pro vers AV Linxea Spirit 2
 Demander 1 devis prévoyance TNS Madelin (Alptis ou courtier local)
 RDV expert-comptable (TMI confirmée, optimisation)

Semaines suivantes

 Virer 10 000€ du Livret Bleu vers PEA Crédit Mutuel (avant transfert finalisé)
 À l'arrivée du PEA chez TR : démarrer DCA sur ETF World en 6 ordres mensuels
 Programmer virements automatiques mensuels (1 500€ / 700€ / 500€)
 Réfléchir au timing LMNP vs vente locatif (selon date fin de bail)
 Suppression du compte fantôme "Livret A BoursoBank" du dashboard

Décisions à venir (en suspens)

Crédit conso 6 587€ à 6,38% : remboursement anticipé ou statu quo (préférence pour la sérénité du non-remboursement, à reconsidérer dans 3 mois)
Choix RP à 35 ans : à décider selon évolution perso/pro
Diversification crypto BTC : option ouverte si Zcash devient trop concentré

Méta-considérations
Risques externes acceptés

Hausse progressive de la fiscalité (CSG, PS) : ~1,4 point absorbé en 2026, anticipation continue
Possibles révisions de plafonds PEA/AV : antériorité protégée par effet "grand-père"
Risque marché (krachs, stagnation) : géré par horizon long et DCA discipliné
Risque géopolitique majeur : couverture partielle via diversification, capital humain transférable

Couvertures à envisager dans 5-10 ans

Or physique (5-10% du patrimoine) en assurance contre crise monétaire
Maintien de l'optionalité géographique (anglais, réseau international)
Compétences pratiques de résilience

Risque pro à surveiller

Marché du dev senior s'est durci depuis 2023
Tester le marché à froid (LinkedIn, entretiens) pour avoir une fourchette TJM réaliste
Envisager une source de revenus secondaire (SaaS, contenu, conseil) à terme
