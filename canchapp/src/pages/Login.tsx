import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { tokenStorage } from '../services/AuthService';

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


const Login: React.FC = () => {
  const navigate = useNavigate();

  const handleSocialLogin = (provider: string) => {
    console.log(`Logging in with ${provider}`);
    // Usar authService para guardar el token
    const mockToken = {
      access: `access_token_${provider}_${Date.now()}`,
      refresh: `refresh_token_${provider}_${Date.now()}`,
    };
    tokenStorage.save(mockToken);
    // Mock user
    const mockUser = {
      user_id: `user_${Date.now()}`,
      username: provider.toLowerCase(),
      email: `user@${provider.toLowerCase()}.com`,
      f_name: 'Usuario',
      l_name: provider,
      role_name: 'Player',
      status: 'active',
      avatar_url: null,
      is_guest: false,
    };
    tokenStorage.saveUser(mockUser);
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
          
          {/* Logo */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 mx-auto mb-6 sm:mb-8 logo-tilt">
            <div className="absolute inset-0 bg-black rounded-2xl border-4 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5),0_0_40px_rgba(34,197,94,0.3)] flex items-center justify-center">
              <img 
                src="/cuypequeniologo.png" 
                alt="Canchapp Logo" 
                className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 object-contain p-2"
              />
            </div>
          </div>

          {/* Header */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 text-center mb-2 sm:mb-3 tracking-tight">
            Bienvenido de Nuevo
          </h1>
          <p className="text-sm sm:text-base text-gray-600 text-center mb-6 sm:mb-8 lg:mb-10 leading-relaxed max-w-sm mx-auto">
            Inicia sesión para reservar tus canchas favoritas
          </p>

          {/* Authentication buttons */}
          <div className="space-y-3 sm:space-y-3.5 mb-6 sm:mb-8">
            
            {/* Google Button */}
            <button 
              onClick={() => handleSocialLogin('Google')}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 sm:py-4 bg-white border-2 border-gray-300 rounded-full font-semibold text-gray-700 text-sm sm:text-base hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <GoogleIcon />
              <span>Continuar con Google</span>
            </button>

            {/* Instagram Button */}
            <button 
              onClick={() => handleSocialLogin('Instagram')}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 sm:py-4 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 rounded-full font-semibold text-white text-sm sm:text-base hover:from-orange-500 hover:via-pink-600 hover:to-purple-700 hover:shadow-lg hover:shadow-pink-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <InstagramIcon />
              <span>Continuar con Instagram</span>
            </button>

            {/* TikTok Button */}
            <button 
              onClick={() => handleSocialLogin('TikTok')}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 sm:py-4 bg-black rounded-full font-semibold text-white text-sm sm:text-base hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <TikTokIcon />
              <span>Continuar con TikTok</span>
            </button>

            {/* Separator */}
            <div className="relative flex items-center justify-center py-4 sm:py-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative bg-white px-4">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-gray-900">
                  O
                </div>
              </div>
            </div>

            {/* Email Button */}
            <button 
              onClick={() => handleSocialLogin('Email')}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 sm:py-4 bg-green-500 rounded-full font-semibold text-white text-sm sm:text-base hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="white"/>
                <g transform="translate(6, 7)">
                  <rect x="0" y="1" width="12" height="9" rx="1.5" stroke="#22C55E" strokeWidth="1.2" fill="none"/>
                  <path d="M0 2l6 4 6-4" stroke="#22C55E" strokeWidth="1.2" fill="none"/>
                </g>
              </svg>
              <span>Continuar con Correo</span>
            </button>
          </div>

          {/* Footer */}
          <div className="text-center text-sm sm:text-base text-gray-600 pt-2">
            <span className="inline-block">¿No tienes una cuenta? </span>
            <Link 
              to="/register" 
              className="inline-block font-semibold text-green-600 hover:text-green-700 hover:underline underline-offset-2 transition-colors"
            >
              Regístrate
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;