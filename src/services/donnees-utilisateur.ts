/**
 * donnees-utilisateur.ts — Export des données personnelles (droit à la portabilité, RGPD).
 *
 * Produit un fichier JSON avec le profil et l'historique de l'utilisateur. Trois étapes
 * indépendantes : construire l'objet (Firestore), nommer le fichier, le remettre à
 * l'utilisateur (feuille de partage du système).
 */
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { Platform, Share } from 'react-native';

import { db } from './firebase';

/** Horodatage Firestore → date ISO. Renvoie null si la date est absente : on n'invente jamais une date. */
function versDateIso(horodatage: any): string | null {
  return horodatage && typeof horodatage.toDate === 'function' ? horodatage.toDate().toISOString() : null;
}

/** Construit l'objet exporté. Un champ absent est exporté à null, jamais remplacé par une valeur par défaut. */
export async function construireExport(uid: string, emailAuth: string | null = null) {
  const documentProfil = await getDoc(doc(db, 'utilisateurs', uid));
  const profil: any = documentProfil.exists() ? documentProfil.data() : {};

  const instantane = await getDocs(collection(db, 'utilisateurs', uid, 'historique'));
  const historique = instantane.docs.map((d) => {
    const p: any = d.data();
    return {
      ean: p.ean ?? d.id,
      nom: p.nom ?? null,
      marque: p.marque ?? null,
      dernier_scan: versDateIso(p.date),
      nombre_scans: p.scanCount ?? null,
      // Dans la base, ce champ s'appelle encore « ecoScore » (ancien nom).
      indice_impact: typeof p.ecoScore === 'number' ? p.ecoScore : null,
    };
  });
  // Du scan le plus récent au plus ancien.
  historique.sort((a, b) => (b.dernier_scan || '').localeCompare(a.dernier_scan || ''));

  return {
    application: 'Proserpine',
    exporte_le: new Date().toISOString(),
    profil: {
      nom_utilisateur: profil.username ?? null,
      email: profil.email ?? emailAuth ?? null,
      date_creation: versDateIso(profil.createdAt),
    },
    historique,
  };
}

/** proserpine-mes-donnees-AAAA-MM-JJ.json */
export function nomFichierExport(date = new Date()): string {
  return `proserpine-mes-donnees-${date.toISOString().slice(0, 10)}.json`;
}

/**
 * Remet les données à l'utilisateur.
 *  - Web : feuille de partage du navigateur si disponible, sinon téléchargement du fichier.
 *  - Natif : feuille de partage du système (e-mail, messagerie, notes, cloud…) avec le texte JSON.
 */
async function livrer(nom: string, contenu: string): Promise<void> {
  if (Platform.OS === 'web') {
    const fichier = new File([contenu], nom, { type: 'application/json' });
    const nav: any = navigator;
    if (nav.canShare && nav.canShare({ files: [fichier] })) {
      try {
        await nav.share({ files: [fichier], title: 'Mes données Proserpine' });
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') return; // feuille refermée : pas une erreur
      }
    }
    const adresse = URL.createObjectURL(fichier);
    const lien = document.createElement('a');
    lien.href = adresse;
    lien.download = nom;
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    setTimeout(() => URL.revokeObjectURL(adresse), 1000);
    return;
  }
  await Share.share({ title: nom, message: contenu });
}

/** Exporte toutes les données de l'utilisateur connecté. */
export async function exporterMesDonnees(user: { uid: string; email: string | null }) {
  try {
    const donnees = await construireExport(user.uid, user.email);
    await livrer(nomFichierExport(), JSON.stringify(donnees, null, 2));
    return { success: true as const };
  } catch {
    return { success: false as const, error: "L'export a échoué. Vérifiez votre connexion puis réessayez." };
  }
}
