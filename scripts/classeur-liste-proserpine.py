# -*- coding: utf-8 -*-
"""
Construit un classeur Excel lisible à partir du CSV de résultat du script « passer-liste-proserpine »,
en écartant les CODES ERRONÉS (lectures multiples d'un même produit) dans une section à part.

Pourquoi un classeur : un CSV à virgules s'ouvre mal dans un Excel en français (le séparateur attendu est
« ; ») : tout atterrit dans une seule colonne, et les EAN (13 chiffres) deviennent « 3,0174E+12 » ou perdent
leur zéro initial. Ici chaque valeur est dans sa propre cellule, les EAN en TEXTE.

Trois onglets :
  - « Résultats »      : une ligne par EAN GARDÉ (code seul, ou code retenu d'un groupe).
  - « Codes erronés »  : les EAN écartés, groupe par groupe, avec le code retenu en face.
  - « Bilan »          : totaux calculés par des FORMULES, et règles utilisées.

Qu'est-ce qu'un code erroné ? Quand on passe un produit devant la caméra, elle lit parfois plusieurs codes
à quelques millisecondes d'écart : un seul est le vrai, les autres sont des lectures fausses qui passent
quand même le test de la clé de contrôle. On regroupe donc les scans proches dans le temps (règle ci-dessous).

ENCHAÎNEMENT (depuis le dossier du projet), pour chaque nouvelle liste exportée de Scan Échantillon :
  1. node scripts/passer-liste-proserpine.mjs liste.csv       → écrit « liste-proserpine.csv » à côté de la liste
  2. python scripts/classeur-liste-proserpine.py liste.csv    → écrit « liste-proserpine.xlsx » à côté de la liste

PRÉREQUIS : Python 3 et la bibliothèque openpyxl (pip install openpyxl).
Excel verrouille un classeur ouvert : si l'enregistrement échoue, fermer Excel ou donner un autre nom en 2e argument.
"""
import csv
import os
import sys
from datetime import datetime
from math import ceil
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.workbook.properties import CalcProperties

# USAGE : python classeur-liste-proserpine.py liste.csv [classeur.xlsx]
#   liste.csv : l'export de Scan Échantillon (ean,date_heure). Le résultat du script de scan Proserpine doit se
#               trouver à côté, sous le nom « liste-proserpine.csv » ; le classeur est écrit à côté aussi
#               (« liste-proserpine.xlsx »), sauf si un 2e argument donne un autre nom.
if len(sys.argv) < 2:
    sys.exit("Usage : python classeur-liste-proserpine.py liste.csv [classeur.xlsx]")
LISTE = sys.argv[1]                                        # export de Scan Échantillon (avec les heures)
_base = os.path.splitext(LISTE)[0]
SRC = _base + "-proserpine.csv"                            # résultat du script de scan Proserpine
OUT = sys.argv[2] if len(sys.argv) > 2 else _base + "-proserpine.xlsx"
date_donnees = datetime.fromtimestamp(os.path.getmtime(SRC)).strftime("%d/%m/%Y")  # jour où les API ont été interrogées

# ── Règle de regroupement (hypothèses : elles sont aussi écrites dans l'onglet « Bilan ») ──────────────
# Mesuré sur la première liste (273 EAN) : 57 écarts entre scans consécutifs sous 1 s (lectures multiples d'un
# même produit), presque aucun entre 1 et 3 s, puis des écarts de 3 s à plus de 10 s (un produit après l'autre).
# Les nombres affichés dans l'onglet « Bilan » sont recalculés pour CHAQUE liste (voir n_court, n_moyen, n_long).
SEUIL_ECART_S = 1.0   # deux scans consécutifs à ≤ 1 s d'écart : même groupe
SEUIL_LIEN_S = 3.0    # … ou à ≤ 3 s d'écart si les deux codes partagent
SUFFIXE_MIN = 6       # … au moins 6 chiffres finaux (le même produit mal lu garde la fin de son code)

# Rattachement d'un groupe resté « à trancher » à un code déjà retenu (règle validée par l'utilisateur) :
SUFFIXE_RATTACHE = 7       # TOUS les codes du groupe partagent au moins 7 chiffres finaux avec un même code retenu…
FENETRE_RATTACHE_S = 15.0  # … scanné à moins de 15 secondes de l'un des codes du groupe
MOTIF_SIMULTANE = "Scans quasi simultanés d'un même produit"
MOTIF_RATTACHE = f"Rattaché : mêmes {SUFFIXE_RATTACHE} derniers chiffres que le code retenu (scan à moins de {FENETRE_RATTACHE_S:g} s)"
MOTIF_TRANCHER = "Aucun code du groupe ne se détache"

