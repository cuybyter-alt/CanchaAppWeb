import { useState } from 'react';
import { Bell, MapPin, Search, LogOut, User, Shield, Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface TopbarProps {
  onSearch?: (query: string) => void;
}

export function Topbar({ onSearch }: TopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  
  // Mock user data - replace with real store later
  const isAuthenticated = true;
  const user = { name: 'Usuario', email: 'usuario@canchapp.com' };
  const isAdmin = false;

  const handleLogout = () => {
    // toast.success('Sesión cerrada exitosamente');
    console.log('Logout clicked');
    setShowMobileMenu(false);
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
  };

  return (
    <>
      <header className="sticky top-0 z-[100] bg-[var(--color-text)] h-16 px-4 md:px-6 flex items-center justify-between gap-2 md:gap-4 shadow-[0_2px_16px_rgba(0,0,0,.25)]">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setShowMobileMenu(true)}
          className="lg:hidden w-10 h-10 rounded-[var(--radius-md)] border-none cursor-pointer flex items-center justify-center
            bg-white/8 text-white/90 transition-all duration-[var(--duration-fast)]
            hover:bg-white/15 hover:scale-105 active:scale-95"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo */}
        <a href="/" className="flex items-center gap-2 cursor-pointer no-underline flex-shrink-0">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-[var(--radius-md)] bg-[var(--color-text)] overflow-hidden border-2 border-[var(--color-primary)] shadow-[var(--shadow-primary)] flex-shrink-0">
            <img src="/cuypequeniologo.png" alt="CanchApp Mascot" className="w-full h-full object-cover" />
          </div>
          <div className="hidden sm:block font-[var(--font-pixel)] text-[11px] md:text-[13px] leading-tight">
            <span className="text-[var(--color-primary)]">Canch</span>
            <span className="text-white">App</span>
          </div>
        </a>

        {/* Desktop Search Bar */}
        <div className="hidden md:flex flex-1 max-w-[400px] items-center gap-2 bg-white/8 border-[1.5px] border-white/12 rounded-full px-4 transition-all duration-[var(--duration-fast)] focus-within:bg-white/13 focus-within:border-[var(--color-primary)] focus-within:ring-[3px] focus-within:ring-[var(--color-primary-glow)]">
          <Search className="w-3.5 h-3.5 text-white/40" />
          <input
            type="text"
            placeholder="Buscar canchas, barrios..."
            className="flex-1 bg-transparent border-none outline-none text-white text-sm font-bold py-2.5 placeholder:text-white/30 placeholder:font-semibold"
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          {/* Mobile Search Toggle */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="md:hidden w-9 h-9 rounded-[var(--radius-md)] border-none cursor-pointer flex items-center justify-center
              bg-white/8 text-white/70 transition-all duration-[var(--duration-fast)]
              hover:bg-white/15 hover:text-white hover:scale-105 active:scale-95"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Map Pin - Hidden on mobile */}
          <button
            className="hidden sm:flex w-9 h-9 md:w-10 md:h-10 rounded-[var(--radius-md)] border-none cursor-pointer items-center justify-center
              bg-white/8 text-white/70 transition-all duration-[var(--duration-fast)]
              hover:bg-white/15 hover:text-white hover:scale-105 active:scale-95"
          >
            <MapPin className="w-4 h-4" />
          </button>

          {/* Notifications */}
          <button
            className="relative w-9 h-9 md:w-10 md:h-10 rounded-[var(--radius-md)] border-none cursor-pointer flex items-center justify-center
              bg-white/8 text-white/70 transition-all duration-[var(--duration-fast)]
              hover:bg-white/15 hover:text-white hover:scale-105 active:scale-95"
          >
            <Bell className="w-4 h-4" />
            {isAuthenticated && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 md:w-2.5 md:h-2.5 bg-[var(--color-accent)] rounded-full border-2 border-[var(--color-text)] animate-ping" />
            )}
          </button>
          
          {/* User Menu - Desktop */}
          {isAuthenticated ? (
            <div className="hidden md:block relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-10 h-10 rounded-full border-[2.5px] border-[var(--color-primary)] bg-[var(--color-text)] overflow-hidden cursor-pointer shadow-[var(--shadow-primary)] flex-shrink-0 hover:scale-105 transition-transform active:scale-95"
              >
                <img src="/cuypequeniologo.png" alt="Profile" className="w-full h-full object-cover" />
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-[110]"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-[calc(100%+8px)] z-[120] w-56 bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-xl)] overflow-hidden border border-[var(--color-border)]">
                    <div className="p-4 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
                      <p className="font-[var(--font-body)] font-bold text-sm text-[var(--color-text)] truncate">
                        {user?.name}
                      </p>
                      <p className="font-[var(--font-body)] text-xs text-[var(--color-text-3)] truncate">
                        {user?.email}
                      </p>
                    </div>
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/profile');
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--color-bg)] transition-colors text-left border-none bg-transparent cursor-pointer"
                      >
                        <User className="w-4 h-4 text-[var(--color-text-3)]" />
                        <span className="font-[var(--font-body)] font-semibold text-sm text-[var(--color-text)]">
                          Perfil
                        </span>
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            navigate('/admin');
                          }}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--color-bg)] transition-colors text-left border-none bg-transparent cursor-pointer"
                        >
                          <Shield className="w-4 h-4 text-[var(--color-accent)]" />
                          <span className="font-[var(--font-body)] font-semibold text-sm text-[var(--color-accent)]">
                            Administración
                          </span>
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-red-50 transition-colors text-left border-none bg-transparent cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-[var(--color-accent)]" />
                        <span className="font-[var(--font-body)] font-semibold text-sm text-[var(--color-accent)]">
                          Cerrar Sesión
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="px-4 h-10 rounded-[var(--radius-md)] border-none cursor-pointer
                  bg-white/10 text-white font-[var(--font-body)] font-bold text-sm
                  transition-all duration-[var(--duration-fast)]
                  hover:bg-white/20 hover:scale-105 active:scale-95"
              >
                Ingresar
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-4 h-10 rounded-[var(--radius-md)] border-none cursor-pointer
                  bg-[var(--color-primary)] text-white font-[var(--font-body)] font-bold text-sm
                  shadow-[var(--shadow-md)]
                  transition-all duration-[var(--duration-fast)]
                  hover:bg-[var(--color-primary-dark)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]
                  active:scale-95 active:translate-y-0"
              >
                Comenzar
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Search Bar Dropdown */}
      {showMobileSearch && (
        <div className="md:hidden sticky top-16 z-[99] bg-[var(--color-text)] px-4 py-3 shadow-lg border-t border-white/10">
          <div className="flex items-center gap-2 bg-white/8 border-[1.5px] border-white/12 rounded-full px-4 transition-all duration-[var(--duration-fast)] focus-within:bg-white/13 focus-within:border-[var(--color-primary)] focus-within:ring-[3px] focus-within:ring-[var(--color-primary-glow)]">
            <Search className="w-3.5 h-3.5 text-white/40" />
            <input
              type="text"
              placeholder="Buscar canchas, barrios..."
              className="flex-1 bg-transparent border-none outline-none text-white text-sm font-bold py-2.5 placeholder:text-white/30 placeholder:font-semibold"
              onChange={(e) => onSearch?.(e.target.value)}
              autoFocus
            />
            <button
              onClick={() => setShowMobileSearch(false)}
              className="text-white/50 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Menu Drawer */}
      {showMobileMenu && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] lg:hidden transition-opacity duration-300"
            onClick={closeMobileMenu}
          />

          {/* Drawer */}
          <div className="fixed top-0 left-0 bottom-0 w-[280px] bg-[var(--color-surface)] z-[160] lg:hidden shadow-[4px_0_24px_rgba(0,0,0,0.3)] animate-slide-in-left">
            {/* Drawer Header */}
            <div className="h-16 px-4 flex items-center justify-between bg-[var(--color-text)] border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-text)] overflow-hidden border-2 border-[var(--color-primary)] shadow-[var(--shadow-primary)]">
                  <img src="/cuypequeniologo.png" alt="CanchApp" className="w-full h-full object-cover" />
                </div>
                <div className="font-[var(--font-pixel)] text-[13px] leading-tight">
                  <span className="text-[var(--color-primary)]">Canch</span>
                  <span className="text-white">App</span>
                </div>
              </div>
              <button
                onClick={closeMobileMenu}
                className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Info */}
            {isAuthenticated && (
              <div className="p-4 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-[2.5px] border-[var(--color-primary)] bg-[var(--color-text)] overflow-hidden shadow-[var(--shadow-primary)]">
                    <img src="/cuypequeniologo.png" alt="Profile" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-[var(--font-body)] font-bold text-sm text-[var(--color-text)] truncate">
                      {user?.name}
                    </p>
                    <p className="font-[var(--font-body)] text-xs text-[var(--color-text-3)] truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Menu Items */}
            <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
              <button
                onClick={() => {
                  navigate('/');
                  closeMobileMenu();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] text-left border-none bg-transparent cursor-pointer text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)] transition-all font-bold"
              >
                <User className="w-5 h-5" />
                <span>Inicio</span>
              </button>

              <button
                onClick={() => {
                  navigate('/fields');
                  closeMobileMenu();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] text-left border-none bg-transparent cursor-pointer text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)] transition-all font-bold"
              >
                <Search className="w-5 h-5" />
                <span>Buscar Canchas</span>
              </button>

              <button
                onClick={() => {
                  navigate('/bookings');
                  closeMobileMenu();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] text-left border-none bg-transparent cursor-pointer text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)] transition-all font-bold"
              >
                <Bell className="w-5 h-5" />
                <span>Mis Reservas</span>
              </button>

              <button
                onClick={() => {
                  navigate('/favorites');
                  closeMobileMenu();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] text-left border-none bg-transparent cursor-pointer text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)] transition-all font-bold"
              >
                <MapPin className="w-5 h-5" />
                <span>Favoritos</span>
              </button>

              <div className="h-px bg-[var(--color-border)] my-2" />

              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => {
                      navigate('/profile');
                      closeMobileMenu();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] text-left border-none bg-transparent cursor-pointer text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] hover:text-[var(--color-primary-dark)] transition-all font-bold"
                  >
                    <User className="w-5 h-5" />
                    <span>Mi Perfil</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        navigate('/admin');
                        closeMobileMenu();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] text-left border-none bg-transparent cursor-pointer text-[var(--color-accent)] hover:bg-red-50 transition-all font-bold"
                    >
                      <Shield className="w-5 h-5" />
                      <span>Administración</span>
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] text-left border-none bg-transparent cursor-pointer text-[var(--color-accent)] hover:bg-red-50 transition-all font-bold"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Cerrar Sesión</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      navigate('/login');
                      closeMobileMenu();
                    }}
                    className="w-full px-4 py-3 rounded-[var(--radius-lg)] border-none cursor-pointer
                      bg-white text-[var(--color-text)] font-[var(--font-body)] font-bold text-sm
                      transition-all hover:bg-gray-100"
                  >
                    Ingresar
                  </button>
                  <button
                    onClick={() => {
                      navigate('/register');
                      closeMobileMenu();
                    }}
                    className="w-full px-4 py-3 rounded-[var(--radius-lg)] border-none cursor-pointer
                      bg-[var(--color-primary)] text-white font-[var(--font-body)] font-bold text-sm
                      shadow-[var(--shadow-md)]
                      transition-all hover:bg-[var(--color-primary-dark)]"
                  >
                    Comenzar
                  </button>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
