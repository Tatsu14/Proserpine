/**
 * UI PARTAGÉE — équivalent de `js/ui.js` de la version en ligne :
 *   showToast, showConfirmModal, showInfoModal, showLoader / hideLoader.
 *
 * Tout est dessiné DANS le cadre de l'app (vues en position absolue) et non dans
 * un <Modal> système : sur ordinateur, les fenêtres restent ainsi à l'intérieur du
 * cadre « téléphone », comme en ligne.
 *
 * Usage :  const ui = useUi();  ui.toast('Message', 'success');
 *          ui.confirmer({ titre, message, confirmer, annuler, onConfirmer });
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/texte';

import { BoutonPrimaire, BoutonSecondaire } from '@/components/ui/boutons';
import { couleurs, ombre, police, rayon, tailleTexte } from '@/design/tokens';

type TypeToast = 'success' | 'error';
type Toast = { id: number; message: string; type: TypeToast };

type Dialogue = {
  titre: string;
  message: string;
  /** Texte du bouton principal. */
  confirmer: string;
  /** Texte du bouton secondaire ; absent = fenêtre d'information (un seul bouton). */
  annuler?: string;
  /** Bouton principal en rouge (déconnexion, suppression). */
  danger?: boolean;
  onConfirmer?: () => void;
  onAnnuler?: () => void;
};

type Ui = {
  toast: (message: string, type?: TypeToast) => void;
  confirmer: (d: Omit<Dialogue, 'annuler'> & { annuler: string }) => void;
  informer: (d: { titre: string; message: string; bouton: string; onFermer?: () => void }) => void;
  chargement: (texte: string | null) => void;
};

const UiContext = createContext<Ui | null>(null);

export function useUi(): Ui {
  const ui = useContext(UiContext);
  if (!ui) throw new Error('useUi doit être utilisé dans <UiProvider>');
  return ui;
}

/** Un toast : glisse depuis le haut, reste 3 s, puis disparaît. */
function ToastVue({ toast }: { toast: Toast }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    const t = setTimeout(() => Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }).start(), 2700);
    return () => clearTimeout(t);
  }, [anim]);
  return (
    <Animated.View
      style={[
        styles.toast,
        { borderLeftColor: toast.type === 'success' ? couleurs.statutBon : couleurs.statutDanger },
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
      ]}
    >
      <Text style={styles.toastTexte}>{toast.message}</Text>
    </Animated.View>
  );
}

/** La fenêtre de dialogue : voile sombre + carte blanche qui monte de 20 px. */
function DialogueVue({ d, fermer }: { d: Dialogue; fermer: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [anim]);
  return (
    <Animated.View style={[styles.voile, { opacity: anim }]}>
      <Animated.View
        accessibilityViewIsModal
        style={[styles.carte, { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}
      >
        <Text style={styles.titre}>{d.titre}</Text>
        <Text style={styles.texte}>{d.message}</Text>
        <View style={styles.actions}>
          <BoutonPrimaire
            fond={d.danger ? couleurs.statutDanger : undefined}
            onPress={() => {
              fermer();
              d.onConfirmer?.();
            }}
          >
            {d.confirmer}
          </BoutonPrimaire>
          {d.annuler ? (
            <BoutonSecondaire
              onPress={() => {
                fermer();
                d.onAnnuler?.();
              }}
            >
              {d.annuler}
            </BoutonSecondaire>
          ) : null}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [texteChargement, setTexteChargement] = useState<string | null>(null);
  const compteur = useRef(0);

  const toast = useCallback((message: string, type: TypeToast = 'success') => {
    const id = ++compteur.current;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3300);
  }, []);

  const confirmer = useCallback<Ui['confirmer']>((d) => setDialogue(d), []);
  const informer = useCallback<Ui['informer']>(
    (d) => setDialogue({ titre: d.titre, message: d.message, confirmer: d.bouton, onConfirmer: d.onFermer }),
    [],
  );
  const chargement = useCallback((texte: string | null) => setTexteChargement(texte), []);

  const valeur = useMemo<Ui>(() => ({ toast, confirmer, informer, chargement }), [toast, confirmer, informer, chargement]);

  return (
    <UiContext.Provider value={valeur}>
      {children}

      {dialogue ? <DialogueVue d={dialogue} fermer={() => setDialogue(null)} /> : null}

      {texteChargement !== null ? (
        <View style={styles.chargement} accessibilityRole="progressbar">
          <ActivityIndicator size="large" color={couleurs.marque} />
          <Text style={styles.chargementTexte}>{texteChargement}</Text>
        </View>
      ) : null}

      <View pointerEvents="none" style={styles.toasts}>
        {toasts.map((t) => (
          <ToastVue key={t.id} toast={t} />
        ))}
      </View>
    </UiContext.Provider>
  );
}

const styles = StyleSheet.create({
  // .modal-overlay
  voile: {
    ...StyleSheet.absoluteFill,
    backgroundColor: couleurs.voileMoyen,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 1000,
  },
  // .modal-content
  carte: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: couleurs.fondCarte,
    borderRadius: rayon.xl2,
    padding: 24,
    boxShadow: ombre.lg,
  },
  titre: { fontFamily: police.extraGras, fontSize: tailleTexte.lg, color: couleurs.texte, marginBottom: 8 },
  texte: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteAttenue, marginBottom: 24, lineHeight: 18 },
  actions: { gap: 12 },
  // .full-loader-overlay
  chargement: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1200,
    gap: 16,
  },
  chargementTexte: { fontFamily: police.gras, fontSize: tailleTexte.sm, color: couleurs.marqueFoncee },
  // .toast-container / .toast
  toasts: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 320,
    gap: 8,
    zIndex: 1100,
  },
  toast: {
    backgroundColor: couleurs.marqueSombre,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderLeftWidth: 4,
    boxShadow: ombre.md,
  },
  toastTexte: { fontFamily: police.normal, fontSize: tailleTexte.sm, color: couleurs.texteSurSombre },
});
