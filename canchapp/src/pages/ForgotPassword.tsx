import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MdEmail } from "react-icons/md";
import authService from "../services/AuthService";
import notify from "../services/toast";
import type { ApiError } from "../services/ApiClient";

// ─── Component ────────────────────────────────────────────────────────────────

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Por favor ingresa tu correo electrónico.");
      return;
    }
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await authService.requestPasswordReset(trimmed);
      setSent(true);
      notify.success("Correo enviado", "Revisa tu bandeja de entrada.");
    } catch (e) {
      const err = e as ApiError;
      // The API always returns 200 to prevent email enumeration, but handle
      // any unexpected network / server errors gracefully.
      const msg = err.message ?? "Error al enviar el correo. Intenta de nuevo.";
      setError(msg);
      notify.error("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Logo shared with Login ─────────────────────────────────────────────────
  const Logo = () => (
    <div className="flex flex-col items-center mb-6">
      <div className="w-16 h-16 rounded-2xl bg-black border-2 border-green-500 flex items-center justify-center shadow-lg shadow-green-500/20 mb-4">
        <img src="/cuypequeniologo.png" alt="Canchapp" className="w-12 h-12 object-contain" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
        ¿Olvidaste tu contraseña?
      </h1>
      <p className="text-sm text-gray-500 mt-1 text-center">
        Ingresa tu correo y te enviaremos un código para restablecerla.
      </p>
    </div>
  );

  // ── Success state ─────────────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f0] p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm px-8 py-10 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <MdEmail size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Revisa tu correo</h2>
          <p className="text-sm text-gray-500 mb-6">
            Si <span className="font-semibold text-gray-700">{email.trim()}</span> está
            registrado, recibirás un código de 6 dígitos para restablecer tu contraseña.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            ¿No lo ves? Revisa tu carpeta de spam o correo no deseado.
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-3 bg-green-500 rounded-full text-sm font-semibold text-white hover:bg-green-600 hover:shadow-md hover:shadow-green-500/30 transition-all duration-150 text-center"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  // ── Form state ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f0] p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm px-8 py-10">
        <Logo />

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
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
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 bg-green-500 rounded-full text-sm font-semibold text-white hover:bg-green-600 hover:shadow-md hover:shadow-green-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
          >
            {loading ? "Enviando..." : "Enviar código"}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link
            to="/login"
            className="font-semibold text-green-600 hover:text-green-700 transition-colors"
          >
            ← Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
