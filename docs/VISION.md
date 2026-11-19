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
| Sessions de cuisine à la Cooking Mama (couper, frire, monter le plat) | ✅ **clients VIP** 👑 : de temps en temps un VIP vient au maquis ; à son tour tu cuisines son plat toi-même (couper au doigt sur les pointillés, frire / griller / mijoter au bon moment, monter l'assiette dans l'ordre), il paie jusqu'à ×3 avec pourboire. Une recette par plat principal |
| Vendre le plat à des clients PNJ | ✅ jeu « arcade idle » : file de clients, comptoir, argent |
| Gagner de l'argent, améliorer le matériel (cuire plus vite, bonus) | ✅ 2e poêle, postes « Plus vite » niv 2 / MAX, grand plateau |
| Commencer dans un petit coin, que ta rue puis ta ville apprennent à te connaître | ✅ **on commence petit** : une table et un réchaud sur le trottoir devant une boutique fermée « À LOUER ». La **renommée** de chaque lieu monte avec les clients, les VIP, les commandes en gros et les quartiers gagnés : « on te connaît dans ta rue », « dans ton quartier », « toute la commune », « tout Abidjan », « tout le pays »… Elle amène plus de clients et fait **grandir** le lieu sur le carré doré : petit coin → maquis → restaurant (l'étage ouvre, ×1,25) → grand restaurant (enseigne dorée, tapis rouge, ×1,5). Chaque nouveau lieu acheté commence petit aussi |
| Améliorer son endroit | ✅ terrasse avec tables ; le maquis à étage |
| Embaucher : vendre pour toi, servir, livrer | ✅ serveur (+ serveur rapide), caissière, livreur à moto ; **gains hors ligne** : un maquis avec serveur et caissière continue de vendre quand tu n'es pas là (jusqu'à 2 h comptées), « Pendant ton absence… » au retour, avec les loyers des quartiers |
| Livraison / commandes à distance | ✅ commandes par téléphone livrées à moto |
| Des niveaux | ✅ 20 clients servis (tous maquis confondus) par niveau ; les niveaux ouvrent les nouveaux lieux |
| Le plat principal + les plats particuliers de chaque zone | ✅ chaque lieu a son plat principal et 2 plats particuliers (Yopougon : garba, porc au four, thé…), chacun avec son poste à débloquer ; chaque client commande un plat |
| Acheter de nouveaux endroits, d'autres communes | ✅ carte : acheter un maquis à Cocody (alloco), Abobo (choukouya), Treichville (poisson braisé) ; chaque maquis garde son matériel et son équipe, l'argent te suit |
| Petits business (thé, choukouya, bissap…) qu'on débloque avec l'argent et le niveau | ✅ 3 stands sur le trottoir de chaque maquis (thé niv 2, choukouya du soir niv 4, bissap niv 6), chacun avec sa vendeuse ; ils vendent seuls aux passants, l'argent s'empile sur le stand (« PLEIN ! » au bout de 3 min), 5 niveaux ; ils gagnent aussi hors ligne |
| Commandes des maquis et restaurants (PNJ qui commandent en gros) | ✅ **commandes en gros** 📦 : un restaurant, un hôtel, une cantine, un mariage… appelle pour 8 à 18 plats d'un de tes plats ; tu les poses dans la caisse jaune près de la rue en moins de 100 s, payés ×1,6 |
| Revenir chaque jour | ✅ **missions du jour** 🎯 : 3 missions (servir, VIP, commande en gros, petits business, débloquer, gagner un quartier), une récompense chacune et le coffre du jour quand les 3 sont faites |
| D'autres villes (Bouaké, Korhogo, Gagnoa, Man) | ✅ jouables avec leur plat (kedjenou, tô, sauce kplala, sauce feuille) |
| Voir les zones qu'on possède, travailler pour le boss, le trahir, prendre ses quartiers | ✅ en solo : carte 3D de chaque lieu avec ses **vrais quartiers** (OpenStreetMap) : 12 à Yopougon, Cocody, Abobo et Bouaké, 7 à 9 ailleurs ; chacun a son boss (géré par l'ordinateur), zones clés ⭐ avec bonus (marchés, gares, maquis, usines réelles), on n'attaque que les quartiers voisins ; le boss de ton quartier prend 20 % ; avec assez de respect, duel de 60 s pour le trahir ; puis attaquer les autres quartiers, qui paient un loyer ; les boss contre-attaquent |
| Jeu en ligne, clash pour prendre le quartier d'un autre boss | ⏳ à faire (backend Go + base Neon, comme Babi Life) |

## L'idée de clash (deuxième message)

> On doit voir la zone qu'on gère ou qu'on possède. Si on possède déjà une zone et qu'un joueur est créé dans
> la même zone, il doit travailler pour celui qui la possède, jusqu'à pouvoir le trahir pour lui prendre une
> partie de sa zone.

Plan : 1) plats principal + particuliers (fait) ; 2) carte des quartiers de la commune avec des boss rivaux
gérés par l'ordinateur, qu'on peut trahir / attaquer en solo ; 3) en ligne : comptes, vrais boss et employés,
part des gains pour le boss, trahison par un duel, protection après une attaque.

## Prochaines étapes proposées

1. ~~Mini-jeux de cuisine comme commandes spéciales~~ (fait : clients VIP).
2. ~~Petits business~~ (fait : thé, choukouya du soir, bissap devant chaque maquis).
3. **Niveaux** qui débloquent les business et les nouvelles communes.
4. **Nouveaux lieux** : un 2e maquis dans une autre commune d'Abidjan, puis une autre ville.
5. **Boss rivaux** (d'abord contre l'ordinateur), puis **en ligne** : comptes, classement, clash des quartiers.
