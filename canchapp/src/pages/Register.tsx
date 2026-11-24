import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  AtSign,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  UserPlus,
} from "lucide-react";
import authService from "../services/AuthService";
import notify from "../services/toast";
import type { ApiError } from "../services/ApiClient";
import { useAuth } from "../context/AuthContext";
import { AuthBackground } from "../components/auth/AuthBackground";
import { AuthHeader } from "../components/auth/AuthHeader";
import { AuthDivider, AuthSocialButtons } from "../components/auth/AuthSocialButtons";

// ─── Types ────────────────────────────────────────────────────────────────────

type RegisterView = "social" | "form";
type Role = "Player" | "Owner";

const FIELD_LABELS: Record<string, string> = {
  email: "Correo electrónico",
  username: "Nombre de usuario",
  password: "Contraseña",
  f_name: "Nombre",
  l_name: "Apellido",
  role_names: "Rol",
};

function formatRegisterError(err: ApiError): string {
  const details = err.details;
  if (details && Object.keys(details).length > 0) {
    const lines = Object.entries(details).flatMap(([field, value]) => {
      const label = FIELD_LABELS[field] ?? field;
      const messages = Array.isArray(value) ? value : [String(value)];
      return messages.map((m) => `${label}: ${m}`);
    });
    if (lines.length > 0) return lines.join(" ");
  }
  return err.message ?? "Error al crear la cuenta.";
}

const labelClass = "mb-1.5 block text-sm font-semibold text-gray-700";
const inputClass =
  "w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500";
const passwordInputClass = `${inputClass} pr-11`;

// ─── Role Selector ────────────────────────────────────────────────────────────

const RoleSelector = ({
  selected,
  onChange,
}: {
  selected: Role;
  onChange: (r: Role) => void;
}) => (
  <div className="mb-6 flex gap-1 rounded-2xl bg-gray-100 p-1">
    <button
      type="button"
      onClick={() => onChange("Player")}
      aria-pressed={selected === "Player"}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
        selected === "Player"
          ? "bg-white text-green-600 shadow-sm"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      <User className="h-4 w-4" />
      Jugador
    </button>
    <button
      type="button"
      onClick={() => onChange("Owner")}
      aria-pressed={selected === "Owner"}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
        selected === "Owner"
          ? "bg-white text-green-600 shadow-sm"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      <Building2 className="h-4 w-4" />
      Administrador
    </button>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

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
      navigate("/login", { state: { registered: true } });
    } catch (e) {
      const err = e as ApiError;
      const msg = formatRegisterError(err);
      setError(msg);
      notify.error("Error en el registro", msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Registro / login con Google.
   * El backend recibe el ID Token de Firebase y crea el usuario automáticamente
   * si no existe, con el rol elegido. Si ya existe, simplemente autentica.
   */
  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const loggedUser = await loginWithGoogle(role);
      const isAdmin =
        loggedUser.role_name === "Owner" || loggedUser.role_name === "Manager";

      if (role === "Owner" && !isAdmin) {
        notify.info(
          "Rol conservado",
          "Tu cuenta ya existía como Jugador; mantuvimos el rol actual."
        );
      } else {
        notify.success(
          "¡Bienvenido!",
          `Sesión iniciada como ${isAdmin ? "Administrador" : "Jugador"}.`
        );
      }

      navigate(isAdmin ? "/admin" : "/");
    } catch (e) {
      const err = e as ApiError & { code?: string };
      if (err?.code === "auth/popup-closed-by-user") return;
      const msg = err.message ?? "Error al registrarse con Google.";
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

  const ErrorBox = () => {
    if (!error) return null;
    return (
      <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  };

  return (
    <AuthBackground>
      <div className="relative z-10 mx-auto w-full max-w-lg rounded-3xl bg-white/95 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <AuthHeader
          title="Crea tu cuenta"
          subtitle="Únete a CanchApp y gestiona o reserva tus partidos"
        />

        <RoleSelector selected={role} onChange={setRole} />

        {view === "social" ? (
          <>
            <AuthSocialButtons
              googleLabel="Registrarse con Google"
              instagramLabel="Registrarse con Instagram"
              tiktokLabel="Registrarse con TikTok"
              googleLoading={googleLoading}
              onGoogle={handleGoogleRegister}
              onUnavailable={handleUnavailableProvider}
            />

            <AuthDivider />

            <button
              type="button"
              onClick={() => setView("form")}
              className="flex w-full items-center justify-center gap-2.5 rounded-full bg-green-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-green-500/20 transition-all duration-150 hover:bg-green-600 hover:shadow-green-500/30"
            >
              <Mail className="h-4 w-4" />
              Registrarse con correo
            </button>

            <div className="mt-4">
              <ErrorBox />
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Nombre completo</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative w-full">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={fName}
                    onChange={(e) => setFName(e.target.value)}
                    placeholder="Juan"
                    className={inputClass}
                  />
                </div>
                <div className="relative w-full">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={lName}
                    onChange={(e) => setLName(e.target.value)}
                    placeholder="Pérez"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Nombre de usuario</label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="juanperez99"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Correo electrónico</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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

            <div>
              <label className={labelClass}>Confirmar contraseña</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                  placeholder="••••••••"
                  className={passwordInputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? "Ocultar confirmación de contraseña" : "Mostrar confirmación de contraseña"}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setView("social"); setError(null); }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 transition-colors hover:text-green-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>

            <ErrorBox />

            <button
              type="button"
              onClick={handleRegister}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2.5 rounded-full bg-green-500 py-3 text-sm font-bold text-white shadow-lg shadow-green-500/20 transition-all duration-150 hover:bg-green-600 hover:shadow-green-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>

            <p className="text-center text-xs leading-relaxed text-gray-400">
              Al registrarte, aceptas nuestros{" "}
              <button type="button" className="text-gray-500 underline transition-colors hover:text-gray-700">
                Términos de Servicio
              </button>{" "}
              y{" "}
              <button type="button" className="text-gray-500 underline transition-colors hover:text-gray-700">
                Política de Privacidad
              </button>
            </p>
          </div>
        )}

        <div className="mt-6 space-y-3 text-center">
          <p className="text-sm text-gray-500">
            ¿Ya tienes una cuenta?{" "}
            <Link to="/login" className="font-bold text-green-600 transition-colors hover:text-green-700">
              Inicia sesión
            </Link>
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 transition-colors hover:text-gray-600"
          >
            Explorar canchas sin registrarse
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </AuthBackground>
  );
};

export default Register;
