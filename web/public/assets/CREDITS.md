# Crédits des assets

Tous les modèles 3D, textures et le ciel de ce dossier viennent de [Poly Haven](https://polyhaven.com),
sous licence **CC0** (domaine public : libre pour tout usage, même commercial, sans attribution obligatoire).
Ils ont été convertis en GLB (meshopt) et WebP, et allégés pour les téléphones.

- Modèles : plastic_monobloc_chair_01, wooden_cutting_board, yellow_onion, fish_knife, pot_enamel_01,
  small_lpg_tank, wooden_bowl_01, wooden_bowl_02, plastic_crate_01, modular_electricity_poles, old_tyre,
  plastic_jerrycan, bananas, wicker_basket_01, island_tree_01, utility_box_01, trashbag, cardboard_box_01,
  food_lime_01, painted_wooden_table, street_lamp_01, wooden_stool_02
- Textures : red_laterite_soil_stones, asphalt_02, painted_plaster_wall, yellow_plaster, blue_plaster_weathered,
  red_plaster_weathered, peeling_painted_wall, rusty_corrugated_iron, wood_table_worn, concrete_floor_worn_001
- Ciel : kloofendal_48d_partly_cloudy_puresky

## Personnages

Les 5 personnages (Tantie Aya, Koffi, Awa, Yao, Fatou) ont été générés avec [Meshy](https://www.meshy.ai)
(texte → 3D texturé → squelette) avec le compte du propriétaire du jeu. Leurs animations (marcher, attendre,
parler, content, bof, fâché, servir) viennent de la bibliothèque de capture de mouvement de Meshy.
Fichiers : `people/<perso>.glb` (perso) et `people/<perso>-<action>.glb` (animation seule).

## Style simple (option `?look=simple`)

Persos de [Quaternius](https://quaternius.com) « Ultimate Modular Characters » et « Ultimate Modular Women »,
licence **CC0**, avec leurs 24 animations, recolorés dans le jeu (peau, pagnes, cheveux).

## Persos cartoon du jeu arcade (`toon/`)

Faits avec Meshy (style « film d'animation »), même squelette que les autres persos Meshy :
les animations enregistrées (attendre, parler…) servent pour tous, sans en racheter.

## Carte des quartiers

Les contours des quartiers de Yopougon (`maps/yopougon.json`) sont calculés à partir des lieux d'OpenStreetMap
(© les contributeurs d'OpenStreetMap, licence ODbL), repris des données de Babi Life, par `tools/districts.py`.
Le fond de carte : Mapbox si `VITE_MAPBOX_TOKEN` est fourni, sinon OpenFreeMap (© OpenMapTiles, données OpenStreetMap).