# ───────────────────────── Lecture des données ─────────────────────────
with open(SRC, encoding="utf-8-sig", newline="") as f:  # utf-8-sig : le CSV commence par un BOM à ignorer
    lignes = list(csv.DictReader(f))
par_ean = {r["ean"]: r for r in lignes}

scans, vus = [], set()  # un scan = un EAN et l'heure de sa lecture ; ordre chronologique, 1re lecture seulement
with open(LISTE, encoding="utf-8-sig", newline="") as f:
    for r in csv.DictReader(f):
        if r["ean"] in par_ean and r["ean"] not in vus:
            vus.add(r["ean"])
            scans.append({"ean": r["ean"], "t": datetime.fromisoformat(r["date_heure"].replace("Z", "+00:00"))})
scans.sort(key=lambda s: s["t"])

# Les écarts de temps de CETTE liste (affichés dans l'onglet « Bilan » pour justifier les seuils)
_ecarts_s = [(b["t"] - a["t"]).total_seconds() for a, b in zip(scans, scans[1:])]
n_court = sum(1 for x in _ecarts_s if x < 1)
n_moyen = sum(1 for x in _ecarts_s if 1 <= x < 3)
n_long = len(_ecarts_s) - n_court - n_moyen


def suffixe_commun(a, b):
    n = 0
    while n < min(len(a), len(b)) and a[-1 - n] == b[-1 - n]:
        n += 1
    return n


# ───────────────────────── Regroupement des scans proches ─────────────────────────
groupes, courant = [], [scans[0]]
for prec, suiv in zip(scans, scans[1:]):
    ecart = (suiv["t"] - prec["t"]).total_seconds()
    lies = ecart <= SEUIL_ECART_S or (ecart <= SEUIL_LIEN_S and suffixe_commun(prec["ean"], suiv["ean"]) >= SUFFIXE_MIN)
    if lies:
        courant.append(suiv)
    else:
        groupes.append(courant)
        courant = [suiv]
groupes.append(courant)
groupes = [g for g in groupes if len(g) >= 2]  # un code isolé n'est pas un groupe


def est_fiable(r):
    """Produit trouvé ET identifié : on écarte les fiches vides (ni nom ni marque), souvent créées par une fausse lecture."""
    return r["statut"] == "trouvé" and not (r["nom"] == "Produit inconnu" and r["marque"] == "Marque inconnue")


# Étape 1 — code retenu : le seul produit trouvé ET identifié du groupe (sinon on ne devine pas).
retenus, motifs = {}, {}  # numéro de groupe → EAN retenu ; numéro de groupe → motif du verdict
for num, g in enumerate(groupes, start=1):
    fiables = [s["ean"] for s in g if est_fiable(par_ean[s["ean"]])]
    if len(fiables) == 1:
        retenus[num], motifs[num] = fiables[0], MOTIF_SIMULTANE

# Étape 2 — rattachement : un groupe resté « à trancher » est-il la relecture d'un code déjà retenu ?
# Cibles possibles : les produits trouvés et identifiés qui RESTENT dans « Résultats » (isolés, ou retenus d'un groupe).
dans_un_groupe = {m["ean"] for g in groupes for m in g}
cibles_possibles = [s["ean"] for s in scans
                    if est_fiable(par_ean[s["ean"]]) and (s["ean"] not in dans_un_groupe or s["ean"] in set(retenus.values()))]
t_de = {s["ean"]: s["t"] for s in scans}
journal_rattachements = []
for num, g in enumerate(groupes, start=1):
    if num in retenus:
        continue
    cibles = [x for x in cibles_possibles
              if all(suffixe_commun(s["ean"], x) >= SUFFIXE_RATTACHE for s in g)
              and min(abs((s["t"] - t_de[x]).total_seconds()) for s in g) <= FENETRE_RATTACHE_S]
    if len(cibles) == 1:  # une seule cible possible : sinon on ne devine pas, le groupe reste « à trancher »
        retenus[num], motifs[num] = cibles[0], MOTIF_RATTACHE
        ecart_min = min(abs((s["t"] - t_de[cibles[0]]).total_seconds()) for s in g)
        journal_rattachements.append((num, [s["ean"] for s in g], cibles[0], ecart_min))

