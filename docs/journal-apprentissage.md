# Journal d'apprentissage — Proserpine (React Native)

> Ce document explique, étape par étape et dans un esprit pédagogique, comment l'app
> native est construite. Objectif : que tu puisses tout comprendre a posteriori.

---

## Étape 0 — Pourquoi React Native + Expo (et pas une PWA)

- **React Native** = écrire l'app en React (JavaScript/TypeScript) mais avec des
  composants qui se compilent en **vrai natif** (iOS + Android). Pas une page web
  dans un navigateur : une vraie app installable sur les stores.
- **Expo** = une « boîte à outils » par-dessus React Native qui gère le plus dur :
  compilation iOS **sans Mac** (via le cloud EAS), accès caméra, mises à jour, etc.
- On garde **le même backend Firebase** que la version web (mêmes comptes, mêmes
  données). Seule la couche d'affichage est réécrite.

## Étape 1 — Création du projet

- Commande : `npx create-expo-app@latest C:\dev\ProserpineNative` (template par
  défaut : **TypeScript + Expo Router**).
- **Hors OneDrive** volontairement : OneDrive synchronise `node_modules` (des
  dizaines de milliers de fichiers) et corrompt les builds. Règle d'or.
- Structure clé : les écrans vivent dans `src/app/` (chaque fichier = une route,
  c'est le principe d'**Expo Router**, la navigation « par fichiers »).

## Étape 2 — Portage de la logique métier

La logique « pure » (sans interface) se recopie telle quelle depuis la version web,
car elle ne dépend pas du navigateur :

- `src/services/tri.js` — consignes de tri (avec la couche **sécurité DSM** et les
  corrections frigolite / objet non-emballage faites récemment).
- `src/services/ecoscore.js` — calcul de l'éco-score (avec l'état **« Non évalué »**
  quand les données sont insuffisantes).
- `src/services/api.js` — accès aux API Open Food/Beauty/Products Facts.

> Astuce technique : ces fichiers restent en `.js` ; on a activé `allowJs` dans
> `tsconfig.json` pour qu'ils cohabitent avec le TypeScript sans bruit de typage.

## Étape 3 — Firebase adapté au natif (`src/services/firebase.ts`)

Deux différences importantes avec le web :
1. On importe depuis le paquet `firebase` (npm), plus depuis un lien CDN.
2. **Persistance de session** : en natif, il faut explicitement dire à Firebase de
   mémoriser la connexion sur l'appareil via `AsyncStorage`
   (`initializeAuth` + `getReactNativePersistence`). Sinon l'utilisateur serait
   déconnecté à chaque redémarrage de l'app.

On a aussi ajouté `metro.config.js` (`sourceExts.push('cjs')`) car le SDK Firebase
distribue certains fichiers en `.cjs` que le bundler doit savoir lire.

## Étape 4 — Préparation store (`app.json`)

- Nom affiché : **Proserpine** ; identifiants de bundle : `be.proserpine.app`
  (iOS et Android).
- Permission caméra déclarée (obligatoire pour le scan) via le plugin `expo-camera`.

---

## Vérifications effectuées

- `tsc --noEmit` → **0 erreur** (types valides).
- Rendu visuel sur appareil : **à tester par toi** via Expo Go (voir README/consignes).

## Étape 5 — v1 cœur écrite

- **Authentification** : contexte global (`src/contexts/auth.tsx`) qui écoute la session
  Firebase et pilote la redirection ; service email/mot de passe (`src/services/auth.ts`) ;
  écrans `src/app/(auth)/login.tsx` et `register.tsx`.
