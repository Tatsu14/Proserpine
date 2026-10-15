/**
 * reglages.tsx — Réglages d'affichage de l'utilisateur (repris de `js/reglages.js` de ProserpineV2).
 *
 * Deux réglages, mémorisés sur l'appareil (AsyncStorage, pas Firestore) :
 *   1. la taille du texte (normale / grande / très grande) ;
 *   2. l'affichage de l'indice d'impact (activé par défaut).
 *
 * Masquer l'indice ne change RIEN au calcul ni à l'historique : le score continue d'être
 * calculé et enregistré, seul l'affichage change. Si l'utilisateur réactive l'indice, tous
 * ses produits réapparaissent avec leur note.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type TailleTexte = 'normale' | 'grande' | 'tres-grande';
export const TAILLES_TEXTE: { id: TailleTexte; libelle: string }[] = [
  { id: 'normale', libelle: 'Normale' },
  { id: 'grande', libelle: 'Grande' },
  { id: 'tres-grande', libelle: 'Très grande' },
];

// Facteur appliqué à toutes les tailles de texte (comme le « 112,5 % » / « 125 % » du site).
const ECHELLES: Record<TailleTexte, number> = { normale: 1, grande: 1.125, 'tres-grande': 1.25 };

const CLE_TAILLE = 'tailleTexte';
const CLE_INDICE = 'indiceImpactActif';

type Reglages = {
  tailleTexte: TailleTexte;
  echelle: number;
  indiceActif: boolean;
  definirTailleTexte: (t: TailleTexte) => void;
  definirIndiceActif: (actif: boolean) => void;
};

const ContexteReglages = createContext<Reglages>({
  tailleTexte: 'normale',
  echelle: 1,
  indiceActif: true,
  definirTailleTexte: () => {},
  definirIndiceActif: () => {},
});

export function ReglagesProvider({ children }: { children: ReactNode }) {
  const [tailleTexte, setTaille] = useState<TailleTexte>('normale');
  const [indiceActif, setIndice] = useState(true);

  // Lecture au démarrage. Une valeur absente ou inconnue retombe sur le défaut (taille normale, indice affiché).
  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem(CLE_TAILLE);
        if (t && t in ECHELLES) setTaille(t as TailleTexte);
        // Seule la valeur exacte 'false' désactive l'indice.
        setIndice((await AsyncStorage.getItem(CLE_INDICE)) !== 'false');
      } catch {
        // Stockage indisponible : on garde les valeurs par défaut.
      }
    })();
  }, []);

  const definirTailleTexte = useCallback((t: TailleTexte) => {
    setTaille(t);
    AsyncStorage.setItem(CLE_TAILLE, t).catch(() => {});
  }, []);

  const definirIndiceActif = useCallback((actif: boolean) => {
    setIndice(actif);
    AsyncStorage.setItem(CLE_INDICE, actif ? 'true' : 'false').catch(() => {});
  }, []);

  const valeur = useMemo(
    () => ({ tailleTexte, echelle: ECHELLES[tailleTexte], indiceActif, definirTailleTexte, definirIndiceActif }),
    [tailleTexte, indiceActif, definirTailleTexte, definirIndiceActif],
  );
  return <ContexteReglages.Provider value={valeur}>{children}</ContexteReglages.Provider>;
}

export function useReglages(): Reglages {
  return useContext(ContexteReglages);
}