# Étape 3 — les lignes de l'onglet « Codes erronés » (tous les membres d'un groupe, sauf le code retenu s'il en fait partie)
ecartes, lignes_erronees = set(), []  # EAN écartés de « Résultats » ; lignes de l'onglet « Codes erronés »
for num, g in enumerate(groupes, start=1):
    retenu = retenus.get(num)  # EAN retenu pour ce groupe, ou None s'il est à trancher
    rang = 0
    for pos, s in enumerate(g):
        if s["ean"] == retenu:
            continue  # le code retenu reste dans « Résultats »
        rang += 1
        r = par_ean[s["ean"]]
        ecartes.add(s["ean"])
        lignes_erronees.append({
            "groupe": num, "rang": rang,
            "heure": s["t"].strftime("%H:%M:%S.") + f"{s['t'].microsecond // 1000:03d}",
            "ean": s["ean"],
            "verdict": "Code erroné" if retenu else "À trancher",
            "ecart_ms": round((s["t"] - g[pos - 1]["t"]).total_seconds() * 1000) if pos > 0 else None,
            "statut": r["statut"], "nom": r["nom"] or None, "marque": r["marque"] or None,
            "retenu_ean": retenu, "retenu_nom": par_ean[retenu]["nom"] if retenu else None,
            "motif": motifs.get(num, MOTIF_TRANCHER),
        })

gardees = [r for r in lignes if r["ean"] not in ecartes]  # l'ordre du fichier de résultat est conservé
n_res, n_err = len(gardees), len(lignes_erronees)
fin_res, fin_err = n_res + 1, n_err + 1  # dernière ligne de chaque tableau (la ligne 1 = en-têtes)

# ───────────────────────── Styles ─────────────────────────
POLICE = "Arial"
f_normal = Font(name=POLICE, size=10)
f_gras = Font(name=POLICE, size=10, bold=True)
f_entete = Font(name=POLICE, size=10, bold=True, color="FFFFFF")
trait = Side(style="thin", color="BFBFBF")
trait_fort = Side(style="medium", color="1F3864")
bordure = Border(left=trait, right=trait, top=trait, bottom=trait)
fond = lambda hexa: PatternFill("solid", start_color=hexa, end_color=hexa)
FOND_STATUT = {"trouvé": "E2EFDA", "introuvable": "FCE4D6"}  # indéterminé : gris
FOND_ECO = {"Excellent": "A9D08E", "Bon": "C6E0B4", "Moyen": "FFE699", "Mauvais": "F4B084", "Non évalué": "D9D9D9"}
FOND_VERDICT = {"Code erroné": "F8CBAD", "À trancher": "FFE699"}


def ecrire_entetes(feuille, colonnes):
    for c, (_cle, titre, largeur, _wrap) in enumerate(colonnes, start=1):
        cell = feuille.cell(row=1, column=c, value=titre)
        cell.font, cell.fill, cell.border = f_entete, fond("1F3864"), bordure
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        feuille.column_dimensions[get_column_letter(c)].width = largeur
    feuille.row_dimensions[1].height = 30


def mise_en_page(feuille, nb_colonnes, derniere, figer):
    feuille.freeze_panes = figer
    feuille.auto_filter.ref = f"A1:{get_column_letter(nb_colonnes)}{derniere}"
    feuille.page_setup.orientation = "landscape"
    feuille.page_setup.fitToWidth = 1
    feuille.page_setup.fitToHeight = 0
    feuille.sheet_properties.pageSetUpPr.fitToPage = True
    feuille.print_title_rows = "1:1"


def hauteur_ligne(textes_et_largeurs):
    """Hauteur d'une ligne pour que TOUT le texte à retour à la ligne soit visible.
    Estimation volontairement généreuse (×1,1) : mieux vaut un peu de blanc qu'un texte coupé."""
    lignes = max([1] + [ceil(len(str(t)) * 1.1 / largeur) for t, largeur in textes_et_largeurs])
    return max(15.0, 12.75 * lignes + 3)


wb = Workbook()
wb.calculation = CalcProperties(fullCalcOnLoad=True)  # Excel recalcule les formules à l'ouverture

