# Kuroven : règles pour Claude

Site de jeux entre amis (animés). Site statique, pas de build : `index.html` (HTML, CSS et JS dans le même fichier) plus quelques scripts à côté. Hébergé sur GitHub Pages depuis la branche `main` : tout ce qui arrive sur `main` est en ligne en moins d'une minute. Données : Supabase (projet `zfoakdnvpsnligpjqrud`) et l'API AniList.

## Règle n°1 : rien n'est publié sans l'accord du propriétaire (paaizen)
- Travaille toujours sur une branche (`feature/...`), jamais directement sur `main`.
- Pour publier, ouvre une Pull Request. Le propriétaire la valide.
- Avant de proposer une publication, montre une image ou un GIF de ce que ça donne (pas seulement du code).
- Demande avant de prendre une initiative (nouvelle idée, outil à installer, service payant).

## Fichiers
- `index.html` : tout le site (menus, jeux, thèmes).
- `ui-icons.js` : icônes d'interface (`uic('nom')`). `icons.js` : logos des catégories du Morpion. `vie-art.js`, `vie-scenes.js` : Ma Vie. `imite.js`, `imite2d.js`, `imite3d.js`, dossier `imite/` : Imite le son. `combat*` : combats.
- `teasers/*.webm` : aperçus vidéo au survol de l'accueil (chargés seulement au survol).
- `supabase/functions/ttt-move/index.ts` : fonction qui valide chaque coup du Morpion côté serveur.

## Règles techniques à ne pas casser
- **Morpion** : les listes `ROWS` et `COLS` dans `index.html` et dans `supabase/functions/ttt-move/index.ts` doivent rester identiques, dans le même ordre (l'état d'une partie ne stocke que des numéros). On ajoute à la fin, on ne retire ni ne réordonne jamais.
- **Ordre de publication** si les catégories changent : d'abord redéployer la fonction `ttt-move` sur Supabase, ensuite fusionner le site. Dans l'autre sens, les parties en ligne sont refusées.
- **Base de données** : ne modifie pas les tables, les règles de sécurité (RLS) ni les fonctions SQL sans l'accord du propriétaire. Pas de suppression de données.
- **Fenêtres** : `#m` (choix d'un personnage) a un `z-index`; toute nouvelle couche au-dessus du contenu doit en tenir compte.
- **Thème** : clair par défaut. La clé `kvdesign` dans le navigateur force une fois thème clair et accent bleu (à incrémenter seulement si on veut refaire une remise à zéro).

## Design (voir aussi les captures dans `maquettes/` si présent en local)
- Direction : grille discrète en fond, gros titres (Unbounded), texte serif (Fraunces), texte courant (Instrument Sans), mouvements longs avec la courbe `--ease: cubic-bezier(.2,.7,0,1)`.
- Couleurs : jetons CSS `--bg --card --tx --mut --bd --ac --ac2 --panel` (voir le début de `index.html`). Une seule couleur d'accent : bleu acier. Pas de néon, pas de blanc pur, pas de mascotte, pas de marque manga.
- **Pas d'emojis dans l'interface.** Utilise les icônes (`uic('nom')` dans `ui-icons.js`). Un convertisseur automatique remplace déjà les emojis courants par des icônes ; pour en ajouter, complète la table dans `index.html` (cherche « Icônes à la place des emojis »).
- Chaque écran doit exister en clair et en sombre. Respecte `prefers-reduced-motion`.
- Menus de jeux : même style partout (carte survolée qui grossit, les autres qui reculent). Les écrans de jeu utilisent la classe `gx`.

## Tester en local
- Serveur : `python -m http.server 8765` dans le dossier, puis `http://localhost:8765/`.
- Vérifier avec des captures, en clair et en sombre, sans erreur dans la console.
- Un compte invité suffit pour la plupart des écrans ; Ma Vie et Salons demandent des comptes (voir les fausses parties locales décrites dans l'historique si besoin).
