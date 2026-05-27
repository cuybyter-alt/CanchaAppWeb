import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import { CheckCircle } from "lucide-react";
import authService from "../services/AuthService";
import notify from "../services/toast";
import type { ApiError } from "../services/ApiClient";

// ─── Types ────────────────────────────────────────────────────────────────────

type ForgotView = "email" | "otp" | "password" | "success";

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo({ subtitle }: { subtitle: string }) {
  return (
    <div className="flex flex-col items-center mb-6">
      <div className="w-16 h-16 rounded-2xl bg-black border-2 border-green-500 flex items-center justify-center shadow-lg shadow-green-500/20 mb-4">
        <img src="/cuypequeniologo.png" alt="Canchapp" className="w-12 h-12 object-contain" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
        Restablecer contraseña
      </h1>
      <p className="text-sm text-gray-500 mt-1 text-center">{subtitle}</p>
    </div>
  );
}

// ─── StepIndicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {([1, 2, 3] as const).map((n) => (
        <React.Fragment key={n}>
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              n < current
                ? "bg-green-500 text-white"
                : n === current
                ? "bg-green-500 text-white ring-4 ring-green-500/20"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {n < current ? <CheckCircle className="w-4 h-4" /> : n}
          </div>
          {n < 3 && (
            <div className={`h-0.5 w-8 rounded-full transition-all ${n < current ? "bg-green-500" : "bg-gray-200"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── OtpInput ─────────────────────────────────────────────────────────────────

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (idx: number, char: string) => {
    const digit = char.replace(/\D/g, "").slice(-1);
    const arr = value.padEnd(6, " ").split("");
    arr[idx] = digit || " ";
    const next = arr.join("").trimEnd();
    onChange(next.replace(/ /g, ""));
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (value[idx]) {
        const arr = value.split("");
        arr[idx] = "";
        onChange(arr.join(""));
      } else if (idx > 0) {
        refs.current[idx - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="w-11 h-12 rounded-xl border border-gray-200 text-center text-lg font-bold text-gray-900
            focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all
            caret-transparent"
        />
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  const [view, setView] = useState<ForgotView>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Step 1: Solicitar OTP ──────────────────────────────────────────────────

  const handleRequestOtp = async () => {
    const trimmed = email.trim();
    if (!trimmed) { setError("Ingresa tu correo electrónico."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Ingresa un correo electrónico válido."); return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.requestPasswordReset(trimmed);
      notify.success("Código enviado", "Revisa tu bandeja de entrada.");
      setView("otp");
    } catch (e) {
      const err = e as ApiError;
      const msg = err.message ?? "Error al enviar el código. Intenta de nuevo.";
      setError(msg);
      notify.error("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verificar OTP ──────────────────────────────────────────────────

  const handleVerifyOtp = async () => {
    if (otp.length < 6) { setError("Ingresa el código de 6 dígitos completo."); return; }
    setLoading(true);
    setError(null);
    try {
      await authService.verifyOtp(email.trim(), otp);
      setView("password");
    } catch (e) {
      const err = e as ApiError;
      const msg = err.message ?? "Código incorrecto o expirado. Intenta de nuevo.";
      setError(msg);
      notify.error("Código inválido", msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Nueva contraseña ───────────────────────────────────────────────

  const handleConfirmReset = async () => {
    if (newPassword.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (newPassword !== confirmPassword) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true);
    setError(null);
    try {
      await authService.confirmPasswordReset(email.trim(), otp, newPassword);
      notify.success("¡Contraseña actualizada!", "Ya puedes iniciar sesión.");
      setView("success");
    } catch (e) {
      const err = e as ApiError;
      const msg = err.message ?? "No se pudo actualizar la contraseña. Intenta de nuevo.";
      setError(msg);
      notify.error("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Layout wrapper ─────────────────────────────────────────────────────────

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f0] p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm px-8 py-10">
        {children}
      </div>
    </div>
  );

  const BackLink = ({ onClick }: { onClick: () => void }) => (
    <p className="text-center text-sm text-gray-500 mt-6">
      <button onClick={onClick} className="font-semibold text-green-600 hover:text-green-700 transition-colors">
        ← Volver
      </button>
    </p>
  );

  // ── Success ────────────────────────────────────────────────────────────────

  if (view === "success") {
    return (
      <Card>
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">¡Contraseña actualizada!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Tu contraseña fue restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-3 bg-green-500 rounded-full text-sm font-semibold text-white hover:bg-green-600 hover:shadow-md hover:shadow-green-500/30 transition-all duration-150"
          >
            Ir al inicio de sesión
          </button>
        </div>
      </Card>
    );
  }

  // ── Step 1: Email ──────────────────────────────────────────────────────────

  if (view === "email") {
    return (
      <Card>
        <Logo subtitle="Ingresa tu correo y te enviaremos un código de 6 dígitos." />
        <StepIndicator current={1} />

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRequestOtp()}
              placeholder="tu@correo.com"
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleRequestOtp}
            disabled={loading}
            className="w-full py-3 bg-green-500 rounded-full text-sm font-semibold text-white hover:bg-green-600 hover:shadow-md hover:shadow-green-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
          >
            {loading ? "Enviando..." : "Enviar código"}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/login" className="font-semibold text-green-600 hover:text-green-700 transition-colors">
            ← Volver al inicio de sesión
          </Link>
        </p>
      </Card>
    );
  }

  // ── Step 2: OTP ────────────────────────────────────────────────────────────

  if (view === "otp") {
    return (
      <Card>
        <Logo subtitle={`Ingresa el código de 6 dígitos enviado a ${email.trim()}.`} />
        <StepIndicator current={2} />

        <div className="space-y-5">
          <OtpInput value={otp} onChange={setOtp} />

          <p className="text-center text-xs text-gray-400">
            ¿No lo ves? Revisa tu carpeta de spam.{" "}
            <button
              onClick={() => { setOtp(""); setError(null); handleRequestOtp(); }}
              className="text-green-600 font-semibold hover:text-green-700 transition-colors"
            >
              Reenviar
            </button>
          </p>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleVerifyOtp}
            disabled={loading || otp.length < 6}
            className="w-full py-3 bg-green-500 rounded-full text-sm font-semibold text-white hover:bg-green-600 hover:shadow-md hover:shadow-green-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
          >
            {loading ? "Verificando..." : "Verificar código"}
          </button>
        </div>

        <BackLink onClick={() => { setOtp(""); setError(null); setView("email"); }} />
      </Card>
    );
  }

  // ── Step 3: Nueva contraseña ───────────────────────────────────────────────

  return (
    <Card>
      <Logo subtitle="Crea una nueva contraseña segura para tu cuenta." />
      <StepIndicator current={3} />

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoFocus
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirmReset()}
              placeholder="Repite tu contraseña"
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

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleConfirmReset}
          disabled={loading}
          className="w-full py-3 bg-green-500 rounded-full text-sm font-semibold text-white hover:bg-green-600 hover:shadow-md hover:shadow-green-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
        >
          {loading ? "Guardando..." : "Guardar contraseña"}
        </button>
      </div>

      <BackLink onClick={() => { setNewPassword(""); setConfirmPassword(""); setError(null); setView("otp"); }} />
    </Card>
  );
};

export default ForgotPassword;

