-- =====================================================================================
-- Proserpine — schéma initial de la base de données produits (Supabase / PostgreSQL)
-- Rédigé le 2026-11-16. Projet Supabase « proserpine » (région UE : Francfort).
--
-- DEUX SOUS-BASES DANS UNE SEULE BASE :
--
--   SOUS-BASE 1 — schéma « public », table off_produits
--     Copie des informations d'un produit venues d'Open Food / Beauty / Products Facts.
--     LECTURE PUBLIQUE (clé publique de l'app), ÉCRITURE réservée à l'administrateur.
--     Raison : licence ODbL d'Open Food Facts (attribution, partage). Voir « Attribution » plus bas.
--
--   SOUS-BASE 2 — schéma « prive »
--     Emballages de chaque produit et règles de tri : le travail propre à Proserpine.
--     FERMÉE : ni lecture ni écriture avec la clé publique. Accès réservé à l'administrateur
--     (tableau de bord Supabase, clé secrète). Le schéma « prive » n'est PAS exposé par l'API :
--     même une erreur de réglage d'une table ne l'ouvrirait pas.
--     Plus tard, l'app y accédera via une fonction serveur qui ne renvoie qu'UN produit à la fois.
--
-- Attribution (à afficher dans l'app quand elle utilisera la sous-base 1) :
--   « Données produit : Open Food Facts (ODbL), contributeurs d'Open Food Facts. »
--   Le cadre juridique exact (base mixte, redistribution) n'est PAS confirmé : à valider avec
--   Open Food Facts (reuse@openfoodfacts.org) ou un juriste avant tout usage commercial.
-- =====================================================================================


-- -------------------------------------------------------------------------------------
-- 0. SOUS-BASE 2 : le schéma fermé, et la fonction qui tient « mis à jour le » à jour
-- -------------------------------------------------------------------------------------
create schema if not exists prive;

-- Personne d'autre que l'administrateur n'a accès à ce schéma.
revoke all on schema prive from public, anon, authenticated;

create or replace function prive.maj_horodatage()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.mis_a_jour_le := now();
  return new;
end;
$$;


-- -------------------------------------------------------------------------------------
-- 1. SOUS-BASE 1 (publique) : copie des infos produit d'Open*Facts
-- -------------------------------------------------------------------------------------
create table public.off_produits (
  ean              text primary key check (ean ~ '^[0-9]{8,14}$'),
  base_source      text not null check (base_source in ('off', 'obf', 'opf')),  -- Food / Beauty / Products Facts
  nom              text,
  marque           text,
  quantite         text,                            -- texte d'OFF, ex. « 8 x 33 cl »
  categories       text[] not null default '{}',    -- tags de catégories d'OFF
  pays             text[] not null default '{}',    -- pays de vente (tags d'OFF)
  texte_emballage  text,                            -- champ « packaging_text » d'OFF
  emballages_off   jsonb,                           -- champ structuré « packagings » d'OFF
  tags_emballage   text[] not null default '{}',    -- « packaging_tags » d'OFF
  donnees_brutes   jsonb,                           -- fiche OFF utile, pour recalculer le tri sans réinterroger OFF
  url_source       text,                            -- page du produit chez OFF (attribution)
  copie_le         timestamptz not null default now()
);

comment on table public.off_produits is
  'SOUS-BASE 1 (publique) : copie des infos produit d''Open*Facts (ODbL). Lecture publique, écriture admin.';

alter table public.off_produits enable row level security;

create policy "lecture publique"
  on public.off_produits
  for select
  to anon, authenticated
  using (true);

-- Clé publique : lecture seulement. Aucune écriture, quoi qu'il arrive.
revoke all on public.off_produits from anon, authenticated;
grant select on public.off_produits to anon, authenticated;


-- -------------------------------------------------------------------------------------
-- 2. SOUS-BASE 2 (fermée) : bacs, produits, emballages, règles de tri
-- -------------------------------------------------------------------------------------

-- Les 7 bacs de la liste de travail. « Je ne sais pas » n'est pas un bac : on laisse le bac vide
-- et on met la source à « doute ». Le « danger » de l'app correspond à Recyparc.
create table prive.bacs (
  code     text primary key,
  libelle  text not null,
  ordre    smallint not null unique
);

insert into prive.bacs (code, libelle, ordre) values
  ('pmc',               'Sac bleu (PMC)',      1),
  ('papier_carton',     'Papiers & cartons',   2),
  ('verre_transparent', 'Verre transparent',   3),
  ('verre_colore',      'Verre coloré',        4),
  ('organique',         'Déchets organiques',  5),
  ('residuel',          'Déchets résiduels',   6),
  ('recyparc',          'Recyparc',            7);

-- Un produit (même code-barres que la sous-base 1, sans lien obligatoire : un produit peut
-- n'exister que chez Proserpine).
create table prive.produits (
  ean            text primary key check (ean ~ '^[0-9]{8,14}$'),
  nom            text,
  marque         text,
  quantite       text,
  statut         text not null default 'brouillon' check (statut in ('brouillon', 'verifie', 'doute')),
  cree_le        timestamptz not null default now(),
  mis_a_jour_le  timestamptz not null default now()
);

-- Deux codes-barres pour un même produit (ex. deux fiches OFF pour un même Lipton).
create table prive.codes_alternatifs (
  ean            text primary key check (ean ~ '^[0-9]{8,14}$'),
  ean_principal  text not null references prive.produits (ean) on delete cascade,
  check (ean <> ean_principal)
);

-- Les couches d'emballage : pack (emballage autour de plusieurs unités) -> unité -> couches.
-- bac vide = « je ne sais pas » (la source vaut alors « doute »).
create table prive.emballages (
  id             bigint generated always as identity primary key,
  ean            text not null references prive.produits (ean) on delete cascade,
  niveau         text not null check (niveau in ('pack', 'unite')),
  couche         text not null check (couche in ('contenant', 'fermeture', 'sur_emballage', 'etiquette', 'calage', 'autre')),
  nom            text not null,                       -- ex. « Bouteille en verre transparent »
  bac            text references prive.bacs (code),
  source         text not null check (source in ('intradel', 'moi', 'doute')),
  commentaire    text,
  cree_le        timestamptz not null default now(),
  mis_a_jour_le  timestamptz not null default now()
);

create index emballages_ean_idx on prive.emballages (ean);

-- Règles de tri sous forme de données (STRUCTURE PROVISOIRE : à ajuster quand les patterns de
-- l'échantillon seront connus). Une règle = une matière (et une forme, facultative) -> un bac.
create table prive.regles_tri (
  id           bigint generated always as identity primary key,
  matiere      text not null,
  forme        text,
  bac          text not null references prive.bacs (code),
  source       text not null check (source in ('intradel', 'moi')),
  url_source   text,
  verifie_le   date,
  remarque     text,
  unique nulls not distinct (matiere, forme)
);

create trigger produits_horodatage
  before update on prive.produits
  for each row execute function prive.maj_horodatage();

create trigger emballages_horodatage
  before update on prive.emballages
  for each row execute function prive.maj_horodatage();

comment on schema prive is
  'SOUS-BASE 2 (fermée) : emballages et règles de tri de Proserpine. Aucun accès avec la clé publique.';

-- Défense en profondeur : RLS activée partout, sans aucune règle d'accès = tout refusé
-- pour les clés publiques. L'administrateur (tableau de bord, clé secrète) n'est pas concerné.
alter table prive.bacs               enable row level security;
alter table prive.produits           enable row level security;
alter table prive.codes_alternatifs  enable row level security;
alter table prive.emballages         enable row level security;
alter table prive.regles_tri         enable row level security;
