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
- Bouton « Proposer ce produit » depuis « Produit non trouvé ». Champs : code-barres (pré-rempli par le scan mais
  MODIFIABLE, car il peut être mal lu : voir le message d'avertissement en section 4), nom (obligatoire), marque,
  emballages proposés (facultatif). Pas de photo prévue.
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
- **Décision du 25/11 (mise à jour 2)** : l'administration est construite dans l'écran existant de l'app
  (src/app/admin.tsx, aussi accessible sur le site web /admin), avec trois sections : Propositions, Produits
  (identité + emballages), Retours (Firestore). Composants dans src/components/admin/. Écrans validés sur
  captures par Monsieur (« moins grave si l'écran admin est moche »).
- Le futur site React + Vite utilisera un **compte administrateur différent** : la fonction serveur
  `proserpine-api` lit la liste des comptes autorisés dans la variable `UIDS_ADMIN` (plusieurs UID séparés par
  des virgules ; par défaut, l'UID de l'app).

## 4. Saisie manuelle du code-barres (idée du 24/11, précisée par Monsieur)
- Principe : **détection automatique**. Quand, malgré les contrôles de src/services/ean.ts, la caméra continue de
  renvoyer des codes différents (lecture « difficile » qui persiste), c'est l'APP qui demande d'elle-même à
  l'utilisateur de saisir le vrai numéro imprimé sous le code-barres, au lieu d'afficher « Produit non trouvé »
  ou de rester bloquée. (L'état douteux est déjà exposé par `confirmateur.incertain()` ; la pastille « Lecture
  difficile » existe dans le scanner depuis le build du 24/11.)
- Déclencheur à définir avec Monsieur sur maquette (par exemple « Lecture difficile » affichée depuis N secondes).
- Saisie : clavier numérique ; contrôle immédiat de la clé (`cleEanValide`) avec un message clair en cas de faute
  de frappe ; puis la même recherche exacte que le scan (`rechercherProduitDetaille`, base puis Open Food Facts).
- Existant (vérifié dans le code le 24/11) : « Rechercher manuellement » ouvre la recherche par TEXTE d'Open Food
  Facts (`search.pl`, src/app/(tabs)/recherche.tsx). Il n'y a ni recherche exacte par code, ni contrôle de clé.
  Monsieur pensait que la saisie du code existait déjà ; ce n'est vrai que comme recherche texte, dont le
  comportement avec un numéro n'a pas pu être testé (réseau bloqué dans l'environnement de travail).
- Proposition de produit : le code pré-rempli reste modifiable, avec un **message d'avertissement bien visible**
  près du champ : « Assurez-vous que le code renseigné correspond bien à celui du produit. » (formulation à valider
  par Monsieur). La clé du code saisi est contrôlée avant l'envoi.

## 5. Ordre de construction prévu
1. Intermédiaire sécurisé (+ migration SQL des fonctions, appliquée seulement après accord explicite de Monsieur).
2. Écran de décision (site d'administration ou onglet de l'écran admin).
3. Écrans de l'app : « Proposer ce produit » (avec avertissement sur le code) et saisie manuelle du code
   déclenchée automatiquement par une lecture difficile.
4. Lecture de la base par l'app, Open Food Facts en secours.
Chaque étape est montrée à Monsieur avant la suivante. Nouveau build de test avant tout envoi au store.

## 6. Règles d'interface décidées le 25/11
- La fenêtre « Produit non trouvé » du scanner a **deux boutons au plus** : « Scanner à nouveau » et « Proposer ce
  produit » (« Rechercher manuellement » retiré). Cette règle ne vaut QUE pour cette fenêtre (pas pour
  l'administration ni ailleurs) ; l'écran « Produit introuvable » garde ses trois boutons.
- Toujours montrer des captures des vrais écrans à Monsieur avant de les considérer comme terminés.

## 7. Décisions du 25/11 (fin de journée)
- **Site d'administration** : React + Vite, dans `Tatsu14/Proserpine-V2`, dossier `site-admin/` (le reste du dépôt,
  l'ancienne version web, n'est pas touché). En ligne : https://proserpine-admin.vercel.app (projet Vercel
  `proserpine-admin`, mis en production depuis la branche de travail). Compte admin dédié : UID `KINp…`
  (autorisé dans la fonction serveur et dans les règles Firestore).
- **Signaler une erreur (option A)** : lien « Une erreur ? Signaler » sur la fiche → choix « La consigne de tri » /
  « Les informations du produit ». Consigne : élément par élément (« C'est juste » ou le bon bac, élément manquant).
  Produit : nom, marque, quantité, « ce n'est pas ce produit » + bonne information. Message clair si le signalement
  est vide. Stockage : `prive.signalements` via `proserpine-api` (plus Firestore). Section « Signalements » du site.
- **Code postal** : obligatoire, seulement pour les signalements de consigne, demandé dans le formulaire et mémorisé
  sur le téléphone (4 chiffres, 1000–9999). But : adapter plus tard les consignes par commune.
- **Aucune mention d'une région précise** pour les consignes (politique, accueil, guide).
- Les noms d'emballages s'affichent avec une majuscule initiale.
- Fusion dans `main` le 25/11 avec l'accord de Monsieur (site public + politique de confidentialité).
