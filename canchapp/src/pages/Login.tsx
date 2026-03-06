import React from 'react';
import { useNavigate } from 'react-router-dom';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.73a4.85 4.85 0 01-1.01-.04z"/>
  </svg>
);

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </>
    )}
  </svg>
);

interface LoginProps {}

const Login: React.FC<LoginProps> = () => {
  const navigate = useNavigate();
  
  const handleSocialLogin = (provider: string) => {
    console.log(`Logging in with ${provider}`);
    // Mock authentication - save token to localStorage
    localStorage.setItem('authToken', `token_${provider}_${Date.now()}`);
    // Navigate to home
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-200 p-4 sm:p-6 lg:p-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 sm:top-8 sm:left-8 p-2 rounded-lg bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 transition-all duration-200 shadow-md hover:shadow-lg"
        title="Volver"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="w-full max-w-md lg:max-w-lg">
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-300/50 p-6 sm:p-8 lg:p-10 backdrop-blur-sm">
          
          {/* Logo placeholder */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 mx-auto mb-6 sm:mb-8">
            <div className="absolute inset-0 bg-black rounded-2xl border-4 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5),0_0_40px_rgba(34,197,94,0.3)] flex items-center justify-center animate-float hover:scale-110 transition-transform duration-300 cursor-pointer">
              <img 
                src="/cuypequeniologo.png" 
                alt="Canchapp Logo" 
                className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 object-contain p-2"
              />
            </div>
          </div>

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
              <GoogleIcon />
              Continuar con Google
            </button>

            {/* Instagram */}
            <button
              onClick={() => handleFirebaseLogin("Instagram")}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-full text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 hover:shadow-md"
              style={{ background: "linear-gradient(90deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}
            >
              <InstagramIcon />
              Continuar con Instagram
            </button>

            {/* TikTok */}
            <button
              onClick={() => handleFirebaseLogin("TikTok")}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black rounded-full text-sm font-semibold text-white hover:bg-gray-900 hover:shadow-md transition-all duration-150"
            >
              <TikTokIcon />
              Continuar con TikTok
            </button>

            <Divider />

            {/* Email */}
            <button
              onClick={() => setView("email")}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-green-500 rounded-full text-sm font-semibold text-white hover:bg-green-600 hover:shadow-md hover:shadow-green-500/30 transition-all duration-150"
            >
              Continuar con Correo
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿No tienes una cuenta?{" "}
            <Link to="/register" className="font-semibold text-green-600 hover:text-green-700">
              Regístrate
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
                <EyeIcon open={showPassword} />
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
      </div>
    </div>
  );
};

export default Login;