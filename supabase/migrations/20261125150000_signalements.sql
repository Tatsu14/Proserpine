-- =====================================================================================
-- Signalements d'erreurs depuis la fiche produit (mise à jour 2, option A validée le 25/11/2026)
--
--  - type « consigne » : un ou plusieurs éléments d'emballage dans le mauvais bac, ou un élément manquant ;
--  - type « produit »  : nom, marque, quantité faux, ou le code-barres correspond à un autre produit.
--
-- Stockés dans le schéma fermé `prive`, comme les propositions : l'app passe par la fonction serveur
-- proserpine-api (jeton Firebase vérifié), jamais directement. L'identifiant du compte (pseudonyme) sert
-- à limiter les abus ; il est effacé 12 mois après le traitement, et à la suppression du compte.
-- Les bacs sont ceux affichés par l'app : pmc, paper, glass, organic, residual, danger.
-- =====================================================================================

create table prive.signalements (
  id             bigint generated always as identity primary key,
  type           text not null check (type in ('consigne', 'produit')),
  ean            text not null check (ean ~ '^[0-9]{4,14}$'),
  nom_produit    text check (char_length(nom_produit) <= 150),
  origine        text check (origine in ('verifie', 'lu', 'deduit', 'choisi')),
  -- consigne : [{ nom, bac_affiche, bac_propose, ajoute }] — seulement les éléments signalés faux ou manquants
  elements       jsonb not null default '[]'::jsonb check (jsonb_typeof(elements) = 'array'),
  -- produit : sous-ensemble de nom, marque, quantite, autre_produit
  champs         text[] not null default '{}',
  correction     text check (char_length(correction) <= 300),
  commentaire    text check (char_length(commentaire) <= 300),
  statut         text not null default 'nouveau' check (statut in ('nouveau', 'en_cours', 'traite')),
  utilisateur_id text check (char_length(utilisateur_id) <= 128),
  cree_le        timestamptz not null default now(),
  traite_le      timestamptz
);

comment on table prive.signalements is
  'Erreurs signalées depuis la fiche produit (consigne ou informations du produit). Fermée : accès via proserpine-api.';
comment on column prive.signalements.utilisateur_id is
  'UID Firebase (pseudonyme), pour limiter les abus. Effacé 12 mois après le traitement et à la suppression du compte.';

create index signalements_statut_idx on prive.signalements (statut, cree_le desc);
create index signalements_utilisateur_idx on prive.signalements (utilisateur_id) where utilisateur_id is not null;

alter table prive.signalements enable row level security;
revoke all on table prive.signalements from public, anon, authenticated;