# ───────────────────────── Onglet « Résultats » ─────────────────────────
ws = wb.active
ws.title = "Résultats"
# (clé dans le CSV, titre affiché, largeur de colonne, retour à la ligne ?)
COL_RES = [
    ("ean", "EAN", 16, False), ("statut", "Statut", 14, False), ("nom", "Nom du produit", 38, True),
    ("marque", "Marque", 24, True), ("eco_label", "Éco-score", 13, False), ("eco_score", "Note /100", 10, False),
    ("bacs", "Bac(s)", 14, False), ("fiabilite_tri", "Fiabilité du tri", 17, False),
    ("composants", "Éléments d'emballage → bac", 58, True), ("instructions", "Consigne de tri", 62, True),
    ("source", "Source", 15, False),
]
POS_RES = {cle: i + 1 for i, (cle, *_r) in enumerate(COL_RES)}
ecrire_entetes(ws, COL_RES)
for r, ligne in enumerate(gardees, start=2):
    for c, (cle, _t, _l, wrap) in enumerate(COL_RES, start=1):
        valeur = ligne.get(cle, "")
        if cle == "eco_score":
            valeur = int(valeur) if valeur != "" else None  # « Non évalué » : cellule vide, pas de 0
        elif valeur == "":
            valeur = None
        cell = ws.cell(row=r, column=c, value=valeur)
        cell.font, cell.border = f_normal, bordure
        cell.alignment = Alignment(vertical="top", wrap_text=wrap,
                                   horizontal="center" if cle in ("statut", "eco_label", "eco_score", "bacs") else None)
        if cle == "ean":
            cell.number_format = "@"  # TEXTE : pas de 3,0174E+12, le zéro initial de 05052332 est gardé
    ws.row_dimensions[r].height = hauteur_ligne([(ligne.get(cle) or "", larg) for (cle, _t, larg, wrap) in COL_RES if wrap])
    c_statut = ws.cell(row=r, column=POS_RES["statut"])
    c_statut.fill = fond(FOND_STATUT.get(ligne["statut"], "EDEDED"))
    c_statut.font = f_gras
    if ligne["statut"] == "trouvé" and ligne["eco_label"] in FOND_ECO:
        ws.cell(row=r, column=POS_RES["eco_label"]).fill = fond(FOND_ECO[ligne["eco_label"]])
mise_en_page(ws, len(COL_RES), fin_res, "C2")  # en-têtes + colonnes EAN et Statut toujours visibles

# ───────────────────────── Onglet « Codes erronés » ─────────────────────────
we = wb.create_sheet("Codes erronés")
COL_ERR = [
    ("groupe", "Groupe", 9, False), ("rang", "N° dans le groupe", 11, False), ("heure", "Heure du scan (UTC)", 15, False),
    ("ean", "EAN", 16, False), ("verdict", "Verdict", 14, False), ("ecart_ms", "Écart avec le scan précédent du groupe (ms)", 18, False),
    ("statut", "Statut Open*Facts", 14, False), ("nom", "Nom (si trouvé)", 34, True), ("marque", "Marque (si trouvée)", 22, True),
    ("retenu_ean", "Code retenu du groupe", 16, False), ("retenu_nom", "Nom du code retenu", 34, True),
    ("motif", "Motif du verdict", 46, True),
]
ecrire_entetes(we, COL_ERR)
we.row_dimensions[1].height = 44
groupe_prec = None
for r, ligne in enumerate(lignes_erronees, start=2):
    nouveau_groupe = ligne["groupe"] != groupe_prec
    groupe_prec = ligne["groupe"]
    for c, (cle, _t, _l, wrap) in enumerate(COL_ERR, start=1):
        cell = we.cell(row=r, column=c, value=ligne[cle])
        cell.font = f_normal
        # Un trait épais au-dessus de chaque nouveau groupe : on voit où chaque groupe commence.
        cell.border = Border(left=trait, right=trait, bottom=trait, top=trait_fort if nouveau_groupe else trait)
        cell.alignment = Alignment(vertical="top", wrap_text=wrap, horizontal="center" if cle in ("groupe", "rang", "heure", "verdict", "ecart_ms", "statut") else None)
        if cle in ("ean", "retenu_ean", "heure"):
            cell.number_format = "@"
    we.row_dimensions[r].height = hauteur_ligne([(ligne[cle] or "", larg) for (cle, _t, larg, wrap) in COL_ERR if wrap])
    cv = we.cell(row=r, column=5)
    cv.fill, cv.font = fond(FOND_VERDICT[ligne["verdict"]]), f_gras
