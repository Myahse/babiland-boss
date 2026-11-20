# Babiland Boss — le serveur en ligne

Le jeu se joue seul sans serveur. Avec ce serveur (Go + Postgres, comme Babi Life), il devient en ligne :

- **Comptes** : un nom de boss et un mot de passe, ou **Google** (comme Babi Life : la première fois on choisit son nom de boss) ; la partie est sauvegardée en ligne (on la retrouve sur un autre téléphone).
- **Les quartiers sont à de vrais joueurs** : le premier qui trahit le boss (ordinateur) du quartier de départ d'une commune devient son boss **pour tout le monde**. Les nouveaux qui commencent là travaillent pour lui : 20 % de leurs ventes lui sont envoyés (il les ramasse dans « En ligne »)… jusqu'à ce que l'un d'eux le trahisse.
- **Duels en direct** : attaquer un quartier tenu par un joueur ouvre un duel de 60 s. Le propriétaire est prévenu tout de suite (où qu'il soit dans le jeu) et peut défendre en servant ses clients ; le serveur compte les deux scores en direct et décide (le premier au but gagne ; les « gros bras » ajoutent 2 clients à servir par niveau ; on ne peut pas servir plus vite que les vrais clients). Un quartier pris est protégé 3 minutes.
- **En ligne** : qui est dans la commune en ce moment, ce qui s'y passe (attaques, conquêtes), des cris rapides (sans texte libre, rien à modérer), le classement des plus grands boss.
- **La boutique** (comme Babi Life) : des **diamants** payés en F CFA par **Mobile Money** (GeniusPay : Wave, Orange Money, MTN, Moov) ou **carte** (Stripe), et le **Pass Boss** (30 jours : +25 % sur chaque vente, la couronne dans le classement). Les diamants servent à : ventes ×2 pendant 30 min, un sac d'argent, un client VIP tout de suite, un bouclier de 8 h sur un quartier, les gros bras au maximum. Un achat n'est crédité qu'une fois, quand le service de paiement dit lui-même qu'il est payé de la bonne somme ; les clés de test ne vendent qu'aux comptes `tester`.

## Lancer

```
cd backend
DATABASE_URL=postgres://… JWT_SECRET=<32 caractères au hasard> go run ./cmd/api
```

Les tables se créent toutes seules (`internal/db/migrations`). Côté jeu : `VITE_API_URL=http://localhost:8080` dans `web/.env.local` (sans elle, le jeu reste hors ligne).
Pour Google : `GOOGLE_CLIENT_ID` ici et `VITE_GOOGLE_CLIENT_ID` côté jeu (le même identifiant de client OAuth « Web », dans Google Cloud Console → API et services → Identifiants ; l'adresse du jeu dans ses « Origines JavaScript autorisées »).
Pour activer la boutique : `GENIUSPAY_API_KEY`, `GENIUSPAY_API_SECRET` (+ `GENIUSPAY_WEBHOOK_SECRET`), et/ou `STRIPE_SECRET_KEY` (+ `STRIPE_WEBHOOK_SECRET`), plus `SITE_URL` (l'adresse du jeu) et `API_URL` (celle du serveur). Pour tester avec des clés de test : `UPDATE users SET tester = true WHERE name = '…'`.

Mise en ligne : `render.yaml` (Render, Docker) + une base Neon, comme Babi Life. Un seul serveur (les duels en direct vivent dans sa mémoire).

Tests : `TEST_DATABASE_URL=postgres://… go test ./...` (la boutique avec un faux GeniusPay : crédité une seule fois, jamais si la somme payée est trop petite, clés de test réservées aux testeurs).

`internal/turf/districts.json` vient des cartes du jeu : `python3 tools/neighbours.py` après `tools/cities.py`.
