# Proserpine — contexte et prochaines étapes (session du 15-16 octobre 2026)

> Document à donner à Claude au début de la prochaine session.
> Ouvrir Claude Code **dans `C:\dev\ProserpineNative`** (le nouveau projet), pas dans l'ancien dossier ProserpineV2.
> Premier message conseillé : « Lis CONTEXTE-PROCHAINE-SESSION.md puis dis-moi où on en est et ce que tu proposes. »

---

## 1. Comment travailler avec Monsieur (règles à respecter)

- On l'appelle **« Monsieur »**. Ne jamais utiliser, conserver ni deviner son nom ou prénom. Pour tout pronom d'une personne non précisée : « iel » interdit, utiliser « elle/il » selon l'info donnée, ou « they » neutre en cas de doute.
- **Français simple, vouvoiement.** Phrases courtes, termes expliqués. Il est étudiant en cinéma / arts médias, il n'est pas développeur : expliquer « pourquoi » avant « comment ». Il pense en heures (deadlines).
- **Commentaires de code détaillés en français** (il s'en sert pour comprendre et pour l'examen).
- **Il décide devant des maquettes ou des captures, pas devant des questions abstraites.** Ne jamais lui poser 4 questions de structure d'un coup : montrer.
- **Livrables pour lui = PDF ou pages visuelles**, jamais un .md (il ne sait pas les lire). Ce fichier-ci est une exception : il est destiné à Claude.
- **Validation avant toute décision produit/UX.** Si une amélioration n'est pas demandée, la proposer et attendre son accord ; ne jamais l'appliquer en silence ni la présenter comme une « bonne pratique ».
- **Actions visibles à l'extérieur ou irréversibles : demander d'abord** (publier, payer, installer sur son téléphone, pousser sur un dépôt public, supprimer). Il a dit : « N'installe rien maintenant » — attendre son feu vert pour installer l'APK.
- **Ne jamais saisir d'identifiants à sa place** (compte invité Firebase, Expo, Google, Play…). Il se connecte lui-même ; il accepte lui-même les autorisations (caméra…).
- **Quand on se trompe : donner la cause racine du raisonnement et le changement de méthode, puis corriger**, et vérifier si la même cause a produit d'autres défauts.
- **Honnêteté des états** : jamais de valeur par défaut présentée comme un résultat (« Non évalué » plutôt qu'une note de 50). Distinguer « lu sur l'emballage » / « déduit » / « choisi par l'utilisateur ».
- **Une question répétée = y répondre directement d'abord.**
- Signaler tout écart entre la version en ligne (ProserpineV2) et la version locale.
- Commits : message en français, terminé par la ligne `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Environnement : **Windows**, Git Bash (chemins `/c/...` illisibles par Node : utiliser `C:/...`), PowerShell disponible. Éviter les heredocs avec antislashs (utiliser l'outil d'écriture de fichiers).

## 2. Le projet en deux phrases

**Proserpine** est une application de **tri des déchets pour la Province de Liège (Belgique)** : on scanne le code-barres d'un produit, l'app dit dans quel bac chaque élément de l'emballage doit aller. Un « **indice d'impact** » écologique (ex-« éco-score ») est un plus, secondaire. Ambition : vraie application commerciale sur les stores (Android d'abord, iOS plus tard), gratuite, sans pub, concept à protéger (i-DEPOT en cours). Contexte : Intradel (intercommunale) n'est pas partenaire ; source officielle à recouper : trionsmieux.be.

## 3. Où est quoi (liens, identifiants, dépôts)

| Élément | Valeur |
|---|---|
| Dossier du projet | `C:\dev\ProserpineNative` (hors OneDrive, volontairement) |
| Dépôt GitHub | `github.com/Tatsu14/Proserpine` — **privé**, branche `main` |
| Ancien dépôt public renommé | `proserpine-archive` (contenu d'avril, obsolète) |
| Ancienne version « stable » (gelée) | `github.com/Tatsu14/Proserpine-V2` + site **https://proserpine-v2.vercel.app** — **ne plus la modifier** (Monsieur s'en sert pour son échantillon de 36 produits) |
| **Nouveau site (PWA)** | **https://proserpine.vercel.app** — projet Vercel `proserpine` (`prj_SE2drp3iGfAAOGFqErSXfKG9h6ot`, équipe `team_AT633BnRo281s4PGILPowzhr`), redéploiement automatique à chaque `git push` sur `main` (≈ 2,5 min) |
| Firebase | projet **`proserpine-5eadf`** (même base que ProserpineV2 : mêmes comptes, même historique). Clé web publique dans `src/services/firebase.ts` (normal, sécurité = règles Firestore) |
| EAS / Expo | compte `max_14`, projet `@max_14/proserpine` (`b4c813ab-86ea-4c1d-99bc-3df7df17df03`) ; la clé de signature Android est générée et conservée par EAS |
| Identifiant d'app | `be.proserpine.app` (Android + iOS) — **définitif après le premier envoi au Play Store** |
| Compte invité de test | « Guest » : Monsieur se connecte lui-même |
| Téléphone de test | Android connecté en USB (débogage USB activé), série `RZCY401DJXV` |
| Référence de l'ancienne version | `C:\Users\maxim\Desktop\OneDrive - Enseignement de la Province de Liège\ProserpineV2` — lire (ne pas modifier) : `tests/produits-reels.json` (51 produits réels pour tester le tri), `_bmad-output/maquettes/` (maquettes de la fiche), `_bmad-output/audit-fiche-produit/` (audit PDF) |

## 4. Architecture : UN seul code pour le web ET le natif

Décision de Monsieur : « chaque changement sur la PWA doit apparaître sur la version native » → **Expo / React Native + Expo Router**, avec `react-native-web` pour la PWA. Aucune interface en HTML/CSS séparée.

- **Web** : `npx expo export --platform web` → dossier `dist` → Vercel (`vercel.json` : sortie `dist`, routes dynamiques `/produit/:ean` et `/guide/:type` réécrites).
- **Natif** : EAS Build (cloud). Windows → pas de Mac : iOS passera par EAS + compte Apple Developer, plus tard.
- Stack : Expo SDK 56, React Native 0.85, React 19, **TypeScript 5.9** (voir « pièges »), Firebase (Auth + Firestore), `expo-camera` (scan), `expo-linear-gradient`, polices Outfit + JetBrains Mono.

```
src/
  app/                      pages (Expo Router) — (auth)/login, register ; (tabs)/index (accueil), recherche, scan, guide, profil ;
                            produit/[ean] (FICHE PRODUIT), guide/[type], historique, parametres, modifier-informations,
                            onboarding, indisponible, +html.tsx (PWA : manifeste, service worker)
  components/ui/            briques communes : texte (interligne 1,5 + taille réglable), boutons, champ, entete-sombre, nav-basse,
                            ui-provider (toasts, fenêtres, chargement), feuille-bas, menu, cadre-mobile, ecran-splash, carte-auth, texte-riche
  components/fiche/         fiche produit : blocs-tri (cartes de bac), blocs-info (en-tête, conseil, indice), choix-matiere,
                            ecrans-etat (introuvable/chargement), feuille-indice (« Pourquoi cette note ? »)
  services/                 tri.js + deduction-emballage.js (logique de tri, reprise de V2), ecoscore.js, api.js (Open Food Facts),
                            separation.ts, conseils.ts, matieres.ts, affichage-produit.ts (noms courts), compte.ts, donnees-utilisateur.ts,
                            auth.ts, historique.ts, cache.ts, firebase.ts
  design/                   tokens.ts (couleurs, espaces, rayons… = source unique du design), icones.tsx (point d'entrée unique des icônes)
  contexts/                 auth.tsx, reglages.tsx (taille du texte, indice affiché ; AsyncStorage)
  constants/                guide.ts (textes du guide, repris MOT POUR MOT de la version en ligne), colors.ts (anciens noms)
public/                     manifest.json, sw.js, logo.png (PWA)
assets/images/              icônes générées à partir du logo (icon, android-icon-*, splash-icon, favicon)
eas.json                    profils de build : preview (APK), production (AAB pour le Play Store)
```

## 5. Où en est-on (état au 16 octobre 2026)

### Fait et vérifié
- Dépôt GitHub privé + Vercel + PWA installable (Chrome propose « Installer Proserpine »).
- **Toute l'app refaite « à l'identique de la version en ligne »** (accueil, recherche, scanner, guide + détail, profil, historique, connexion, inscription, onboarding, « indisponible »), comparée **côte à côte sur le téléphone** avec la version en ligne.
- **Fiche produit = maquette B** (le tri d'abord ; cartes de bac horizontales avec reflet ; étiquettes « Lu sur l'emballage » / « Déduit · à vérifier » / « Votre choix » ; message précis « Retirez… » seulement si une pièce collée va dans un autre bac ; indice d'impact compact en bas ; feuille « Pourquoi cette note ? » ; écrans introuvable / chargement / hors connexion).
- **Noms de produits abrégés** (`affichage-produit.ts`) : on garde le type de produit et on coupe les détails (« Mouchoirs Confort 4 Épaisseurs Ultra Doux FSC » → « Mouchoirs » ; marque = première de la liste ; quantité passée en sous-titre ; capitales adoucies). Testé sur les 51 produits de `tests/produits-reels.json`.
- **Premier build Android réussi** (APK) et **installé sur le téléphone** : connexion, accueil, scan natif (détection de loin, « beaucoup mieux que l'ancienne version »), fiche, aucun plantage.
- Icônes de l'app = logo Proserpine (fini le « A » bleu d'Expo), écran de démarrage vert foncé, seule autorisation Android demandée : caméra.

### Écrit, poussé sur GitHub, **PAS ENCORE testé sur le téléphone** (build 2 en cours)
Corrections issues des retours de Monsieur après le premier test :
1. Barre d'état : icônes claires sur les écrans sombres (accueil, profil, scanner, onboarding).
2. Marges de 16 px sous la barre d'état (guide, détail, historique, scanner, fiche, page « indisponible »).
3. **Pages réelles « Paramètres » et « Mes informations »** (reprises de ProserpineV2 local) : taille du texte (3 choix, appliquée partout), interrupteur « Afficher l'indice d'impact » (masque l'indice sur la fiche et « Vos meilleurs scores » sur l'accueil) ; pseudo, mot de passe, export JSON, suppression du compte en 2 temps.
4. **Feuille du bas sans `<Modal>` système** (corrige l'« écran noir » à l'ouverture de « Pourquoi cette note ? »).
5. **Choix de la matière en deux questions** (`services/matieres.ts`) : p. ex. carton → propre / gras (→ résiduel) / plastifié / brique de boisson (→ PMC) / mouchoirs (→ organique) ; verre → transparent (bulle blanche) / coloré (bulle colorée) / ampoule (→ Recyparc) ; etc. Chaque réponse affiche une phrase d'explication.
6. Scanner : texte d'aide **sous** le cadre (il masquait la zone du code-barres) et **bouton lampe**.
7. Point gris parasite supprimé sur l'anneau « Non évalué ».

### Builds Android (EAS)
| Build | Identifiant | État |
|---|---|---|
| 1 (APK) | `fdc2a839-d35c-427a-91b2-8a75f1d9e321` (commit `0d5d1e5`) | terminé — **c'est celui installé sur le téléphone** |
| 2 (APK) | `af568aa5-35fb-4d01-b9a8-0716bc33d90a` (commit `2f1618f`) | **en cours** au moment de l'écriture (compilation Gradle). **Monsieur a demandé de ne rien installer pour l'instant.** |

Pour suivre : `npx eas build:view <id> --json` (déjà connecté sur l'ordinateur) ; l'APK est dans `artifacts.buildUrl`.

## 6. Pièges et leçons (à ne pas refaire)

1. **La source de vérité est le RENDU RÉEL, pas le CSS.** Le CSS de la version en ligne contient des règles mortes (laser, cadre lumineux du scanner…). Méthode qui marche : capture du téléphone + mesure du DOM par le protocole de débogage Chrome (CDP), **côte à côte** avec la nouvelle app, avant de dire « identique ».
2. Particularités de la version en ligne reproduites : `body { line-height: 1.5 }` ; la feuille de style Google des icônes impose **24 px** à toutes les icônes (écrase les 48/64 px du CSS) ; icônes en **contour** sauf l'onglet actif ; `<button>` sans interligne 1,5 ; historique sans écart entre les lignes ; « indisponible » alignée en haut ; scanner = carré 300 px, coins 5×40 px, ombre 48 %.
3. **`npm ci` d'EAS utilise npm 10 (plus strict que npm 11 local).** Le premier build a échoué à cause de TypeScript 6 (incompatible avec les outils Expo qui exigent TypeScript 5). Toujours tester avec `npx npm@10.9.4 ci --dry-run --include=dev` avant un build. Garder **`typescript ~5.9.3`**.
4. Tester la génération native en local avant la file d'attente : `npx expo prebuild --platform android --no-install --clean` (puis supprimer le dossier `android/`).
5. Un `<Modal>` React Native sur Android affiche un **écran noir** à l'ouverture : utiliser nos vues en position absolue (`ui-provider`, `feuille-bas`).
6. Les noms d'icônes passent par des chaînes : **TypeScript ne les vérifie pas**. Un contrôle des noms existants dans MaterialIcons / MaterialCommunityIcons est nécessaire après chaque ajout.
7. Les changements de code natif/JS n'arrivent sur le téléphone **qu'avec un nouveau build** (pas de mise à jour à distance configurée). Grouper les corrections pour limiter les builds (≈ 25 min, offre gratuite avec file d'attente).
8. Le scan sur le **web** reste plus lent que le natif (vidéo limitée à 480 × 640 par expo-camera web) : normal.
9. Le contrôle `expo-doctor` signale un **défaut de mémoire connu du moteur Hermes** dans Expo 56 ; il ne se corrige qu'en passant à **Expo 57** (`npx expo install expo@^57.0.9 --fix`) — à faire avant le Play Store.

## 7. Outils et commandes utiles

```
# Vérifications
npx tsc --noEmit                       # types (doit rester propre)
npx expo-doctor                        # santé du projet
npx expo export --platform web         # construit le site (dossier dist)

# Téléphone (adb n'est pas dans le PATH)
A="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
"$A" devices
"$A" exec-out screencap -p > capture.png          # capture d'écran
"$A" shell input tap X Y                           # toucher (coordonnées en pixels réels : affichées × 1,17)
MSYS_NO_PATHCONV=1 "$A" install -r app.apk         # installer (UNIQUEMENT avec l'accord de Monsieur)
"$A" forward tcp:9222 localabstract:chrome_devtools_remote   # débogage Chrome du téléphone (ne lire que les onglets Proserpine)

# Build natif
npx eas build --platform android --profile preview --non-interactive --no-wait
npx eas build:view <id> --json
```
Comparer deux rendus : page HTML avec deux `<img>`/`<iframe>` de 384–390 px, capturée par `chrome.exe --headless=new --screenshot=… --window-size=…` (Chrome : `C:\Program Files\Google\Chrome\Application\chrome.exe`). Les petits scripts de test utilisés pendant la session étaient dans un dossier temporaire et sont à recréer au besoin.

## 8. Décisions en attente de Monsieur

1. **Écran caméra à « retravailler »** — il n'a pas précisé quoi. À lui montrer en maquettes : forme du cadre (aujourd'hui un **carré de 300 px**, alors qu'un code-barres est plus large que haut), intensité de la zone sombre, lampe, mise au point au toucher, texte d'aide. Les deux défauts évidents (texte masquant le cadre, pas de lampe) sont déjà corrigés dans le build 2.
2. **Contenus à valider** (tous provisoires) : conseils par bac (`services/conseils.ts`), questions/réponses du choix de matière (`services/matieres.ts`), règle d'abréviation des noms (liste des « mots de détail » : confort, ultra, maxi, format, pack, lot, familial, gourmand…). Recouper avec trionsmieux.be / Intradel.
3. **Cartes de classement de l'accueil** : la version en ligne les élargit selon leur contenu ; la nouvelle les garde égales et tronque. À faire ou non ?
4. **Image du produit** sur la fiche : décision jamais prise. **Place de l'indice d'impact** : à rediscuter après la refonte du score.

## 9. Prochaines étapes (ordre conseillé)

1. **Obtenir le feu vert de Monsieur, puis installer le build 2** sur le téléphone et vérifier : barre d'état lisible, marges, pages Paramètres / Mes informations (changer la taille du texte, masquer l'indice, ouvrir les feuilles pseudo / mot de passe), « Pourquoi cette note ? » **sans écran noir**, choix de matière en deux questions, scanner (texte sous le cadre, lampe).
2. **Écran caméra** : proposer 2–3 maquettes à Monsieur, implémenter, retester.
3. **Valider les contenus** (section 8.2) avec lui, un par un.
4. **Fiche produit** : dernière comparaison côte à côte avec la maquette B (ombres, espacements), sur le téléphone.
5. **Refonte du score** (pas commencée) : ne plus partir de 50 par défaut (`baseScore = 50` dans `ecoscore.js` quand au moins un facteur existe) ; état « Non évalué » conservé. Puis **revue du système de déduction d'emballage** (`deduction-emballage.js` ; liste des pièces collées : bandeau, manchon, opercule, couvercle, collerette) et rejouer le jeu de 51 produits dans la nouvelle app.
6. **Avant le Play Store** : passer à **Expo 57** (Hermes) ; réduire le logo (3,2 Mo, `public/logo.png` et `assets/images/logo.png`) ; produire le profil `production` (bundle `.aab`, bien plus léger que l'APK de 141 Mo) ; écran « hors connexion » dédié.
7. **Play Store** : compte développeur Google Play (≈ 25 $, vérification d'identité — Monsieur paie et valide lui-même ; revérifier les tarifs et règles sur le site officiel) ; **politique de confidentialité** (lien public) et formulaire « sécurité des données » ; un compte personnel récent doit faire un **test fermé (≈ 12 testeurs pendant ≈ 14 jours)** avant la production — idéal pour y passer la bonne version ; ne pas publier avant d'avoir validé le nom de paquet. La suppression de compte dans l'app existe déjà (exigée par Google).
8. **Connexion Google en natif** (aujourd'hui web seulement) : demande le SDK Google natif ; la suppression d'un compte Google en natif n'est pas encore disponible.
9. **iOS** plus tard (compte Apple Developer ≈ 99 $/an, build cloud).

### Ajouts du 16 octobre 2026 (après le build 2)
- Build 2 installé et validé par Monsieur (barre d'état, marges, paramètres, « Pourquoi cette note ? », choix de matière).
- **Frigolite corrigée** (`matieres.ts` + conseil du jour) : billes de calage → Recyparc ; barquette/mousse rigide lisse → PMC (source trionsmieux.be). **À faire plus tard : chercher d'autres cas particuliers de ce genre.**
- **Scanner : design « D » choisi** (plein écran, 4 coins translucides, pastille d'aide en bas, icône lampe torche). Provisoire, à retravailler.
- **Chantier V2 (NE PAS coder avant l'accord de Monsieur)** : reconnaissance caméra des pictogrammes de tri (Triman, point vert, flèches) et de danger (SGH). Limite : `expo-camera` ne lit que les codes-barres ; piste = photo à la lecture + petit modèle sur l'appareil (Android seulement, la PWA n'est pas nécessaire). Hypothèse « pictogrammes près du code-barres » non vérifiée. **Monsieur veut un fichier de test listant les emballages à photographier (15-20, dos et face), à préparer plus tard.** Voir aussi la mémoire `chantier-pictogrammes-v2`.

- Build 3 installé (16 oct.) : lampe torche et frigolite validées ; Monsieur n'a pas encore testé la lecture du nouveau scan. **Les 4 petits coins du repère doivent disparaître** → retirés du code (scanner = caméra plein écran + pastille d'aide + boutons), pas encore commité ni compilé.
- Idée de Monsieur : ajouter plus tard des **photos** dans le choix de matière pour mieux voir les différences (ex. frigolite en billes / barquette).

### Backlog « plus tard » (idées de Monsieur, ne rien coder sans son accord)
bouton « œil » pour voir le mot de passe · accueil personnalisable · favoris · localisation par défaut + changement rapide (après le tri) · **relire les 20 conseils du jour de l'accueil** (le premier — « Rincez rapidement… » — est faux selon lui ; texte actuel repris tel quel de la version en ligne) · IA **écologique** seulement (petit modèle sur l'appareil, plus tard ; aucun besoin d'IA pour l'instant) · protéger l'accès au site tant qu'il n'est pas diffusé · test avec 2–3 personnes extérieures · contribution à Open Food Facts (le choix de matière n'est pas encore remonté) · thème sombre : **refusé** · mémoriser le choix de matière entre deux visites (non fait).

## 10. Mémoire de Claude (si disponible)
Des notes existent dans le dossier mémoire du projet ProserpineV2 (`C:\Users\maxim\.claude\projects\C--Users-maxim-Desktop-OneDrive---Enseignement-de-la-Province-de-Li-ge-ProserpineV2\memory\`), notamment : `nouveau-proserpine`, `fidelite-version-en-ligne`, `chantier-fiche-produit`, `design-identite-et-maquettes`, `nom-indice-impact`, `parametres-decisions`, `backlog-plus-tard`, `port-fidelity`, `base-produits-decisions`. En ouvrant Claude dans `C:\dev\ProserpineNative`, **cette mémoire n'est pas chargée automatiquement** : ce fichier en est la synthèse. Demander à Claude de recréer une mémoire pour ce dossier à partir de ce document.

## 11. Nom de l'indice et vocabulaire
« **Indice d'impact** » (nom complet) / « **Impact** » (pastille) — l'ancien nom « éco-score » est abandonné. « Non évalué » = pas assez de données. Vouvoiement partout dans l'app.