mise_en_page(we, len(COL_ERR), max(fin_err, 2), "E2")

# ───────────────────────── Onglet « Bilan » ─────────────────────────
bl = wb.create_sheet("Bilan")
bl.column_dimensions["A"].width = 56
bl.column_dimensions["B"].width = 12
bl.column_dimensions["C"].width = 12


def plage(feuille, cle_ou_col, fin):  # ex. 'Résultats'!$B$2:$B$250
    return f"'{feuille}'!${cle_ou_col}$2:${cle_ou_col}${fin}"


R = lambda cle: plage("Résultats", get_column_letter(POS_RES[cle]), fin_res)
E = lambda col: plage("Codes erronés", col, max(fin_err, 2))

bl["A1"] = "Bilan du passage dans la logique de scan Proserpine"
bl["A1"].font = Font(name=POLICE, size=14, bold=True)


def entete(ligne, titres):
    for c, t in enumerate(titres, start=1):
        cell = bl.cell(row=ligne, column=c, value=t)
        cell.font, cell.fill, cell.border = f_entete, fond("1F3864"), bordure
        cell.alignment = Alignment(horizontal="center" if c > 1 else "left", vertical="center")


def indicateur(ligne, libelle, formule, denominateur=None, gras=False):
    a = bl.cell(row=ligne, column=1, value=libelle)
    b = bl.cell(row=ligne, column=2, value=formule)
    c = bl.cell(row=ligne, column=3, value=f"=IFERROR(B{ligne}/{denominateur},0)" if denominateur else None)
    for cell in (a, b, c):
        cell.font, cell.border = (f_gras if gras else f_normal), bordure
    b.alignment = c.alignment = Alignment(horizontal="center")
    c.number_format = "0.0%"


# Bloc 1 : où sont passés les EAN de la liste d'origine ?
entete(3, ["Les EAN de la liste d'origine", "Nombre", "Part"])
indicateur(4, "Gardés dans « Résultats »", f"=COUNTA({R('ean')})", "$B$7")
indicateur(5, "Codes erronés (un code retenu dans leur groupe)", f'=COUNTIF({E("E")},"Code erroné")', "$B$7")
indicateur(6, "Codes à trancher (aucun code du groupe ne se détache)", f'=COUNTIF({E("E")},"À trancher")', "$B$7")
indicateur(7, "Total = nombre d'EAN de la liste d'origine", "=SUM(B4:B6)", None, gras=True)
indicateur(8, "Groupes de lectures multiples (scans quasi simultanés)", f"=MAX({E('A')})")
indicateur(9, "   dont groupes à trancher (au moins un produit réel à identifier)", f'=COUNTIFS({E("E")},"À trancher",{E("B")},1)')
indicateur(10, "   codes erronés rattachés par leurs derniers chiffres (inclus plus haut)", f'=COUNTIF({E("L")},"Rattaché*")')

# Bloc 2 : les résultats gardés
entete(11, ["Résultats gardés (hors codes erronés et à trancher)", "Nombre", "Part"])
indicateur(12, "Trouvés", f'=COUNTIF({R("statut")},"trouvé")', "$B$4")
indicateur(13, "Introuvables (les 3 API ont répondu « inconnu »)", f'=COUNTIF({R("statut")},"introuvable")', "$B$4")
indicateur(14, "Indéterminés (réseau : on ne sait pas)", f'=COUNTIF({R("statut")},"indéterminé*")', "$B$4")

# Bloc 3 : éco-score des produits trouvés
entete(16, ["Éco-score (parmi les produits trouvés gardés)", "Nombre", "Part"])
for i, lib in enumerate(["Excellent", "Bon", "Moyen", "Mauvais", "Non évalué"]):
    indicateur(17 + i, lib, f'=COUNTIF({R("eco_label")},"{lib}")', "$B$12")

