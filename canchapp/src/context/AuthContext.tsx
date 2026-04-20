/**
 * AuthContext
 *
 * Provee el estado de autenticación a toda la app.
 * - Escucha onAuthStateChanged de Firebase (persiste la sesión automáticamente).
 * - Al detectar un usuario de Firebase, llama al backend con el ID Token
 *   para obtener los JWT propios de CanchApp.
 * - Expone user (Django), firebaseUser, loading, loginWithGoogle y logout.
 */

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import {
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    type User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import authService, {
    tokenStorage,
    type UserOutput,
} from "../services/AuthService";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Usuario del backend Django (null si no autenticado) */
    user: UserOutput | null;
  /** Usuario de Firebase (null si no autenticado) */
    firebaseUser: FirebaseUser | null;
  /** true mientras se verifica la sesión inicial */
    loading: boolean;
  /** Abre el popup de Google y sincroniza con el backend */
    loginWithGoogle: () => Promise<void>;
  /** Cierra sesión en Firebase y limpia los tokens locales */
    logout: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [user, setUser] = useState<UserOutput | null>(tokenStorage.getUser());
    const [loading, setLoading] = useState(true);

  // Escucha cambios de sesión de Firebase (ej: refresh de página)
    useEffect(() => {
    if (!auth) {
      // Firebase no configurado — la app funciona sin Google sign-in
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        setLoading(true);

    if (fbUser) {
        setFirebaseUser(fbUser);

        // Si ya tenemos tokens válidos no necesitamos volver a autenticar
        if (!authService.isAuthenticated()) {
            try {
            const idToken = await fbUser.getIdToken();
            const tokenPair = await authService.firebaseAuth(idToken, "Player");
            setUser(tokenPair.user);
            } catch (err) {
            console.error(
                "[AuthContext] Error sincronizando con backend:",
                err,
            );
            // Si falla el backend, cerramos también la sesión de Firebase
            if (auth) await signOut(auth);
            setFirebaseUser(null);
            setUser(null);
            }
        } else {
          // Tokens ya presentes, solo cargamos el user guardado
            setUser(tokenStorage.getUser());
        }
        } else {
        // Firebase cerró sesión → limpiamos todo
        setFirebaseUser(null);
        setUser(null);
        tokenStorage.clear();
        }

        setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ── Acciones ────────────────────────────────────────────────────────────────

  const loginWithGoogle = async () => {
    if (!auth || !googleProvider) {
      throw new Error('Google sign-in no está disponible: Firebase no configurado.');
    }
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      tokenStorage.clear();
    }
    if (auth) await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, loginWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
