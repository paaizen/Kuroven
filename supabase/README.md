# Supabase : fonctions serveur de Kuroven

## `functions/ttt-move` (anti-triche du morpion en ligne)

Chaque coup d'une partie en ligne passe par cette fonction :

1. elle identifie le joueur (connexion Supabase) et vérifie la partie, le tour et la case ;
2. elle interroge AniList elle-même pour le personnage choisi ;
3. elle contrôle les deux catégories de la case (mêmes règles que `respecte()` / `ok()` dans `index.html`) ;
4. si le coup est bon, elle écrit le nouvel état de la partie. Sinon le site fait perdre le tour.

Le navigateur n'envoie que `match_id`, `cell` (0 à 8) et `char_id` (identifiant AniList).

### À garder synchronisé
`ROWS` et `COLS` de la fonction doivent être identiques, dans le même ordre, à `ROWS` et `COLS` de `index.html`
(l'état d'une partie ne stocke que leurs numéros). Si on ajoute ou retire une catégorie, il faut mettre à jour
les deux et redéployer la fonction. Ajouter de nouvelles catégories **à la fin** des listes évite de casser
les parties en cours.

### Étape finale (à faire une fois le site publié)
Verrouiller `ttt_guard` pour que les navigateurs ne puissent plus poser eux-mêmes un personnage sur une case :
seuls l'abandon et le passage de tour restent permis aux joueurs. À ne faire qu'après la mise en ligne du site,
sinon les anciennes versions ouvertes ne pourraient plus jouer.
