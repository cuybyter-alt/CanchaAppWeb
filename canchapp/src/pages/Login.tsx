import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { SiInstagram, SiTiktok } from "react-icons/si";
import { MdEmail, MdVisibility, MdVisibilityOff } from "react-icons/md";
import authService from "../services/AuthService";
import notify from "../services/toast";
import type { ApiError } from "../services/ApiClient";

// ─── Icons ────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

type LoginView = "social" | "email";

interface LoginProps {
  onLogin?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [view, setView] = useState<LoginView>("social");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError("Por favor completa todos los campos.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.login({ identifier, password });
      notify.success("¡Bienvenido de nuevo!", "Sesión iniciada correctamente.");
      onLogin?.();
      navigate("/");
    } catch (e) {
      const err = e as ApiError;
      const msg = err.message ?? "Error al iniciar sesión.";
      setError(msg);
      notify.error("Error al ingresar", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFirebaseLogin = async (provider: string) => {
    console.log(`OAuth con ${provider} — integrar Firebase SDK`);
  };

  const Logo = () => (
    <div className="flex flex-col items-center mb-6">
      <div className="w-16 h-16 rounded-2xl bg-black border-2 border-green-500 flex items-center justify-center shadow-lg shadow-green-500/20 mb-4">
        <img src="/cuypequeniologo.png" alt="Canchapp" className="w-12 h-12 object-contain" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
        Bienvenido de Nuevo
      </h1>
      <p className="text-sm text-gray-500 mt-1 text-center">
        Inicia sesión para reservar tus canchas favoritas
      </p>
    </div>
  );

  const Divider = () => (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200" />
      </div>
      <div className="relative flex justify-center">
        <span className="px-3 bg-white text-xs text-gray-400 font-medium">O</span>
      </div>
    </div>
  );

  // ── Vista 1: Selección de método ──────────────────────────────────────────
  if (view === "social") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f0] p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm px-8 py-10">
          <Logo />

          <div className="space-y-3">
            {/* Google */}
            <button
              onClick={() => handleFirebaseLogin("Google")}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 shadow-sm"
            >
              <FcGoogle size={20} />
              Continuar con Google
            </button>

            {/* Instagram */}
            <button
              onClick={() => handleFirebaseLogin("Instagram")}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-full text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 hover:shadow-md"
              style={{ background: "linear-gradient(90deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}
            >
              <SiInstagram size={20} />
              Continuar con Instagram
            </button>

            {/* TikTok */}
            <button
              onClick={() => handleFirebaseLogin("TikTok")}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black rounded-full text-sm font-semibold text-white hover:bg-gray-900 hover:shadow-md transition-all duration-150"
            >
              <SiTiktok size={20} />
              Continuar con TikTok
            </button>

            <Divider />

            {/* Email */}
            <button
              onClick={() => setView("email")}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-green-500 rounded-full text-sm font-semibold text-white hover:bg-green-600 hover:shadow-md hover:shadow-green-500/30 transition-all duration-150"
            >
              <MdEmail size={20} />
              Continuar con Correo
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿No tienes una cuenta?{" "}
            <Link to="/register" className="font-semibold text-green-600 hover:text-green-700">
              Regístrate
            </Link>
          </p>
          <p className="text-center mt-3">
            <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Explorar canchas sin iniciar sesión →
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Vista 2: Login con correo ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f0] p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm px-8 py-10">
        <Logo />

        <div className="space-y-4">
          {/* Correo / Identificador */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Correo Electrónico
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
              </button>
            </div>
          </div>

          {/* Links: Volver / Olvidaste */}
          <div className="flex items-center justify-between text-sm pt-1">
            <button
              onClick={() => { setView("social"); setError(null); }}
              className="text-green-600 font-medium hover:text-green-700 transition-colors"
            >
              ← Volver
            </button>
            <button className="text-gray-500 hover:text-gray-700 transition-colors">
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleEmailLogin}
            disabled={loading}
            className="w-full py-3 bg-green-500 rounded-full text-sm font-semibold text-white hover:bg-green-600 hover:shadow-md hover:shadow-green-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 mt-1"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿No tienes una cuenta?{" "}
          <Link to="/register" className="font-semibold text-green-600 hover:text-green-700">
            Regístrate
          </Link>
        </p>
        <p className="text-center mt-3">
          <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Explorar canchas sin iniciar sesión →
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;