# Bloc 4 : fiabilité du tri des produits trouvés
entete(23, ["Fiabilité du tri (parmi les produits trouvés gardés)", "Nombre", "Part"])
indicateur(24, "lu : bac issu des données d'emballage", f'=COUNTIF({R("fiabilite_tri")},"lu")', "$B$12")
indicateur(25, "déduit : bac déduit de la catégorie (« à vérifier »)", f'=COUNTIF({R("fiabilite_tri")},"déduit")', "$B$12")
indicateur(26, "aucune : pas de consigne (l'app demande la matière)", f'=COUNTIF({R("fiabilite_tri")},"aucune*")', "$B$12")

# Notes : hypothèses, règles et limites, à la vue du lecteur
bl["A28"] = "Notes et règles utilisées"
bl["A28"].font = f_gras
notes = [
    f"Données : API Open Food Facts / Beauty Facts / Products Facts, interrogées le {date_donnees}, avec le code de Proserpine "
    "(api.js, tri.js, ecoscore.js) tel qu'il était sur le disque ce jour-là, modifications non commitées comprises.",
    "« Introuvable » veut dire inconnu des trois API Open*Facts. La base Firestore de Proserpine (consignes vérifiées à la main) "
    "n'est pas consultée : l'app peut donc connaître des produits « introuvables » ici.",
    f"Codes erronés, règle de regroupement : deux scans consécutifs sont dans le même groupe s'ils sont séparés d'au plus "
    f"{SEUIL_ECART_S:g} seconde, ou d'au plus {SEUIL_LIEN_S:g} secondes quand leurs codes partagent au moins {SUFFIXE_MIN} chiffres finaux. "
    f"Sur la liste d'origine, {n_court} écarts entre scans consécutifs sont inférieurs à 1 seconde (lectures multiples d'un même produit), "
    f"{n_moyen} tombent entre 1 et 3 secondes et {n_long} font 3 secondes ou plus (un produit après l'autre).",
    "Code retenu : dans un groupe, c'est le seul produit trouvé dans Open Food Facts avec un nom ou une marque connus ; les autres codes "
    "du groupe sont « erronés » et vont dans l'onglet « Codes erronés ». Sans code retenu unique (aucun trouvé, ou plusieurs trouvés), le groupe "
    "est « à trancher » : un seul de ses codes est le bon, mais le script ne peut pas savoir lequel (le re-scanner ou lire l'emballage tranche).",
    f"Rattachement : avant de classer un groupe « à trancher », le script cherche s'il s'agit d'une relecture d'un code déjà retenu. Si TOUS les codes "
    f"du groupe partagent au moins {SUFFIXE_RATTACHE} chiffres finaux avec un même code retenu, scanné à moins de {FENETRE_RATTACHE_S:g} secondes d'un code du groupe, "
    "le groupe est rattaché à ce code (verdict « Code erroné », motif « Rattaché »). S'il y a plusieurs codes possibles, le script ne choisit pas.",
    "Limites : un code erroné lu plus de 3 secondes après les autres n'est pas détecté et reste dans « Résultats ». Un code retenu peut aussi "
    "être une fausse lecture si Open Food Facts contient une fiche pour ce code erroné.",
    "Les nombres de cet onglet sont des formules qui lisent les onglets « Résultats » et « Codes erronés ».",
]
for i, texte in enumerate(notes):
    r = 29 + i
    bl.merge_cells(start_row=r, start_column=1, end_row=r, end_column=3)
    cell = bl.cell(row=r, column=1, value=texte)
    cell.font = f_normal
    cell.alignment = Alignment(wrap_text=True, vertical="top")
    bl.row_dimensions[r].height = 14 * ceil(len(texte) / 84) + 6  # cellules fusionnées : la hauteur ne s'ajuste pas seule

try:
    wb.save(OUT)
except PermissionError:
    sys.exit(f"Impossible d'écrire {OUT} : le classeur est probablement ouvert dans Excel. Ferme-le, ou donne un autre nom en 2e argument.")
nb_err = sum(1 for x in lignes_erronees if x["verdict"] == "Code erroné")
nb_tr = n_err - nb_err
print(f"OK : {len(lignes)} EAN au total = {n_res} gardes + {nb_err} codes errones + {nb_tr} a trancher ; {len(groupes)} groupes")
for num, membres, cible, ecart_min in journal_rattachements:
    print(f"  rattache : groupe {num} {membres} -> code retenu {cible} « {par_ean[cible]['nom']} » (ecart min {ecart_min:.1f} s)")
