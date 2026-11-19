# Babiland Boss : la vision du jeu

Ce que le créateur du jeu a décrit au départ (son premier message), et où on en est.
C'est la référence : chaque nouvelle étape doit nous rapprocher de ça.

## L'idée de départ

> Un jeu comme Cooking Mama, mais en Côte d'Ivoire. Au début tu t'inscris, et tu viens d'un endroit du pays.
> De là, tu as le plat principal de cet endroit : tu apprends à le faire, puis tu cuisines, par sessions comme
> dans Cooking Mama (couper les tomates, les éléments, participer à la préparation du plat), et ensuite tu dois
> vendre le plat.
>
> Tu commences dans un petit coin, et avec l'argent que tu gagnes tu améliores ton matériel, ton endroit, tu
> achètes de nouveaux endroits, tu embauches des gens pour vendre pour toi, conduire, livrer. Beaucoup de PNJ
> passent commande pour manger, dans des maquis ou des restaurants.
>
> Le but : devenir le grand boss de ta ville, puis t'étendre à d'autres villes quand tu as assez d'expérience,
> un certain niveau. Des niveaux presque infinis. En ligne : par exemple à Yopougon il y a beaucoup de plats ;
> on a le plat principal et d'autres petits business (viande séchée / choukouya, thé…) qu'on débloque avec de
> l'argent et du niveau. On améliore le matériel pour cuisiner plus vite ou avoir des bonus.
>
> Et des clashs comme Clash of Clans : tu vas dans la ville, dans le quartier d'un autre joueur qui est le
> boss là-bas, et tu essaies de lui prendre la ville ou une partie du quartier.

## Où on en est

| Partie de la vision | État |
|---|---|
| S'inscrire, choisir son nom et sa commune | ✅ écran d'accueil (Yopougon ouvert, les autres affichés « bientôt ») |
| Le plat principal de l'endroit (Yopougon : garba) | ✅ |
| Sessions de cuisine à la Cooking Mama (couper, frire, monter le plat) | ✅ première version : `?mode=cuisine` — à rebrancher dans le jeu principal (commandes spéciales) |
| Vendre le plat à des clients PNJ | ✅ jeu « arcade idle » : file de clients, comptoir, argent |
| Gagner de l'argent, améliorer le matériel (cuire plus vite, bonus) | ✅ 2e poêle, postes « Plus vite » niv 2 / MAX, grand plateau |
| Améliorer son endroit | ✅ terrasse avec tables ; le maquis à étage |
| Embaucher : vendre pour toi, servir, livrer | ✅ serveur (+ serveur rapide), caissière, livreur à moto |
| Livraison / commandes à distance | ✅ commandes par téléphone livrées à moto |
| Des niveaux | ✅ 20 clients servis (tous maquis confondus) par niveau ; les niveaux ouvrent les nouveaux lieux |
| D'autres petits business (choukouya, thé, alloco…) | ⏳ à faire |
| Acheter de nouveaux endroits, d'autres communes | ✅ carte : acheter un maquis à Cocody (alloco), Abobo (choukouya), Treichville (poisson braisé) ; chaque maquis garde son matériel et son équipe, l'argent te suit |
| Commandes des maquis et restaurants (PNJ qui commandent en gros) | ⏳ à faire |
| D'autres villes (Bouaké, Korhogo, Gagnoa, Man) | ✅ jouables avec leur plat (kedjenou, tô, sauce kplala, sauce feuille) |
| Devenir LE boss de la ville (face aux autres boss) | ⏳ à faire |
| Jeu en ligne, clash pour prendre le quartier d'un autre boss | ⏳ à faire (backend Go + base Neon, comme Babi Life) |

## Prochaines étapes proposées

1. Rebrancher les mini-jeux de cuisine (couper, frire) comme **commandes spéciales** mieux payées.
2. **Petits business** : stand de choukouya, vendeuse de thé, alloco, chacun avec son poste et ses clients.
3. **Niveaux** qui débloquent les business et les nouvelles communes.
4. **Nouveaux lieux** : un 2e maquis dans une autre commune d'Abidjan, puis une autre ville.
5. **Boss rivaux** (d'abord contre l'ordinateur), puis **en ligne** : comptes, classement, clash des quartiers.
