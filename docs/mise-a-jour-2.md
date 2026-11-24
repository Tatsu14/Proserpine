# Mise à jour 2 — décisions de Monsieur (à lire au début de la session)

> Document pour Claude. Ordre de travail décidé le 24/11/2026 : la mise à jour 1 (scan fiable, corrections Play
> Store) part d'abord sur le store ; la mise à jour 2 se travaille ENSUITE. Ne rien construire pour elle avant.
> Monsieur n'est pas développeur : français simple, pas de jargon, une décision à la fois, des maquettes plutôt
> que des questions abstraites. Ne jamais demander de secret dans le chat.

## 1. Lien avec la base Supabase (projet `proserpine`, schéma décrit dans docs/supabase-schema.sql sur la branche
`claude/vibrant-hopper-k4yva0`)
- Firebase garde les comptes, l'historique et les retours. Supabase : produits (public.produits, lecture
  publique) et schéma fermé `prive` (emballages, propositions).
- L'app ne parle JAMAIS directement au schéma `prive`. Elle passe par un **intermédiaire sécurisé** (fonction
  serveur, p. ex. Edge Function Supabase) qui vérifie le jeton Firebase (clés publiques de Google, contrôle de
  aud, iss, exp, sub), limite le nombre d'envois par compte, puis appelle des fonctions SQL réservées au serveur.
- Décision technique du 24/11 : on n'utilise PAS le lien direct Supabase ↔ Firebase (« third-party auth »), car la
  documentation Supabase exige d'ajouter l'étiquette `role: authenticated` à chaque compte Firebase (clé
  d'administration). À reconfirmer dans la doc avant de construire.
- Open Food Facts reste en secours (la base ne contient que 393 produits). Attribution « © Open Food Facts
  contributors » avec lien sur tout écran montrant des données OFF.
- `prive.emballages` est vide : le lien n'a de valeur que quand la liste de travail de Monsieur y est importée.

## 2. Proposer un produit
- Bouton « Proposer ce produit » depuis « Produit non trouvé » (code déjà rempli). Champs : nom (obligatoire),
  marque, emballages proposés (facultatif). Pas de photo prévue.
- Les propositions arrivent dans `prive.propositions` (statut en_attente). L'identifiant Firebase est un
  pseudonyme, effacé 12 mois après la décision (tâche nocturne déjà planifiée) et à la suppression du compte
  (à brancher). Phrase à ajouter à la politique de confidentialité AVANT mise en service ; fiche « sécurité des
  données » de la Play Console à mettre à jour.
- **Réception : a en priorité** (compteur « N propositions en attente » à l'ouverture du site), **c en
  complément** (résumé quotidien, moyen d'envoi à choisir), **JAMAIS b** (pas de message à chaque proposition).
- Décision : accepter / refuser avec motif / laisser en attente. À l'acceptation, le produit entre dans
  public.produits (origine « proserpine ») puis sera renvoyé à Open Food Facts. Les emballages proposés par un
  utilisateur ne sont JAMAIS publiés automatiquement : relecture obligatoire (une consigne fausse est pire
  qu'une absence de consigne).
- Pas de notification de la décision à l'utilisateur dans la première version.

## 3. Site d'administration
- Site web (adresse `proserpine-v2.vercel.app`, dépôt `Tatsu14/Proserpine-V2`), React + Vite sauf meilleure
  alternative à comparer au démarrage. Modules validés : Produits, Propositions, Emballages, Retours (V1) ;
  Modération d'utilisateurs, Indicateurs, Journal des actions (V2). Ajouter un module = ajouter un dossier.
- Accès réservé à un compte administrateur, contrôle côté serveur (jamais dans le navigateur). Pour les
  premiers tests, le compte administrateur actuel de l'app (`UID_ADMIN` dans src/constants/admin.ts) ; compte
  dédié plus tard.
- Voie rapide possible pour tester plus tôt : ajouter un onglet « Propositions » à l'écran d'administration
  existant de l'app (src/app/admin.tsx, aussi accessible sur le site web), le site complet venant ensuite.

## 4. Saisie manuelle du code-barres (idée du 24/11, pour la mise à jour 2)
- Cas : le scan échoue ou la caméra reçoit des codes différents malgré les contrôles (src/services/ean.ts).
  L'utilisateur tape lui-même le numéro imprimé sous le code-barres.
- À prévoir : écran de saisie avec clavier numérique ; contrôle immédiat de la clé (cleEanValide) avec un message
  clair en cas de faute de frappe ; puis la même recherche que le scan (base + Open Food Facts) ; si le produit
  est introuvable, proposer « Proposer ce produit » avec le code déjà rempli.
- Points d'accès suggérés : le dialogue « Produit non trouvé » (à côté de « Rechercher manuellement »), un bouton
  « Saisir le code » dans la pastille « Lecture difficile » du scanner, et l'écran de recherche.
- Aujourd'hui, « Rechercher manuellement » ouvre seulement la recherche par nom (src/app/(tabs)/recherche.tsx),
  sans contrôle du numéro.

## 5. Ordre de construction prévu
1. Intermédiaire sécurisé (+ migration SQL des fonctions, appliquée seulement après accord explicite de Monsieur).
2. Écran de décision (site d'administration ou onglet de l'écran admin).
3. Écrans de l'app : « Proposer ce produit » et saisie manuelle du code.
4. Lecture de la base par l'app, Open Food Facts en secours.
Chaque étape est montrée à Monsieur avant la suivante. Nouveau build de test avant tout envoi au store.
