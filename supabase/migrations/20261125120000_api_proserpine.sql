-- =====================================================================================
-- Proserpine — fonctions de l'API (lecture d'un produit, propositions, administration)
-- Migration du 2026-11-25. Projet Supabase « proserpine ».
--
-- PRINCIPE : le schéma « prive » n'est jamais exposé à l'application. Seules des fonctions du schéma
-- « public », SECURITY DEFINER et au chemin de recherche VIDE, y touchent. Elles sont RÉSERVÉES au rôle
-- « service_role » : ni la clé publique (anon) ni un utilisateur connecté (authenticated) ne peuvent les
-- appeler directement. Elles ne sont appelées que par la fonction serveur « proserpine-api », qui a
-- d'abord vérifié le jeton Firebase de l'utilisateur (et, pour l'administration, que c'est l'administrateur).
--
-- Les codes d'erreur sont des messages courts (« ean_invalide », « deja_connu »…) que la fonction serveur
-- traduit en réponses HTTP.
-- =====================================================================================


-- -------------------------------------------------------------------------------------
-- 1. Outils internes (schéma fermé « prive »)
-- -------------------------------------------------------------------------------------

-- Clé de contrôle d'un code-barres (EAN-8, UPC-A 12, EAN-13, GTIN-14) : même calcul que l'application
-- (src/services/ean.ts). Poids 3, 1, 3, 1… en partant de la droite, clé exclue.
create or replace function prive.cle_ean_valide(p_code text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_n     integer;
  v_somme integer := 0;
  v_poids integer := 3;
  i       integer;
begin
  if p_code is null or p_code !~ '^([0-9]{8}|[0-9]{12,14})$' then
    return false;
  end if;
  v_n := char_length(p_code);
  for i in reverse (v_n - 1)..1 loop
    v_somme := v_somme + substr(p_code, i, 1)::integer * v_poids;
    v_poids := case v_poids when 3 then 1 else 3 end;
  end loop;
  return ((10 - (v_somme % 10)) % 10) = substr(p_code, v_n, 1)::integer;
end;
$$;

-- Contrôle et nettoyage d'une liste d'emballages (proposée par un utilisateur ou saisie par l'administrateur).
-- Renvoie une liste propre, avec uniquement les clés attendues, ou NULL si p_emb est NULL.
-- Lève « emballages_invalides » à la moindre anomalie : on ne devine rien.
-- Utilisateur : 8 éléments au plus, sans source ni commentaire. Administrateur : 20 au plus, avec source et commentaire.
create or replace function prive.valider_emballages(p_emb jsonb, p_admin boolean default false)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_item   jsonb;
  v_out    jsonb := '[]'::jsonb;
  v_nb     integer := 0;
  v_max    integer := case when p_admin then 20 else 8 end;
  v_nom    text;
  v_niveau text;
  v_couche text;
  v_bac    text;
  v_source text;
  v_comm   text;
begin
  if p_emb is null or p_emb = 'null'::jsonb then
    return null;
  end if;
  if jsonb_typeof(p_emb) <> 'array' then
    raise exception 'emballages_invalides';
  end if;

  for v_item in select value from jsonb_array_elements(p_emb) loop
    v_nb := v_nb + 1;
    if v_nb > v_max or jsonb_typeof(v_item) <> 'object' then
      raise exception 'emballages_invalides';
    end if;

    v_nom := btrim(coalesce(v_item ->> 'nom', ''));
    if char_length(v_nom) < 1 or char_length(v_nom) > 100 then
      raise exception 'emballages_invalides';
    end if;

    v_niveau := coalesce(nullif(v_item ->> 'niveau', ''), 'unite');
    if v_niveau not in ('pack', 'unite') then
      raise exception 'emballages_invalides';
    end if;

    v_couche := coalesce(nullif(v_item ->> 'couche', ''), 'autre');
    if v_couche not in ('contenant', 'fermeture', 'sur_emballage', 'etiquette', 'calage', 'autre') then
      raise exception 'emballages_invalides';
    end if;

    v_bac := nullif(v_item ->> 'bac', '');
    if v_bac is not null and not exists (select 1 from prive.bacs b where b.code = v_bac) then
      raise exception 'emballages_invalides';
    end if;

    if p_admin then
      v_source := coalesce(nullif(v_item ->> 'source', ''), 'moi');
      if v_source not in ('intradel', 'moi', 'off', 'doute') then
        raise exception 'emballages_invalides';
      end if;
      v_comm := nullif(btrim(coalesce(v_item ->> 'commentaire', '')), '');
      if v_comm is not null and char_length(v_comm) > 300 then
        raise exception 'emballages_invalides';
      end if;
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'niveau', v_niveau, 'couche', v_couche, 'nom', v_nom, 'bac', v_bac,
        'source', v_source, 'commentaire', v_comm));
    else
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'niveau', v_niveau, 'couche', v_couche, 'nom', v_nom, 'bac', v_bac));
    end if;
  end loop;

  return v_out;
