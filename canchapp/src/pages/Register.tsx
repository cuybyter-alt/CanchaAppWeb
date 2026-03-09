import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { SiInstagram, SiTiktok } from "react-icons/si";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import authService from "../services/AuthService";
import notify from "../services/toast";
import type { ApiError } from "../services/ApiClient";

// ─── Icons ────────────────────────────────────────────────────────────────────

// ─── Icons de rol ─────────────────────────────────────────────────────────────

const PlayerIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
  </svg>
);

const OwnerIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="10" width="18" height="11" rx="2"/>
    <path d="M7 10V7a5 5 0 0110 0v3"/>
    <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

type RegisterView = "social" | "form";
type Role = "Player" | "Owner";

// ─── Role Selector ────────────────────────────────────────────────────────────

const RoleSelector = ({
  selected,
  onChange,
}: {
  selected: Role;
  onChange: (r: Role) => void;
}) => (
  <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl mb-6">
    <button
      onClick={() => onChange("Player")}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
        selected === "Player"
          ? "bg-white text-green-600 shadow-sm"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      <PlayerIcon />
      Jugador
    </button>
    <button
      onClick={() => onChange("Owner")}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
        selected === "Owner"
          ? "bg-white text-green-600 shadow-sm"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      <OwnerIcon />
      Dueño de Cancha
    </button>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<RegisterView>("social");
  const [role, setRole] = useState<Role>("Player");

  // Form state
  const [fName, setFName] = useState("");
  const [lName, setLName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);

    if (!fName.trim() || !lName.trim() || !email.trim() || !username.trim() || !password || !confirmPassword) {
      setError("Por favor completa todos los campos.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await authService.register({
        f_name: fName.trim(),
        l_name: lName.trim(),
        email: email.trim(),
        username: username.trim(),
        password,
        role_name: role,
      });
      notify.success("¡Cuenta creada!", "Ya puedes iniciar sesión.");
      // Registro exitoso → redirigir a login
      navigate("/login", { state: { registered: true } });
    } catch (e) {
      const err = e as ApiError;
      const msg = err.message ?? "Error al crear la cuenta.";
      setError(msg);
      notify.error("Error en el registro", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFirebaseRegister = (provider: string) => {
    console.log(`OAuth registro con ${provider} — integrar Firebase SDK`);
  };

  const Logo = () => (
    <div className="flex flex-col items-center mb-6">
      <div className="w-16 h-16 rounded-2xl bg-black border-2 border-green-500 flex items-center justify-center shadow-lg shadow-green-500/20 mb-4">
        <img src="/cuypequeniologo.png" alt="Canchapp" className="w-12 h-12 object-contain" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Crear Cuenta</h1>
      <p className="text-sm text-gray-500 mt-1 text-center">
        Únete a miles de jugadores encontrando su cancha perfecta
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

          <RoleSelector selected={role} onChange={setRole} />

          <div className="space-y-3">
            {/* Google */}
            <button
              onClick={() => handleFirebaseRegister("Google")}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 shadow-sm"
            >
              <FcGoogle size={20} />
              Registrarse con Google
            </button>

            {/* Instagram */}
            <button
              onClick={() => handleFirebaseRegister("Instagram")}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-full text-sm font-semibold text-white hover:opacity-90 hover:shadow-md transition-all duration-150"
              style={{ background: "linear-gradient(90deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}
            >
              <SiInstagram size={20} />
              Registrarse con Instagram
            </button>

            {/* TikTok */}
            <button
              onClick={() => handleFirebaseRegister("TikTok")}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black rounded-full text-sm font-semibold text-white hover:bg-gray-900 hover:shadow-md transition-all duration-150"
            >
              <SiTiktok size={20} />
              Registrarse con TikTok
            </button>

            <Divider />

            {/* Email */}
            <button
              onClick={() => setView("form")}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-green-500 rounded-full text-sm font-semibold text-white hover:bg-green-600 hover:shadow-md hover:shadow-green-500/30 transition-all duration-150"
            >
              Registrarse con Correo
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿Ya tienes una cuenta?{" "}
            <Link to="/login" className="font-semibold text-green-600 hover:text-green-700">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Vista 2: Formulario de registro ──────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f0] p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm px-8 py-10">
        <Logo />

        <RoleSelector selected={role} onChange={setRole} />

        <div className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre Completo
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={fName}
                onChange={(e) => setFName(e.target.value)}
                placeholder="Juan"
                className="w-1/2 px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
              />
              <input
                type="text"
                value={lName}
                onChange={(e) => setLName(e.target.value)}
                placeholder="Pérez"
                className="w-1/2 px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre de usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="juanperez99"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          {/* Confirmar Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all pr-11"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirm ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
              </button>
            </div>
          </div>

          {/* Volver */}
          <button
            onClick={() => { setView("social"); setError(null); }}
            className="text-sm text-green-600 font-medium hover:text-green-700 transition-colors"
          >
            ← Volver
          </button>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-3 bg-green-500 rounded-full text-sm font-semibold text-white hover:bg-green-600 hover:shadow-md hover:shadow-green-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
          >
            {loading ? "Creando cuenta..." : "Crear Cuenta"}
          </button>

          <p className="text-center text-xs text-gray-400 leading-relaxed">
            Al registrarte, aceptas nuestros{" "}
            <button className="text-gray-500 hover:text-gray-700 underline">Términos de Servicio</button>
            {" "}y{" "}
            <button className="text-gray-500 hover:text-gray-700 underline">Política de Privacidad</button>
          </p>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          ¿Ya tienes una cuenta?{" "}
          <Link to="/login" className="font-semibold text-green-600 hover:text-green-700">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;