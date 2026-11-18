import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import authService from "../services/AuthService";
import notify from "../services/toast";
import type { ApiError } from "../services/ApiClient";
import { useAuth } from "../context/AuthContext";
import { AuthBackground } from "../components/auth/AuthBackground";
import { AuthHeader } from "../components/auth/AuthHeader";
import { AuthDivider, AuthSocialButtons } from "../components/auth/AuthSocialButtons";

// ─── Types ────────────────────────────────────────────────────────────────────

type LoginView = "social" | "email";

interface LoginProps {
  onLogin?: () => void;
}

const labelClass = "mb-1.5 block text-sm font-semibold text-gray-700";
const inputClass =
  "w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500";
const passwordInputClass = `${inputClass} pr-11`;

// ─── Component ────────────────────────────────────────────────────────────────

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithGoogle, refreshUser } = useAuth();
  const redirectTo: string = (location.state as { redirect?: string } | null)?.redirect ?? '';

  const [view, setView] = useState<LoginView>("social");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleEmailLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError("Por favor completa todos los campos.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await authService.login({ identifier, password });
      notify.success("¡Bienvenido de nuevo!", "Sesión iniciada correctamente.");
      refreshUser();
      onLogin?.();
      const role = result.user?.role_name;
      if (redirectTo) {
        navigate(redirectTo);
      } else if (role === 'Owner' || role === 'Manager') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (e) {
      const err = e as ApiError;
      const msg = err.message ?? "Error al iniciar sesión.";
      setError(msg);
      notify.error("Error al ingresar", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      notify.success("¡Bienvenido!", "Sesión iniciada con Google.");
      onLogin?.();
      navigate("/");
    } catch (e) {
      const err = e as ApiError & { code?: string };
      // El usuario cerró el popup; no mostrar error
      if (err?.code === "auth/popup-closed-by-user") return;
      const msg = err.message ?? "Error al iniciar sesión con Google.";
      setError(msg);
      notify.error("Error con Google", msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleUnavailableProvider = (provider: string) => {
    notify.error(
      `${provider} no disponible`,
      "Por ahora solo está disponible Google. ¡Próximamente más opciones!"
    );
  };

  return (
    <AuthBackground>
      <div className="relative z-10 mx-auto w-full max-w-md rounded-3xl bg-white/95 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <AuthHeader
          title="¡Bienvenido de Nuevo!"
          subtitle="Inicia sesión para reservar tus canchas favoritas"
        />

        {view === "social" ? (
          <>
            <AuthSocialButtons
              googleLabel="Continuar con Google"
              instagramLabel="Continuar con Instagram"
              tiktokLabel="Continuar con TikTok"
              googleLoading={googleLoading}
              onGoogle={handleGoogleLogin}
              onUnavailable={handleUnavailableProvider}
            />

            <AuthDivider />

            <button
              type="button"
              onClick={() => setView("email")}
              className="flex w-full items-center justify-center gap-2.5 rounded-full bg-green-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-green-500/20 transition-all duration-150 hover:bg-green-600 hover:shadow-green-500/30"
            >
              <Mail className="h-4 w-4" />
              Continuar con correo
            </button>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Correo electrónico</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="tu@correo.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Contraseña</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
                  placeholder="••••••••"
                  className={passwordInputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-sm">
              <button
                type="button"
                onClick={() => { setView("social"); setError(null); }}
                className="inline-flex items-center gap-1.5 font-semibold text-green-600 transition-colors hover:text-green-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>
              <Link to="/forgot-password" className="text-gray-500 transition-colors hover:text-gray-700">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleEmailLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2.5 rounded-full bg-green-500 py-3 text-sm font-bold text-white shadow-lg shadow-green-500/20 transition-all duration-150 hover:bg-green-600 hover:shadow-green-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </div>
        )}

        <div className="mt-6 space-y-3 text-center">
          <p className="text-sm text-gray-500">
            ¿No tienes una cuenta?{" "}
            <Link to="/register" className="font-bold text-green-600 transition-colors hover:text-green-700">
              Regístrate
            </Link>
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 transition-colors hover:text-gray-600"
          >
            Explorar canchas sin iniciar sesión
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </AuthBackground>
  );
};

export default Login;
