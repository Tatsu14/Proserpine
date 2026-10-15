/**
 * auth.tsx — Contexte d'authentification global.
 * S'abonne à onAuthStateChanged une seule fois et expose l'utilisateur courant
 * + l'état d'initialisation à toute l'application. C'est lui qui pilote la
 * redirection automatique entre la zone connectée et les écrans de connexion.
 *
 * `operationEnCours` reproduit le drapeau `skipNextAuthRedirect` de la version en
 * ligne : pendant une inscription ou une connexion Google, Firebase connecte
 * l'utilisateur AVANT que ses données soient écrites ; on empêche alors la
 * redirection automatique vers l'accueil, car l'écran gère lui-même la suite
 * (vers l'onboarding pour un nouveau compte).
 */
import { onAuthStateChanged, type User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '@/services/firebase';

type AuthState = {
  user: User | null;
  initializing: boolean;
  operationEnCours: boolean;
  setOperationEnCours: (v: boolean) => void;
};

const AuthContext = createContext<AuthState>({
  user: null,
  initializing: true,
  operationEnCours: false,
  setOperationEnCours: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [operationEnCours, setOperationEnCours] = useState(false);

  useEffect(() => {
    // Sécurité (comme en ligne) : si Firebase ne répond pas au bout de 3 s, on lève l'écran de démarrage.
    const securite = setTimeout(() => setInitializing(false), 3000);
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitializing(false);
    });
    return () => {
      clearTimeout(securite);
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing, operationEnCours, setOperationEnCours }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
