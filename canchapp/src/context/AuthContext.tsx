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
  useCallback,
    useEffect,
    useRef,
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
    syncCurrentUserTimezone,
    tokenStorage,
    type AuthRole,
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
    loginWithGoogle: (roleName?: AuthRole) => Promise<UserOutput>;
  /** Recarga el usuario almacenado desde localStorage */
    refreshUser: () => void;
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
    const googleAuthInProgressRef = useRef(false);

  // Escucha cambios de sesión de Firebase (ej: refresh de página)
    useEffect(() => {
    if (!auth) {
      // Firebase no configurado — la app funciona sin Google sign-in
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        // Un flujo explícito de Google ya está manejando el intercambio
        // con el backend; evitar autenticaciones duplicadas o con rol Player.
        if (googleAuthInProgressRef.current) {
          setFirebaseUser(fbUser);
          return;
        }

        setLoading(true);

    if (fbUser) {
        setFirebaseUser(fbUser);

        // Si ya tenemos tokens válidos no necesitamos volver a autenticar
        if (!authService.isAuthenticated()) {
            try {
            const idToken = await fbUser.getIdToken();
            // Restauración de sesión: no forzar un rol nuevo.
            const tokenPair = await authService.firebaseAuth(idToken);
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
        // Firebase no tiene sesión activa.
        // Solo limpiar si tampoco hay tokens del backend (login por email/contraseña).
        // Si hay tokens de backend, el usuario inició sesión sin Google → preservar estado.
        setFirebaseUser(null);
        if (!authService.isAuthenticated()) {
          setUser(null);
          tokenStorage.clear();
        } else {
          setUser(tokenStorage.getUser());
        }
        }

        setLoading(false);
    });

    return unsubscribe;
  }, []);

    const timezoneSyncRef = useRef<string | null>(null);

    useEffect(() => {
    if (loading || !user?.user_id) return;
    if (timezoneSyncRef.current === user.user_id) return;

    timezoneSyncRef.current = user.user_id;
    let cancelled = false;

    void syncCurrentUserTimezone(user)
        .then((updated) => {
        if (!cancelled && updated.timezone !== user.timezone) {
            setUser(updated);
        }
        })
        .catch((err) => {
        console.error("[AuthContext] Error sincronizando zona horaria:", err);
        });

    return () => {
        cancelled = true;
    };
    }, [loading, user]);

  // ── Acciones ────────────────────────────────────────────────────────────────

  const loginWithGoogle = useCallback(async (roleName?: AuthRole): Promise<UserOutput> => {
    if (!auth || !googleProvider) {
      throw new Error('Google sign-in no está disponible: Firebase no configurado.');
    }

    googleAuthInProgressRef.current = true;
    setLoading(true);
    let signedInWithFirebase = false;

    try {
      const credential = await signInWithPopup(auth, googleProvider);
      signedInWithFirebase = true;
      setFirebaseUser(credential.user);

      const idToken = await credential.user.getIdToken();
      const tokenPair = await authService.firebaseAuth(idToken, roleName);
      setUser(tokenPair.user);
      return tokenPair.user;
    } catch (err) {
      const code = (err as { code?: string }).code;
      const cancelled =
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request";

      if (signedInWithFirebase && !cancelled) {
        if (auth) await signOut(auth);
        tokenStorage.clear();
        setFirebaseUser(null);
        setUser(null);
      }
      throw err;
    } finally {
      googleAuthInProgressRef.current = false;
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(() => {
    setUser(tokenStorage.getUser());
  }, []);

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
      value={{ user, firebaseUser, loading, loginWithGoogle, refreshUser, logout }}
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
