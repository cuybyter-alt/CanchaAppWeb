import React from 'react';

// Icon Components - Approach profesional con SVGs simples
const GoogleIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="white" stroke="#E5E7EB" strokeWidth="1"/>
    <text x="12" y="16" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#4285F4">G</text>
  </svg>
);

const InstagramIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="white"/>
    <g transform="translate(7, 7)">
      <rect x="1" y="1" width="8" height="8" rx="2" stroke="#E1306C" strokeWidth="1.2" fill="none"/>
      <circle cx="5" cy="5" r="2" stroke="#E1306C" strokeWidth="1.2" fill="none"/>
      <circle cx="7.5" cy="2.5" r="0.5" fill="#E1306C"/>
    </g>
  </svg>
);

const TikTokIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="white"/>
    <text x="12" y="17" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#000000">♪</text>
  </svg>
);

const MailIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="white"/>
    <g transform="translate(6, 7)">
      <rect x="0" y="1" width="12" height="9" rx="1.5" stroke="#22C55E" strokeWidth="1.2" fill="none"/>
      <path d="M0 2l6 4 6-4" stroke="#22C55E" strokeWidth="1.2" fill="none"/>
    </g>
  </svg>
);

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const handleSocialLogin = (provider: string) => {
    console.log(`Logging in with ${provider}`);
    // Implementar lógica de autenticación
    onLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-200 p-4 sm:p-6 lg:p-8">
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
              className="group w-full flex items-center justify-center gap-3 px-6 py-3.5 sm:py-4 bg-white border-2 border-gray-300 rounded-full font-semibold text-gray-700 text-sm sm:text-base hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
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
              <MailIcon />
              <span>Continuar con Correo</span>
            </button>
          </div>

          {/* Footer */}
          <div className="text-center text-sm sm:text-base text-gray-600 pt-2">
            <span className="inline-block">¿No tienes una cuenta? </span>
            <a 
              href="/register" 
              className="inline-block font-semibold text-green-600 hover:text-green-700 hover:underline underline-offset-2 transition-colors"
            >
              Regístrate
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
