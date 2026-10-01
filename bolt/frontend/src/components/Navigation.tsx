import { Menu, X, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { NotificationCenter } from './NotificationCenter';

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string, reportId?: string) => void;
  onOpenQuickActions: () => void;
  isAuthPage?: boolean;
}

export function Navigation({
  currentPage,
  onNavigate,
  onOpenQuickActions,
  isAuthPage = false,
}: NavigationProps) {
  const { isLoggedIn, user, logout } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const showAuthHeader = isAuthPage && !isLoggedIn;

  const citizenLinks = [
    { name: 'Home', path: 'home' },
    { name: 'Workflow', path: 'how-it-works' },
    { name: 'Report Violation', path: 'report' },
    { name: 'My Reports', path: 'my-reports' },
    { name: 'Profile', path: 'profile' },
  ];

  const authorityLinks = [
    { name: 'Home', path: 'home' },
    { name: 'Workflow', path: 'how-it-works' },
    { name: 'Dashboard', path: 'dashboard' },
    { name: 'All Reports', path: 'all-reports' },
    { name: 'Analytics', path: 'analytics' },
    { name: 'Profile', path: 'profile' },
  ];

  const guestLinks = [
    { name: 'Home', path: 'home' },
    { name: 'How It Works', path: 'how-it-works' },
  ];

  const links = isLoggedIn
    ? user?.role === 'authority'
      ? authorityLinks
      : citizenLinks
    : guestLinks;

  const handleLogout = () => {
    logout();
    onNavigate('home');
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentPage, isLoggedIn, isAuthPage]);

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      <nav
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(162,229,214,0.9)',
          boxShadow:
            '0 16px 36px rgba(11,35,41,0.12), 0 0 0 1px rgba(20,184,166,0.08)',
          padding: '0 24px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          boxSizing: 'border-box' as const,
        }}
      >
        {/* LOGO */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
        >
          <div className="brand-chip w-10 h-10 rounded-xl flex items-center justify-center">
            <span
              style={{
                color: 'white',
                fontWeight: 800,
                fontSize: '15px',
                letterSpacing: '-0.5px',
              }}
            >
              TV
            </span>
          </div>
          <span
            className="hidden lg:block"
            style={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: '18px',
              color: '#0f172a',
              letterSpacing: '-0.3px',
            }}
          >
            Traffic Vision
          </span>
        </button>

        {/* DESKTOP RIGHT SIDE */}
        <div className="hidden md:flex items-center gap-1">
          {showAuthHeader ? (
            /* AUTH PAGE - just Home and How It Works */
            <>
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="nav-link"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => onNavigate('how-it-works')}
                className="nav-link"
              >
                How It Works
              </button>
            </>
          ) : isLoggedIn ? (
            /* LOGGED IN */
            <>
              <NotificationCenter onNavigate={onNavigate} />
              <button
                type="button"
                onClick={onOpenQuickActions}
                className="nav-link"
                title="Quick actions (Ctrl+K)"
              >
                <span className="hidden xl:inline">
                  Quick Actions
                </span>
                <span className="xl:hidden">Quick</span>
              </button>
              {links.map((link) => (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => onNavigate(link.path)}
                  className={`nav-link ${
                    currentPage === link.path
                      ? 'nav-link-active'
                      : ''
                  }`}
                >
                  {link.name}
                </button>
              ))}
              <button
                type="button"
                onClick={handleLogout}
                className="nav-link ml-1"
                style={{ color: '#ef4444' }}
              >
                <LogOut
                  className="w-4 h-4 inline mr-1"
                  style={{ verticalAlign: 'middle' }}
                />
                Logout
              </button>
            </>
          ) : (
            /* LOGGED OUT GUEST */
            <>
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className={`nav-link ${
                  currentPage === 'home'
                    ? 'nav-link-active'
                    : ''
                }`}
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => onNavigate('how-it-works')}
                className={`nav-link ${
                  currentPage === 'how-it-works'
                    ? 'nav-link-active'
                    : ''
                }`}
              >
                How It Works
              </button>
              <div
                style={{
                  width: '1px',
                  height: '20px',
                  background: '#e2e8f0',
                  margin: '0 4px',
                }}
              />
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className={`nav-link ${
                  currentPage === 'login'
                    ? 'nav-link-active'
                    : ''
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="btn-primary !px-5 !py-2 !text-sm !rounded-2xl"
              >
                Sign Up
              </button>
            </>
          )}
        </div>

        {/* MOBILE RIGHT SIDE */}
        <div className="md:hidden flex items-center">
          {showAuthHeader ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="nav-link !px-2.5 !py-1.5 !text-xs"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => onNavigate('how-it-works')}
                className="nav-link !px-2.5 !py-1.5 !text-xs"
              >
                Workflow
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          )}
        </div>
      </nav>

      {/* MOBILE DROPDOWN - outside nav, not clipped */}
      {!showAuthHeader && mobileMenuOpen && (
        <div
          style={{
            background: 'rgba(255,255,255,0.97)',
            borderBottom: '1px solid #e2e8f0',
            backdropFilter: 'blur(12px)',
          }}
          className="md:hidden"
        >
          <div className="px-6 py-3 space-y-1">
            {links.map((link) => (
              <button
                key={link.path}
                type="button"
                onClick={() => {
                  onNavigate(link.path);
                  setMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 rounded-xl text-base font-semibold transition-colors ${
                  currentPage === link.path
                    ? 'bg-teal-500 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {link.name}
              </button>
            ))}
            {!isLoggedIn && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('login');
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-xl text-base font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('register');
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-xl text-base font-semibold text-teal-700 hover:bg-teal-50"
                >
                  Sign Up
                </button>
              </>
            )}
            {isLoggedIn && (
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 rounded-xl text-base font-semibold text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
