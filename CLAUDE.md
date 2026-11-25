@AGENTS.md

## Délégation aux sous-agents (à appliquer à chaque session, sans attendre de demande)

La session principale reste sur Opus. Pour économiser sans perdre en qualité, trie chaque tâche ainsi :

1. **Collecte, donc délégation.**
   - Texte des pages web et recherches simples (une information, un prix, une date, une liste) : `haiku-collecte`.
   - Extraction de code (où une chose est définie ou utilisée, extraits) et recherches croisées sur plusieurs sources : `sonnet-recherche`.
   - Exception : une recherche de code d'une seule commande, garde-la (lancer un sous-agent coûte un minimum d'environ 20 000 jetons). Délègue à `sonnet-recherche` quand il faut parcourir plusieurs fichiers ou plusieurs sources.
   - Quand les tâches sont indépendantes, lance-les en parallèle, dans le même message.
2. **Réflexion, donc pour toi (Opus).** Réfléchir, résumer, interpréter, comparer, décider ou écrire du code : tu gardes la tâche.
3. **Ce que les sous-agents renvoient, ce sont des matériaux bruts, jamais la réponse finale.** Vérifie toi-même les chiffres importants avant de conclure. En cas de doute sur le tri, tu gardes la tâche.