-- -------------------------------------------------------------------------------------
-- Envoi d'un signalement (application)
-- -------------------------------------------------------------------------------------
create or replace function public.api_signaler(
  p_utilisateur  text,
  p_type         text,
  p_ean          text,
  p_nom_produit  text default null,
  p_origine      text default null,
  p_elements     jsonb default null,
  p_champs       jsonb default null,
  p_correction   text default null,
  p_commentaire  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bacs        constant text[] := array['pmc', 'paper', 'glass', 'organic', 'residual', 'danger'];
  v_champs_ok   constant text[] := array['nom', 'marque', 'quantite', 'autre_produit'];
  v_max_24h     constant integer := 10;
  v_nom_produit text := nullif(btrim(coalesce(p_nom_produit, '')), '');
  v_correction  text := nullif(btrim(coalesce(p_correction, '')), '');
  v_commentaire text := nullif(btrim(coalesce(p_commentaire, '')), '');
  v_elements    jsonb := '[]'::jsonb;
  v_champs      text[] := '{}';
  v_e           jsonb;
  v_nom         text;
  v_affiche     text;
  v_propose     text;
  v_id          bigint;
begin
  if p_utilisateur is null or btrim(p_utilisateur) = '' or char_length(p_utilisateur) > 128 then
    raise exception 'utilisateur_invalide';
  end if;
  if p_type is null or p_type not in ('consigne', 'produit') then
    raise exception 'signalement_invalide';
  end if;
  if p_ean is null or p_ean !~ '^[0-9]{4,14}$' then
    raise exception 'ean_invalide';
  end if;
  if v_nom_produit is not null then
    v_nom_produit := left(v_nom_produit, 150);
  end if;
  if p_origine is not null and p_origine not in ('verifie', 'lu', 'deduit', 'choisi') then
    raise exception 'signalement_invalide';
  end if;
  if (v_correction is not null and char_length(v_correction) > 300)
     or (v_commentaire is not null and char_length(v_commentaire) > 300) then
    raise exception 'signalement_invalide';
  end if;

  if p_type = 'consigne' then
    if p_elements is not null then
      if jsonb_typeof(p_elements) <> 'array' or jsonb_array_length(p_elements) > 20 then
        raise exception 'signalement_invalide';
      end if;
      for v_e in select * from jsonb_array_elements(p_elements) loop
        if jsonb_typeof(v_e) <> 'object' then
          raise exception 'signalement_invalide';
        end if;
        v_nom := btrim(coalesce(v_e ->> 'nom', ''));
        v_affiche := nullif(v_e ->> 'bac_affiche', '');
        v_propose := nullif(v_e ->> 'bac_propose', '');
        if char_length(v_nom) < 1 or char_length(v_nom) > 100
           or (v_affiche is not null and not (v_affiche = any (v_bacs)))
           or (v_propose is not null and not (v_propose = any (v_bacs))) then
          raise exception 'signalement_invalide';
        end if;
        v_elements := v_elements || jsonb_build_array(jsonb_build_object(
          'nom', v_nom,
          'bac_affiche', v_affiche,
          'bac_propose', v_propose,
          'ajoute', coalesce(v_e -> 'ajoute' = 'true'::jsonb, false)
        ));
      end loop;
    end if;
    if jsonb_array_length(v_elements) = 0 and v_commentaire is null then
      raise exception 'signalement_vide';
    end if;
    v_correction := null;
  else
    if p_champs is not null then
      if jsonb_typeof(p_champs) <> 'array' then
        raise exception 'signalement_invalide';
      end if;
      select coalesce(array_agg(distinct c), '{}') into v_champs
        from jsonb_array_elements_text(p_champs) as c;
      if not (v_champs <@ v_champs_ok) then
        raise exception 'signalement_invalide';
      end if;
    end if;
    if cardinality(v_champs) = 0 and v_correction is null and v_commentaire is null then
      raise exception 'signalement_vide';
    end if;
  end if;

  if (
    select count(*) from prive.signalements s
     where s.utilisateur_id = p_utilisateur and s.cree_le > now() - interval '24 hours'
  ) >= v_max_24h then
    raise exception 'trop_de_signalements';
  end if;

  insert into prive.signalements (type, ean, nom_produit, origine, elements, champs, correction, commentaire, utilisateur_id)
  values (p_type, p_ean, v_nom_produit, p_origine, v_elements, v_champs, v_correction, v_commentaire, p_utilisateur)
  returning id into v_id;

  return jsonb_build_object('id', v_id);
end;
$$;


-- -------------------------------------------------------------------------------------
-- Administration : liste et statut
-- -------------------------------------------------------------------------------------
create or replace function public.api_admin_lister_signalements(
  p_statut text default null,
  p_limite integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limite integer := least(greatest(coalesce(p_limite, 100), 1), 300);
begin
  if p_statut is not null and p_statut not in ('nouveau', 'en_cours', 'traite') then
    raise exception 'statut_invalide';
  end if;
  return jsonb_build_object(
    'compteurs', (
      select jsonb_build_object(
        'nouveau',  count(*) filter (where statut = 'nouveau'),
        'en_cours', count(*) filter (where statut = 'en_cours'),
        'traite',   count(*) filter (where statut = 'traite'))
        from prive.signalements
    ),
    'signalements', coalesce((
      select jsonb_agg(x order by x ->> 'cree_le' desc)
        from (
          select jsonb_build_object(
                   'id', s.id, 'type', s.type, 'ean', s.ean, 'nom_produit', s.nom_produit, 'origine', s.origine,
                   'elements', s.elements, 'champs', to_jsonb(s.champs), 'correction', s.correction,
                   'commentaire', s.commentaire, 'statut', s.statut, 'cree_le', s.cree_le, 'traite_le', s.traite_le,
                   'compte', case when s.utilisateur_id is null then null else left(s.utilisateur_id, 6) end,
                   'dans_base', exists (select 1 from public.produits p where p.ean = s.ean)
                 ) as x
            from prive.signalements s
           where p_statut is null or s.statut = p_statut
           order by s.cree_le desc
           limit v_limite
        ) t
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.api_admin_statut_signalement(p_id bigint, p_statut text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_statut is null or p_statut not in ('nouveau', 'en_cours', 'traite') then
    raise exception 'statut_invalide';
  end if;
  update prive.signalements
     set statut = p_statut,
         traite_le = case when p_statut = 'traite' then coalesce(traite_le, now()) else traite_le end
   where id = p_id;
  if not found then
    raise exception 'non_trouve';
  end if;
  return jsonb_build_object('id', p_id, 'statut', p_statut);
end;
$$;


-- -------------------------------------------------------------------------------------
-- Effacement de l'identifiant : suppression du compte, et délai de 12 mois (tâche nocturne existante)
-- -------------------------------------------------------------------------------------
create or replace function public.api_effacer_identifiant(p_utilisateur text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_a integer;
  v_b integer;
begin
  if p_utilisateur is null or btrim(p_utilisateur) = '' then
    raise exception 'utilisateur_invalide';
  end if;
  update prive.propositions set utilisateur_id = null where utilisateur_id = p_utilisateur;
  get diagnostics v_a = row_count;
  update prive.signalements set utilisateur_id = null where utilisateur_id = p_utilisateur;
  get diagnostics v_b = row_count;
  return v_a + v_b;
end;
$$;

create or replace function prive.purger_identifiants()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  n integer;
  m integer;
begin
  update prive.propositions
     set utilisateur_id = null
   where utilisateur_id is not null
     and coalesce(traite_le, cree_le) < now() - interval '12 months';
  get diagnostics n = row_count;
  update prive.signalements
     set utilisateur_id = null
   where utilisateur_id is not null
     and coalesce(traite_le, cree_le) < now() - interval '12 months';
  get diagnostics m = row_count;
  return n + m;
end;
$$;

revoke all on function prive.purger_identifiants() from public, anon, authenticated;


-- -------------------------------------------------------------------------------------
-- Verrouillage (même contrôle que la migration api_proserpine)
-- -------------------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as f
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace and p.proname like 'api\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.f);
    execute format('grant execute on function %s to service_role', r.f);
  end loop;

  for r in
    select p.oid::regprocedure as f
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace and p.proname like 'api\_%'
  loop
    if has_function_privilege('anon', r.f, 'execute') or has_function_privilege('authenticated', r.f, 'execute') then
      raise exception 'Fonction ouverte par erreur : %', r.f;
    end if;
  end loop;
end;
$$;