- **Navigation protégée** : `src/app/index.tsx` aiguille selon la connexion ; les groupes
  `(auth)` et `(tabs)` se gardent mutuellement (un visiteur non connecté ne voit que la
  connexion ; un connecté ne revoit pas les écrans d'auth).
- **Onglets** (`src/app/(tabs)/`) : accueil, historique, scan, guide, profil.
- **Scan** (`expo-camera`) → **fiche produit** (`produit/[ean].tsx` : éco-score, état
  « Non évalué », facteurs, consignes de tri) → **sauvegarde historique** Firestore.
- **Guide** : liste (`guide.tsx`) + détail (`guide/[type].tsx`), contenu dans
  `src/constants/guide.ts`.

## Vérifications (étape 5)

- `tsc --noEmit` → **0 erreur**.
- `expo export --platform android` → bundle de production **réussi** (tout le graphe
  d'imports, Firebase compris, se résout correctement).
- Rendu et comportement réels **à tester sur appareil** (Expo Go).

## Étape 6 — Recherche textuelle (V1)

- Écran `src/app/recherche.tsx` : champ de recherche avec **debounce** (on attend 300 ms
  de pause dans la frappe avant d'interroger l'API, pour ne pas lancer une requête à
  chaque lettre) et une **garde anti-résultats-obsolètes** (si tu tapes vite, seule la
  dernière requête met à jour la liste). Résultat → fiche produit.
- Une **barre de recherche** en haut de l'Accueil ouvre cet écran.

## Reste à faire

- Test sur appareil (Expo Go), puis onboarding, paramètres, admin.
- Build EAS + icône/captures + politique de confidentialité (RGPD).
- Banc de tests Jest pour la logique portée (`tri`, `ecoscore`, `api`).

## Étape 7 — Retours des utilisateurs (avis et signalements)

**Ce qui a été ajouté et pourquoi**

- **Deux formulaires**, accessibles depuis une nouvelle section « Aide & avis » du Profil :
  `src/app/avis.tsx` (feedback ciblé) et `src/app/signalement.tsx` (problème).
- **Feedback ciblé** : on ne demande pas seulement « un commentaire », mais *sur quoi* (scan,
  recherche, guide de tri, indice d'impact, profil, autre), *quel type* (idée, difficulté,
  design, éloge) et une *note* de 1 à 5. Ce découpage permet ensuite de trier et de compter les
  retours (« combien de difficultés sur le scan ? ») au lieu de relire un tas de messages.
- **Un service dédié** (`src/services/retours.ts`) : il vérifie la saisie puis écrit dans Firestore.
  Comme `compte.ts`, il ne « throw » jamais vers l'écran : il renvoie `{ success, error }`.
- **Aucune donnée personnelle** : ni identifiant, ni pseudo, ni e-mail ne sont enregistrés.
  On joint seulement des informations techniques (version de l'app, plateforme, version du
  système, modèle de l'appareil) pour pouvoir reproduire un bug. Conséquence : la suppression de
  compte n'a rien à effacer côté retours. À mentionner dans la politique de confidentialité.
- **Règles de sécurité** (`docs/firestore-retours.rules`) : Firestore est ouvert à tout client
  muni de la clé publique ; ce sont les règles qui protègent. Elles disent : écriture seulement
  si connecté, avec les champs attendus et des limites de longueur ; lecture réservée au compte
  administrateur ; ni modification ni suppression. ⚠ À FUSIONNER avec les règles existantes
  dans la console Firebase, après avoir remplacé l'UID administrateur, et à tester dans le
  simulateur de règles.
- Petit ajout au composant `Champ` : l'option `multiligne` (zone de texte).

**Vérifications** : `tsc --noEmit` → 0 erreur. Le lint n'est pas encore configuré dans le projet.
Rendu et envoi réel **à tester sur appareil**, une fois les règles Firestore publiées.

**Prochaines étapes** : tableau de bord administrateur (liste filtrable, statuts, graphiques),
puis sa version web protégée.

## Étape 8 — Tableau de bord administrateur et export des retours

**Ce qui a été ajouté et pourquoi**

- **Écran `src/app/admin.tsx`**, accessible depuis le Profil dans une section « Administration »
  visible **uniquement pour le compte administrateur**. Il affiche des compteurs (nombre d'avis,
  note moyenne, retours nouveaux, bloquants ouverts), deux onglets (avis / signalements), des
  filtres par fonctionnalité et par statut, et des cartes de retours.
- **Statuts** : Nouveau → En cours → Traité. En touchant le statut d'une carte, on passe au
  suivant (le changement s'affiche tout de suite et est annulé si l'enregistrement échoue). Un
  retour sans statut compte comme « Nouveau » : les anciens retours n'ont pas besoin de migration.
- **Export pour analyse** (`src/services/export-retours.ts`) : un bouton fabrique **un rapport
  texte** — une demande d'analyse, des chiffres clés, puis chaque retour sur une ligne — à coller
  dans une conversation Claude Code. Sur le web, le rapport est copié dans le presse-papiers ; sur
  téléphone, le menu de partage du système s'ouvre. « Exporter les nouveaux » évite de réanalyser
  ce qui a déjà été traité.
- **Constante `UID_ADMIN`** (`src/constants/admin.ts`) : elle sert seulement à afficher ou masquer
  l'entrée du Profil. Ce n'est PAS la sécurité : celle-ci est dans les règles Firestore, qui
  refusent la lecture à tout autre compte.
- **Règles Firestore** : l'administrateur peut maintenant modifier un retour, mais uniquement son
  champ `statut` et avec trois valeurs possibles. ⚠ À republier dans la console Firebase.

**Vérifications** : `tsc --noEmit` → 0 erreur ; bundle de production Android construit. Rendu,
export et règles à tester sur appareil.

**Prochaines étapes** : graphiques (répartition par fonctionnalité, évolution de la note), puis
version web protégée pour consulter depuis un ordinateur.
