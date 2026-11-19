# Babiland Boss 🇨🇮

> La vision complète du jeu (le message de départ) et ce qui reste à faire : [`docs/VISION.md`](docs/VISION.md).

Un jeu de cuisine et de business à Babi. Tu pars de ton petit coin de garba à Yopougon, tu cuisines
(couper, frire, servir), tu vends, tu améliores ton matériel… et un jour tu deviens le boss de la commune.

Même chemin que Babi Life : React 19 · TypeScript · Vite · Tailwind 4 · Three.js (react-three-fiber).
Style réaliste : vrais modèles 3D scannés, textures et ciel de [Poly Haven](https://polyhaven.com) (CC0, libres
pour tout usage, voir `web/public/assets/CREDITS.md`) : latérite rouge, crépi peint, tôle rouillée, chaises
monobloc, bouteille de gaz, jerrycans, poteaux électriques… Les persos sont réalistes, faits avec Meshy (texturés, avec squelette), et bougent avec de vraies
animations en capture de mouvement : ils marchent, font la queue, parlent pour commander, se réjouissent
ou se fâchent selon le plat. Vue de dessus, comme les jeux de boutique.

| La file de clients | Couper | Les persos |
|---|---|---|
| ![](docs/screens/commande.png) | ![](docs/screens/couper.png) | ![](docs/screens/persos.jpg) |

## Lancer

```bash
cd web && npm install && npm run dev
```

## Le jeu (style « arcade idle » des jeux de pub)

Vidéo de 40 s d'une partie : [`docs/demo-arcade.mp4`](docs/demo-arcade.mp4).

| Porter les plats | Servir la file | Débloquer |
|---|---|---|
| ![](docs/screens/arcade-porter.png) | ![](docs/screens/arcade-servir.png) | ![](docs/screens/arcade-debloquer.png) |

- On dirige **Tantie Aya au joystick** (glisser le doigt, ou flèches / ZQSD / WASD).
- Le **poste à garba** cuit des plats tout seul ; on les ramasse en pile et on les pose sur le **comptoir**.
- Les **clients font la queue**, prennent leurs plats (🍛 1/2), paient : l'argent s'empile par terre, on marche dessus pour le ramasser.
- On marche sur les **carrés bleus** pour dépenser l’argent : 2e poêle (400 F), serveur qui porte les plats (1 200 F), terrasse (2 000 F) où les clients servis s’assoient pour manger.
- **Plat principal + plats particuliers** : chaque lieu a son plat principal et 2 plats particuliers à débloquer (Yopougon : porc au four, thé ; Cocody : poulet braisé, bissap…), chacun avec son poste ; chaque client commande un plat précis (🐟 Garba 0/3), il faut lui apporter le bon.
- **Embaucher** : serveur (puis serveur rapide), caissière (sans elle, il faut être au comptoir pour servir), livreur.
- **Livraison à moto** : des commandes arrivent par téléphone ; on charge la moto (ou le livreur le fait), elle part livrer et rapporte 700 F par plat.
- **Quartiers** (bouton 🏙️) : la **vraie carte** de Yopougon (Mapbox) en plein écran, avec 12 vrais quartiers (Selmer, Wassakara, Siporex, Score, Banco 2, Sogefiha, Quartier Maroc, Port-Bouët II, Micao, Gesco, Zone Industrielle, Koweït) dont les contours sont calculés à partir des commerces et maquis d'OpenStreetMap. Au début tu travailles pour le boss de Selmer (il prend 20 %) ; avec 15 clients de respect et 1 000 F, tu le **trahis** (duel de 60 s). Ensuite tu attaques les quartiers qui **touchent** les tiens. **Zones clés ⭐** : Zone Industrielle +30 % de clients, Siporex (gare des gbaka) +20 % de clients, Micao (marché La Paix) postes 25 % plus rapides, Banco 2 (marché de nuit La Référence) +20 % par vente. Les quartiers conquis paient un loyer.
  Pour le fond Mapbox, mettre `VITE_MAPBOX_TOKEN` (le même jeton public que Babi Life) dans `web/.env.local` et sur Vercel ; sans jeton, la même carte s'affiche avec OpenFreeMap.

  ![Carte des quartiers](docs/screens/quartiers-carte.jpg)
- **Carte** : achète un maquis dans les autres communes et villes (Cocody alloco, Abobo choukouya, Treichville poisson braisé, Bouaké kedjenou, Korhogo tô, Gagnoa kplala, Man sauce feuille) dès que ton niveau le permet, puis « Y aller » de l'un à l'autre. Chaque maquis garde ses postes, son équipe et sa terrasse ; l'argent te suit.
- Les persos courent ou marchent selon leur vraie vitesse, animations au bon rythme, démarrages et arrêts en douceur.
- **Améliorer chaque poste** (« Plus vite », niv 2 à 600 F, MAX à 1 500 F) : il cuit plus vite et garde plus de plats.
- Le « jus » des jeux de boutique : les plats et les billets volent en arc vers les mains, le comptoir et les clients ; les piles rebondissent ; confettis et fanfare quand on débloque ; petits sons (faits en code, rien à télécharger) et vibration sur téléphone ; bouton 🔊 pour couper le son.
- Le maquis à deux étages : enseigne lumineuse sur le toit, terrasse en haut avec des clients attablés, auvent rayé, coin de rue avec taxis et passage piéton.

![Le maquis](docs/screens/maquis-vue.png)
- Persos cartoon style « film d’animation » (Meshy) : Tantie Aya, Koffi, Awa, Yao, Fatou ; caméra de dessus qui suit Tantie Aya. La partie est gardée sur le téléphone.

![Les persos cartoon](docs/screens/persos-cartoon.jpg)
- Code : `web/src/arcade/`. La première version (mini-jeux de cuisine) reste là : `?mode=cuisine`.

## Ce qui marche (prototype)

- **Accueil** : ton nom (il s'affiche sur l'enseigne « GARBA CHEZ … »), ta commune (Yopougon ouverte, les autres « bientôt »).
- **La rue** : coin de garba sous un parasol, maquis, pressing, cabine, panneau Rue Princesse, taxi orange qui passe, cocotiers, poteaux et fils électriques.
- **Clients** : ils arrivent à pied, commandent en français avec du nouchi (garba 500 ou 1000, avec ou sans piment), réagissent selon ton plat.
- **Couper** : le couteau passe au-dessus de la tomate puis de l'oignon ; tape sur les pointillés (`web/src/game/Cut.tsx`).
- **Frire** : retourne le thon puis sors-le quand la jauge est dans le doré (`web/src/game/Fry.tsx`).
- **Servir** : monte le garba dans l'ordre : attiéké, poisson, tomate-oignon, piment si demandé (`web/src/ui/Hud.tsx`).
- **Argent et niveau** : paiement en FCFA + pourboire selon les étoiles, XP et niveaux.
- **Améliorer** : couteau aiguisé, poêle en fonte, nouvelle bâche (changent vraiment le jeu).

## La suite

1. Plus de plats et petits business (alloco, choukouya, thé…), d'autres communes et villes.
2. Maquis, restaurant, employés (vendeurs, livreurs à moto), commandes des maquis et bureaux.
3. Conquête : prendre des zones de la commune aux autres boss (d'abord contre l'ordi, puis en ligne).
4. En ligne : comptes, backend Go + Neon comme Babi Life.
