-- Défense en profondeur (2026-11-25) : les deux outils internes du schéma fermé « prive » ne doivent pas
-- être exécutables par le public, même si le schéma lui-même est déjà inaccessible (aucun droit USAGE).
-- Les fonctions api_* (SECURITY DEFINER, propriétaire postgres) continuent de les utiliser normalement.
revoke all on function prive.cle_ean_valide(text) from public, anon, authenticated;
revoke all on function prive.valider_emballages(jsonb, boolean) from public, anon, authenticated;
