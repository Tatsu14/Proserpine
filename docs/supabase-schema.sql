-- =====================================================================================
-- Proserpine — schéma de la base de données produits (Supabase / PostgreSQL)
-- Version 2, rédigée le 2026-11-16. Projet Supabase « proserpine » (région UE : Francfort).
-- NON APPLIQUÉ tant que l'administrateur n'a pas donné son accord.
--
-- DEUX SOUS-BASES DANS UNE SEULE BASE :
--
--   SOUS-BASE 1 — schéma « public », table produits
--     Identité des produits : copie des infos d'Open Food / Beauty / Products Facts ET produits
--     ajoutés par Proserpine, dans UNE SEULE table commune (colonne « origine »).
--     LECTURE PUBLIQUE (clé publique de l'app). ÉCRITURE réservée à l'administrateur.
--     Ne contient AUCUNE donnée d'emballage (voir sous-base 2).
--
--   SOUS-BASE 2 — schéma « prive »
--     Emballages, bacs, copie brute des fiches OFF (qui contient leurs champs d'emballage),
--     propositions des utilisateurs. FERMÉE : ni lecture ni écriture avec la clé publique.
--     Le schéma « prive » n'est PAS exposé par l'API : même une erreur de réglage d'une table
--     ne l'ouvrirait pas. Plus tard, l'app y accédera via une fonction serveur qui ne renvoie
--     qu'UN produit à la fois.
--
-- DÉCISIONS DE L'ADMINISTRATEUR (2026-11-16), à revoir si Open Food Facts les juge non conformes :
--
--   1. OPTION C : une table commune pour les produits OFF et les produits Proserpine.
--      Raisonnement : la documentation d'OFF dit que « toute donnée dérivée ou mélangée doit être
--      partagée » (wiki ODbL) ; la table étant publique et les ajouts étant renvoyés à OFF, le
--      mélange est assumé. ATTENTION : le guide « cache local » d'OFF dit aussi « Do not mix OFF
--      data with external product data ». Les deux textes ne sont pas parfaitement alignés.
--      Conditions pour que l'option C tienne : (a) la table est réellement offerte sous licence ODbL
--      (mention de licence, attribution), (b) les ajouts et modifications sont renvoyés à OFF.
--      Les colonnes « origine », « modifie_par_proserpine » et « envoye_a_off_le » permettent de
--      savoir ce qui vient d'OFF, ce qui a été changé, et ce qui a été renvoyé.
--
--   2. EMBALLAGES PRIVÉS : aucune donnée d'emballage dans la sous-base publique. Quand un produit
--      arrive d'OFF avec ses champs d'emballage, la fiche brute est copiée dans prive.off_brut.
--      Risque assumé : des données d'emballage venues d'OFF restent privées. Si OFF indique que
--      cela contrevient à leurs règles, il suffira de partager ou de changer cette table.
--
--   3. AUCUN identifiant d'utilisateur dans les propositions pour l'instant (comme les retours
--      existants). À décider avant la phase premium, car cela touche la confidentialité.
--
-- Attribution à afficher dans l'app, sur chaque écran qui montre des données OFF :
--   « (c) Open Food Facts contributors » avec un lien vers https://world.openfoodfacts.org
--   (voir https://wiki.openfoodfacts.org/ODBL_License).
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
-- 1. SOUS-BASE 1 (publique) : produits = copie d'Open*Facts + produits ajoutés par Proserpine
-- -------------------------------------------------------------------------------------
create table public.produits (
  ean                      text primary key check (ean ~ '^[0-9]{8,14}$'),
  origine                  text not null check (origine in ('off', 'obf', 'opf', 'proserpine')),
                           -- off / obf / opf : copié d'Open Food / Beauty / Products Facts
                           -- proserpine      : ajouté par Proserpine (absent d'OFF au moment de l'ajout)
  nom                      text,
  marque                   text,
  quantite                 text,                            -- texte libre, ex. « 8 x 33 cl »
  categories               text[] not null default '{}',    -- tags de catégories d'OFF
  pays                     text[] not null default '{}',    -- pays de vente (tags d'OFF)
  url_source               text,                            -- page du produit chez OFF (attribution)
  modifie_par_proserpine   boolean not null default false,  -- l'identité a été corrigée par rapport à OFF
  envoye_a_off_le          timestamptz,                     -- vide = pas encore renvoyé à OFF
  copie_le                 timestamptz not null default now(),
  mis_a_jour_le            timestamptz not null default now()
);

comment on table public.produits is
  'SOUS-BASE 1 (publique) : identité des produits. Données Open Food Facts (c) Open Food Facts contributors, sous licence ODbL (https://opendatacommons.org/licenses/odbl/1.0/), mêlées à des produits ajoutés par Proserpine. Aucune donnée d''emballage ici.';

create trigger produits_horodatage
  before update on public.produits
  for each row execute function prive.maj_horodatage();

alter table public.produits enable row level security;

create policy "lecture publique"
  on public.produits
  for select
  to anon, authenticated
  using (true);

-- Clé publique : lecture seulement. Aucune écriture, quoi qu'il arrive.
revoke all on public.produits from anon, authenticated;
grant select on public.produits to anon, authenticated;


-- -------------------------------------------------------------------------------------
-- 2. SOUS-BASE 2 (fermée)
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

-- La fiche brute reçue d'OFF, avec ses champs d'emballage (packagings, packaging_text, tags…).
-- C'est ici que va tout ce qu'OFF dit de l'emballage : la table publique n'en contient pas.
create table prive.off_brut (
  ean          text primary key references public.produits (ean) on delete cascade,
  base_source  text not null check (base_source in ('off', 'obf', 'opf')),
  donnees      jsonb not null,
  copie_le     timestamptz not null default now()
);

-- Deux codes-barres pour un même produit (ex. deux fiches OFF pour un même Lipton).
create table prive.codes_alternatifs (
  ean            text primary key check (ean ~ '^[0-9]{8,14}$'),
  ean_principal  text not null references public.produits (ean) on delete cascade,
  check (ean <> ean_principal)
);

-- Les couches d'emballage : pack (emballage autour de plusieurs unités) -> unité -> couches.
-- La description (niveau, couche, nom) et le bac sont dans des colonnes séparées.
-- bac vide = « je ne sais pas » (la source vaut alors « doute »).
create table prive.emballages (
  id             bigint generated always as identity primary key,
  ean            text not null references public.produits (ean) on delete cascade,
  niveau         text not null check (niveau in ('pack', 'unite')),
  couche         text not null check (couche in ('contenant', 'fermeture', 'sur_emballage', 'etiquette', 'calage', 'autre')),
  nom            text not null,                       -- ex. « Bouteille en verre transparent »
  bac            text references prive.bacs (code),
  source         text not null check (source in ('intradel', 'moi', 'off', 'doute')),
  commentaire    text,
  cree_le        timestamptz not null default now(),
  mis_a_jour_le  timestamptz not null default now()
);

create index emballages_ean_idx on prive.emballages (ean);

-- Propositions des utilisateurs : une « boîte aux lettres ». Le code-barres, le nom et la marque
-- suffisent ; les emballages proposés sont facultatifs. Aucun identifiant d'utilisateur (voir décision 3).
-- Quand l'administrateur valide, il crée la ligne dans public.produits (origine « proserpine »).
create table prive.propositions (
  id                    bigint generated always as identity primary key,
  ean                   text not null check (ean ~ '^[0-9]{8,14}$'),
  nom                   text not null,
  marque                text,
  emballages_proposes   jsonb,                        -- facultatif : liste libre de couches et bacs proposés
  statut                text not null default 'en_attente' check (statut in ('en_attente', 'accepte', 'refuse')),
  motif_refus           text,
  cree_le               timestamptz not null default now(),
  traite_le             timestamptz
);

create index propositions_statut_idx on prive.propositions (statut);

create trigger emballages_horodatage
  before update on prive.emballages
  for each row execute function prive.maj_horodatage();

comment on schema prive is
  'SOUS-BASE 2 (fermée) : emballages, bacs, fiches brutes d''OFF, propositions. Aucun accès avec la clé publique.';

-- Défense en profondeur : RLS activée partout, sans aucune règle d'accès = tout refusé
-- pour les clés publiques. L'administrateur (tableau de bord, clé secrète) n'est pas concerné.
alter table prive.bacs               enable row level security;
alter table prive.off_brut           enable row level security;
alter table prive.codes_alternatifs  enable row level security;
alter table prive.emballages         enable row level security;
alter table prive.propositions       enable row level security;
