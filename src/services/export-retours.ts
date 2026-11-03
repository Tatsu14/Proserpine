/**
 * export-retours.ts — Fabrique le rapport texte des retours, à coller dans une conversation
 * Claude Code pour analyser les retours et améliorer l'app.
 *
 * Le rapport contient : une demande d'analyse, des chiffres clés, puis chaque retour sur une ligne.
 * Fonctions pures (aucun accès réseau) : faciles à tester.
 */
import type { Avis, ConsigneSignalee, Signalement } from './admin-retours';
import { BACS, FONCTIONNALITES, GRAVITES, TYPES_AVIS } from './retours';

const libelle = (liste: readonly { id: string; libelle: string }[], id: string) =>
  liste.find((e) => e.id === id)?.libelle ?? id;

const jour = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : 'date inconnue');

/** Texte sur une seule ligne, entre guillemets (les retours à la ligne cassent la lecture). */
const citer = (texte: string) => JSON.stringify(texte.replace(/\s+/g, ' ').trim());

const appareil = (r: { versionApp: string; plateforme: string; versionSysteme: string | null; modeleAppareil: string | null }) =>
  [`v${r.versionApp}`, r.plateforme, r.versionSysteme, r.modeleAppareil].filter(Boolean).join(' ');

function compter<T>(elements: T[], cle: (e: T) => string): Map<string, T[]> {
  const groupes = new Map<string, T[]>();
  for (const e of elements) {
    const k = cle(e);
    groupes.set(k, [...(groupes.get(k) ?? []), e]);
  }
  return groupes;
}

export function noteMoyenne(avis: Avis[]): number | null {
  if (avis.length === 0) return null;
  return Math.round((avis.reduce((somme, a) => somme + a.note, 0) / avis.length) * 10) / 10;
}

export function construireRapport(
  avis: Avis[],
  signalements: Signalement[],
  consignes: ConsigneSignalee[] = [],
  maintenant: Date = new Date(),
): string {
  const lignes: string[] = [];

  lignes.push('# Retours utilisateurs — application Proserpine');
  lignes.push('');
  lignes.push(`Rapport généré le ${jour(maintenant)}.`);
  lignes.push(
    "Contexte : Proserpine est une application mobile (guide de tri des déchets, scan de codes-barres, indice d'impact). " +
      'Les retours ci-dessous sont anonymes (aucune donnée personnelle).',
  );
  lignes.push('');
  lignes.push('## Demande');
  lignes.push('Analyse ces retours puis :');
  lignes.push('1. dégage les thèmes récurrents ;');
  lignes.push('2. liste les problèmes bloquants ou gênants à corriger en priorité ;');
  lignes.push("3. propose des améliorations, classées par impact et par effort estimé, en citant les retours qui les justifient.");
  lignes.push('');

  // --- Avis ---
  lignes.push(`## Avis (${avis.length})`);
  if (avis.length === 0) {
    lignes.push('Aucun avis.');
  } else {
    lignes.push(`Note moyenne : ${noteMoyenne(avis)} / 5.`);
    lignes.push('');
    lignes.push('Par fonctionnalité (nombre, note moyenne) :');
    for (const [id, groupe] of compter(avis, (a) => a.fonctionnalite)) {
      lignes.push(`- ${libelle(FONCTIONNALITES, id)} : ${groupe.length}, ${noteMoyenne(groupe)} / 5`);
    }
    lignes.push('');
    lignes.push('Par type :');
    for (const [id, groupe] of compter(avis, (a) => a.type)) {
      lignes.push(`- ${libelle(TYPES_AVIS, id)} : ${groupe.length}`);
    }
    lignes.push('');
    lignes.push('Détail (date | fonctionnalité | type | note | appareil | statut | commentaire) :');
    for (const a of avis) {
      lignes.push(
        `- ${jour(a.creeLe)} | ${libelle(FONCTIONNALITES, a.fonctionnalite)} | ${libelle(TYPES_AVIS, a.type)} | ${a.note}/5 | ${appareil(a)} | ${a.statut} | ${a.commentaire ? citer(a.commentaire) : '(sans commentaire)'}`,
      );
    }
  }
  lignes.push('');

  // --- Signalements ---
  lignes.push(`## Signalements de problèmes (${signalements.length})`);
  if (signalements.length === 0) {
    lignes.push('Aucun signalement.');
  } else {
    const bloquants = signalements.filter((s) => s.gravite === 'bloquant').length;
    lignes.push(`Bloquants : ${bloquants}, gênants : ${signalements.length - bloquants}.`);
    lignes.push('');
    lignes.push('Par fonctionnalité :');
    for (const [id, groupe] of compter(signalements, (s) => s.fonctionnalite)) {
      lignes.push(`- ${libelle(FONCTIONNALITES, id)} : ${groupe.length}`);
    }
    lignes.push('');
    lignes.push('Détail (date | fonctionnalité | gravité | appareil | statut | ce que faisait l\'utilisateur | description) :');
    for (const s of signalements) {
      lignes.push(
        `- ${jour(s.creeLe)} | ${libelle(FONCTIONNALITES, s.fonctionnalite)} | ${libelle(GRAVITES, s.gravite)} | ${appareil(s)} | ${s.statut} | ${s.action ? citer(s.action) : '(non précisé)'} | ${citer(s.description)}`,
      );
    }
  }
  lignes.push('');
  return lignes.join('\n');
}