end;
$$;


-- -------------------------------------------------------------------------------------
-- 2. Fonctions pour l'application (appelées après vérification du jeton Firebase)
-- -------------------------------------------------------------------------------------

-- Un produit et ses emballages. Un code alternatif renvoie vers le produit principal.
-- Un produit absent de la base : { "trouve": false }.
create or replace function public.api_lire_produit(p_ean text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ean       text := p_ean;
  v_principal text;
  v_prod      public.produits%rowtype;
begin
  if v_ean is null or v_ean !~ '^[0-9]{8,14}$' then
    return jsonb_build_object('trouve', false);
  end if;

  select c.ean_principal into v_principal from prive.codes_alternatifs c where c.ean = v_ean;
  if v_principal is not null then
    v_ean := v_principal;
  end if;

  select * into v_prod from public.produits p where p.ean = v_ean;
  if not found then
    return jsonb_build_object('trouve', false);
  end if;

  return jsonb_build_object(
    'trouve', true,
    'ean', v_prod.ean,
    'origine', v_prod.origine,
    'nom', v_prod.nom,
    'marque', v_prod.marque,
    'quantite', v_prod.quantite,
    'emballages', coalesce((
      select jsonb_agg(
               jsonb_build_object('niveau', e.niveau, 'couche', e.couche, 'nom', e.nom, 'bac', e.bac)
               order by (e.niveau = 'pack') desc, e.id)
        from prive.emballages e
       where e.ean = v_ean
    ), '[]'::jsonb)
  );
end;
$$;

-- Dépôt d'une proposition de produit (emballages facultatifs).
-- Garde-fous : clé du code-barres, longueurs, produit déjà connu, même proposition déjà en attente,
-- et au plus 5 propositions par compte et par 24 h.
create or replace function public.api_proposer_produit(
  p_utilisateur text,
  p_ean         text,
  p_nom         text,
  p_marque      text default null,
  p_emballages  jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nom     text := btrim(coalesce(p_nom, ''));
  v_marque  text := nullif(btrim(coalesce(p_marque, '')), '');
  v_emb     jsonb;
  v_id      bigint;
  v_max_24h constant integer := 5;
begin
  if p_utilisateur is null or btrim(p_utilisateur) = '' or char_length(p_utilisateur) > 128 then
    raise exception 'utilisateur_invalide';
  end if;
  if not prive.cle_ean_valide(p_ean) then
    raise exception 'ean_invalide';
  end if;
  if char_length(v_nom) < 2 or char_length(v_nom) > 150 then
    raise exception 'nom_invalide';
  end if;
  if v_marque is not null and char_length(v_marque) > 100 then
    raise exception 'marque_invalide';
  end if;
  v_emb := prive.valider_emballages(p_emballages, false);

  if exists (select 1 from public.produits p where p.ean = p_ean)
     or exists (select 1 from prive.codes_alternatifs c where c.ean = p_ean) then
    raise exception 'deja_connu';
  end if;

  if exists (
    select 1 from prive.propositions q
     where q.utilisateur_id = p_utilisateur and q.ean = p_ean and q.statut = 'en_attente'
  ) then
    raise exception 'deja_propose';
  end if;

  if (
    select count(*) from prive.propositions q
     where q.utilisateur_id = p_utilisateur and q.cree_le > now() - interval '24 hours'
  ) >= v_max_24h then
    raise exception 'trop_de_propositions';
  end if;

  insert into prive.propositions (ean, nom, marque, emballages_proposes, utilisateur_id)
  values (p_ean, v_nom, v_marque, v_emb, p_utilisateur)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'statut', 'en_attente');
end;
$$;

-- À la suppression d'un compte : les propositions restent (elles servent à tous), mais l'identifiant est effacé.
create or replace function public.api_effacer_identifiant(p_utilisateur text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nb integer;
begin
  if p_utilisateur is null or btrim(p_utilisateur) = '' then
    raise exception 'utilisateur_invalide';
  end if;
  update prive.propositions set utilisateur_id = null where utilisateur_id = p_utilisateur;
  get diagnostics v_nb = row_count;
  return v_nb;
end;
$$;


-- -------------------------------------------------------------------------------------
-- 3. Fonctions d'administration (appelées seulement si le jeton est celui de l'administrateur)
-- -------------------------------------------------------------------------------------

-- Liste des propositions d'un statut, avec des compteurs. « en attente » : de la plus ancienne à la plus récente.
create or replace function public.api_admin_lister_propositions(p_statut text default 'en_attente', p_limite integer default 100)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limite integer := least(greatest(coalesce(p_limite, 100), 1), 200);
begin
  if p_statut is null or p_statut not in ('en_attente', 'accepte', 'refuse') then
    raise exception 'statut_invalide';
  end if;

  return jsonb_build_object(
    'compteurs', (
      select jsonb_build_object(
               'en_attente', count(*) filter (where q.statut = 'en_attente'),
               'accepte',    count(*) filter (where q.statut = 'accepte'),
               'refuse',     count(*) filter (where q.statut = 'refuse'))
        from prive.propositions q),
    'propositions', coalesce((
      select jsonb_agg(t.x order by t.rn)
        from (
          select row_number() over (
                   order by case when p_statut = 'en_attente' then p.cree_le end asc nulls last,
                            p.traite_le desc nulls last, p.cree_le desc) as rn,
                 jsonb_build_object(
                   'id', p.id, 'ean', p.ean, 'nom', p.nom, 'marque', p.marque,
                   'emballages_proposes', p.emballages_proposes,
                   'statut', p.statut, 'motif_refus', p.motif_refus,
                   'cree_le', p.cree_le, 'traite_le', p.traite_le,
                   'utilisateur_id', p.utilisateur_id,
                   'deja_connu', exists (select 1 from public.produits pr where pr.ean = p.ean),
                   'nb_meme_code', (select count(*) from prive.propositions q where q.ean = p.ean)
                 ) as x
            from prive.propositions p
           where p.statut = p_statut
           order by rn
           limit v_limite
        ) t
    ), '[]'::jsonb)
  );
end;
$$;

-- Accepter (avec correction éventuelle du nom et de la marque) ou refuser (avec motif) une proposition.
-- À l'acceptation, le produit entre dans public.produits (origine « proserpine »). Les emballages proposés
-- ne sont JAMAIS importés d'office : l'administrateur les relit puis les renvoie dans p_emballages.
create or replace function public.api_admin_decider(
  p_id          bigint,
  p_decision    text,
  p_nom         text default null,
  p_marque      text default null,
  p_motif       text default null,
  p_emballages  jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prop   prive.propositions%rowtype;
  v_nom    text;
  v_marque text;
  v_motif  text;
  v_emb    jsonb;
  v_cree   boolean := false;
  v_nb     integer := 0;
begin
  if p_decision is null or p_decision not in ('accepter', 'refuser') then
    raise exception 'decision_invalide';
  end if;

  select * into v_prop from prive.propositions q where q.id = p_id for update;
  if not found then
    raise exception 'non_trouve';
  end if;
  if v_prop.statut <> 'en_attente' then
    raise exception 'deja_traitee';
  end if;

  if p_decision = 'refuser' then
    v_motif := btrim(coalesce(p_motif, ''));
    if char_length(v_motif) < 1 or char_length(v_motif) > 300 then
      raise exception 'motif_requis';
    end if;
    update prive.propositions set statut = 'refuse', motif_refus = v_motif where id = p_id;
    return jsonb_build_object('id', p_id, 'statut', 'refuse');
  end if;

  v_nom := btrim(coalesce(nullif(btrim(coalesce(p_nom, '')), ''), v_prop.nom));
  if char_length(v_nom) < 2 or char_length(v_nom) > 150 then
    raise exception 'nom_invalide';
  end if;
  v_marque := nullif(btrim(coalesce(p_marque, v_prop.marque, '')), '');
  if v_marque is not null and char_length(v_marque) > 100 then
    raise exception 'marque_invalide';
  end if;
  v_emb := prive.valider_emballages(p_emballages, true);

  insert into public.produits (ean, origine, nom, marque)
  values (v_prop.ean, 'proserpine', v_nom, v_marque)
  on conflict (ean) do nothing;
  get diagnostics v_nb = row_count;
  v_cree := v_nb > 0;

  v_nb := 0;
  if v_emb is not null and jsonb_array_length(v_emb) > 0 then
    insert into prive.emballages (ean, niveau, couche, nom, bac, source, commentaire)
    select v_prop.ean, x ->> 'niveau', x ->> 'couche', x ->> 'nom', x ->> 'bac', x ->> 'source', x ->> 'commentaire'
      from jsonb_array_elements(v_emb) as x;
    get diagnostics v_nb = row_count;
  end if;

  update prive.propositions set statut = 'accepte' where id = p_id;
  return jsonb_build_object('id', p_id, 'statut', 'accepte', 'produit_cree', v_cree, 'emballages_importes', v_nb);
end;
$$;

-- Recherche de produits par début de code, ou par morceau de nom ou de marque.
create or replace function public.api_admin_chercher_produits(p_terme text default '', p_limite integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_t      text := btrim(coalesce(p_terme, ''));
  v_limite integer := least(greatest(coalesce(p_limite, 30), 1), 100);
begin
  if char_length(v_t) > 100 then
    raise exception 'terme_invalide';
  end if;
  return jsonb_build_object('produits', coalesce((
    select jsonb_agg(t.x order by t.rn)
      from (
        select row_number() over (order by p.nom, p.ean) as rn,
               jsonb_build_object(
                 'ean', p.ean, 'origine', p.origine, 'nom', p.nom, 'marque', p.marque, 'quantite', p.quantite,
                 'modifie_par_proserpine', p.modifie_par_proserpine,
                 'nb_emballages', (select count(*) from prive.emballages e where e.ean = p.ean)
               ) as x
          from public.produits p
         where v_t = '' or p.ean like v_t || '%' or p.nom ilike '%' || v_t || '%' or p.marque ilike '%' || v_t || '%'
         order by rn
         limit v_limite
      ) t
  ), '[]'::jsonb));
end;
$$;

-- Ajout d'un produit par l'administrateur (code de 8 à 14 chiffres, sans exiger la clé : codes internes possibles).
create or replace function public.api_admin_creer_produit(
  p_ean      text,
  p_nom      text,
  p_marque   text default null,
  p_quantite text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nom      text := btrim(coalesce(p_nom, ''));
  v_marque   text := nullif(btrim(coalesce(p_marque, '')), '');
  v_quantite text := nullif(btrim(coalesce(p_quantite, '')), '');
begin
  if p_ean is null or p_ean !~ '^[0-9]{8,14}$' then
    raise exception 'ean_invalide';
  end if;
  if char_length(v_nom) < 2 or char_length(v_nom) > 150 then
    raise exception 'nom_invalide';
  end if;
  if (v_marque is not null and char_length(v_marque) > 100) or (v_quantite is not null and char_length(v_quantite) > 60) then
    raise exception 'marque_invalide';
  end if;
  if exists (select 1 from public.produits p where p.ean = p_ean) then
    raise exception 'deja_connu';
  end if;
  insert into public.produits (ean, origine, nom, marque, quantite) values (p_ean, 'proserpine', v_nom, v_marque, v_quantite);
  return jsonb_build_object('ean', p_ean);
end;
$$;

-- Correction de l'identité d'un produit (nom, marque, quantité). Marque le produit « modifié par Proserpine ».
create or replace function public.api_admin_modifier_produit(
  p_ean      text,
  p_nom      text,
  p_marque   text default null,
  p_quantite text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nom      text := btrim(coalesce(p_nom, ''));
  v_marque   text := nullif(btrim(coalesce(p_marque, '')), '');
  v_quantite text := nullif(btrim(coalesce(p_quantite, '')), '');
begin
  if char_length(v_nom) < 2 or char_length(v_nom) > 150 then
    raise exception 'nom_invalide';
  end if;
  if (v_marque is not null and char_length(v_marque) > 100) or (v_quantite is not null and char_length(v_quantite) > 60) then
    raise exception 'marque_invalide';
  end if;
  update public.produits
     set nom = v_nom, marque = v_marque, quantite = v_quantite, modifie_par_proserpine = true
   where ean = p_ean;
  if not found then
    raise exception 'non_trouve';
  end if;
  return jsonb_build_object('ean', p_ean);
end;
$$;

-- Les emballages d'un produit, et la liste des bacs.
create or replace function public.api_admin_lire_emballages(p_ean text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_prod public.produits%rowtype;
begin
  select * into v_prod from public.produits p where p.ean = p_ean;
  if not found then
    raise exception 'non_trouve';
  end if;
  return jsonb_build_object(
    'ean', v_prod.ean, 'nom', v_prod.nom, 'marque', v_prod.marque,
    'emballages', coalesce((
      select jsonb_agg(
               jsonb_build_object('id', e.id, 'niveau', e.niveau, 'couche', e.couche, 'nom', e.nom,
                                  'bac', e.bac, 'source', e.source, 'commentaire', e.commentaire)
               order by (e.niveau = 'pack') desc, e.id)
        from prive.emballages e where e.ean = v_prod.ean
    ), '[]'::jsonb),
    'bacs', (select jsonb_agg(jsonb_build_object('code', b.code, 'libelle', b.libelle) order by b.ordre) from prive.bacs b)
  );
end;
$$;

-- Remplace TOUS les emballages d'un produit par la liste donnée (une seule opération : tout ou rien).
create or replace function public.api_admin_remplacer_emballages(p_ean text, p_emballages jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_emb jsonb;
  v_nb  integer := 0;
begin
  if not exists (select 1 from public.produits p where p.ean = p_ean) then
    raise exception 'non_trouve';
  end if;
  v_emb := prive.valider_emballages(p_emballages, true);
  if v_emb is null then
    raise exception 'emballages_invalides';
  end if;

  delete from prive.emballages where ean = p_ean;
  if jsonb_array_length(v_emb) > 0 then
    insert into prive.emballages (ean, niveau, couche, nom, bac, source, commentaire)
    select p_ean, x ->> 'niveau', x ->> 'couche', x ->> 'nom', x ->> 'bac', x ->> 'source', x ->> 'commentaire'
      from jsonb_array_elements(v_emb) as x;
    get diagnostics v_nb = row_count;
  end if;
  return jsonb_build_object('ean', p_ean, 'nb_emballages', v_nb);
end;
$$;


-- -------------------------------------------------------------------------------------
-- 4. Verrouillage : réservé à service_role, et auto-contrôle (la migration échoue si une fonction reste ouverte)
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
