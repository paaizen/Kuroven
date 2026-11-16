# Contribuer à Kuroven (avec Claude)

Salut ! Voici comment modifier le site avec ton propre Claude Code. Le site est dans ce dépôt GitHub ; chaque changement passe par une branche et une Pull Request que paaizen valide avant que ça parte en ligne.

## 1. Mise en place (une seule fois)
1. Crée un compte GitHub si tu n'en as pas, puis donne ton pseudo GitHub à paaizen : il t'invite comme collaborateur. Accepte l'invitation (e-mail ou https://github.com/paaizen/Kuroven/invitations).
2. Installe Git et Claude Code.
3. Récupère le site :
   ```bash
   git clone https://github.com/paaizen/Kuroven.git
   cd Kuroven
   ```
4. Ouvre le dossier avec Claude Code. Il lit automatiquement `CLAUDE.md`, qui contient les règles du projet : tu n'as rien d'autre à lui expliquer.

## 2. Pour chaque changement
1. Demande à Claude de travailler sur une branche : « crée une branche `feature/ce-que-je-fais` puis fais telle modification ».
2. Tester en local : `python -m http.server 8765`, puis ouvre http://localhost:8765/
3. Quand ça te va, demande à Claude de commiter et d'ouvrir une Pull Request vers `main`.
4. paaizen regarde, valide, et le site se met à jour tout seul en moins d'une minute.

Tu ne peux pas pousser directement sur `main` : c'est voulu, pour qu'une erreur ne casse pas le site de tout le monde.

## 3. Ce qu'il faut savoir
- **Le site** : `index.html` contient presque tout. Les règles de design et les pièges sont dans `CLAUDE.md`.
- **Le Morpion** : si tu changes les catégories, il faut les changer à deux endroits (`index.html` et `supabase/functions/ttt-move/index.ts`), et paaizen redéploie la fonction sur Supabase avant de fusionner.
- **La base de données (Supabase)** : tu n'y as pas accès par défaut. Si tu as besoin d'un changement de table ou de règle, demande-le à paaizen, ou travaille sur une copie de test. Ne supprime jamais de données.
- **En cas de doute, demande** avant de publier ou de toucher à ce que les autres utilisent.
