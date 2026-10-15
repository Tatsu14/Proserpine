/**
 * auth.tsx — Contexte d'authentification global.
 * S'abonne à onAuthStateChanged une seule fois et expose l'utilisateur courant
 * + l'état d'initialisation à toute l'application. C'est lui qui pilote la
 * redirection automatique entre la zone connectée et les écrans de connexion.
 */
import { onAuthStateChanged, type User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '@/services/firebase';

type AuthState = {
  user: User | null;
  initializing: boolean;
};

const AuthContext = createContext<AuthState>({ user: null, initializing: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  return <AuthContext.Provider value={{ user, initializing }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
