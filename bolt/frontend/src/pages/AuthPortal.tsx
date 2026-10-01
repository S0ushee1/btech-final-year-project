import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { AlertCircle, ArrowRightLeft, LogIn, UserPlus, X } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { publishToast } from '../lib/toast';

interface AuthPortalProps {
  onNavigate: (page: string) => void;
  initialMode?: 'login' | 'register';
  asModal?: boolean;
  onClose?: () => void;
}

export function AuthPortal({ onNavigate, initialMode = 'login', asModal = false, onClose }: AuthPortalProps) {
  const { login, register, isLoading } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [error, setError] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [name, setName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setError('');
  }, [initialMode]);

  const switchMode = (next: 'login' | 'register') => {
    setError('');
    setMode(next);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!loginEmail || !loginPassword) {
      setError('Please enter both email and password');
      return;
    }

    const result = await login(loginEmail, loginPassword);
    if (!result.success) {
      setError(result.message || 'Invalid credentials');
      publishToast({ message: result.message || 'Invalid credentials', tone: 'error' });
      return;
    }

    publishToast({ message: 'Login successful', tone: 'success' });
    const storedUser = localStorage.getItem('tv_auth_user');
    const role = storedUser ? JSON.parse(storedUser).role : 'citizen';
    onNavigate(role === 'authority' ? 'dashboard' : 'my-reports');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !registerEmail || !registerPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (registerPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (registerPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const result = await register(name, registerEmail, registerPassword);
    if (!result.success) {
      setError(result.message || 'Registration failed');
      publishToast({ message: result.message || 'Registration failed', tone: 'error' });
      return;
    }

    publishToast({ message: 'Account created successfully', tone: 'success' });
    onNavigate('my-reports');
  };

  return (
    <div className={asModal ? 'w-full' : 'page-wrap page-section auth-page-enter flex items-center justify-center'}>
      <section className={`auth-card ${mode === 'register' ? 'is-register' : ''}`}>
        {asModal && (
          <button
            type="button"
            onClick={onClose}
            className="auth-close-btn"
            aria-label="Close authentication popup"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <div className="auth-main">
          {error && (
            <div className="auth-error">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="auth-form-viewport">
            <div className="auth-form-track">
              <form className="auth-form-panel" onSubmit={handleLogin}>
                <div className="auth-title-wrap">
                  <div className="auth-title-icon">
                    <LogIn className="w-6 h-6" />
                  </div>
                  <h2 className="auth-title">Sign In</h2>
                  <p className="auth-subtitle">Access your Traffic Vision dashboard</p>
                </div>

                <div className="space-y-3">
                  <Input
                    id="login-email"
                    label="Email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="name@example.com"
                  />
                  <Input
                    id="login-password"
                    label="Password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Enter password"
                  />
                </div>

                <Button type="submit" fullWidth disabled={isLoading} className="mt-4">
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>

              <form className="auth-form-panel" onSubmit={handleRegister}>
                <div className="auth-title-wrap">
                  <div className="auth-title-icon">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <h2 className="auth-title">Create Account</h2>
                  <p className="auth-subtitle">Citizen access for reporting violations</p>
                </div>

                <div className="space-y-3">
                  <Input
                    id="register-name"
                    label="Full Name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                  <Input
                    id="register-email"
                    label="Email"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <Input
                    id="register-password"
                    label="Password"
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <Input
                    id="register-confirm-password"
                    label="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" fullWidth disabled={isLoading} className="mt-4">
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </div>
          </div>
        </div>

        <aside className="auth-side">
          <div className="auth-side-track">
            <div className="auth-side-panel">
              <p className="auth-side-badge">New here?</p>
              <h3 className="auth-side-title">Create Your Citizen Account</h3>
              <p className="auth-side-copy">
                Submit image/video evidence and track every report with live status updates.
              </p>
              <button type="button" className="auth-switch-btn" onClick={() => switchMode('register')}>
                Create Account
              </button>
            </div>
            <div className="auth-side-panel">
              <p className="auth-side-badge">Already registered?</p>
              <h3 className="auth-side-title">Welcome Back</h3>
              <p className="auth-side-copy">
                Sign in to continue your workflow, review reports, and monitor impact.
              </p>
              <button type="button" className="auth-switch-btn" onClick={() => switchMode('login')}>
                Sign In
              </button>
            </div>
          </div>
        </aside>

        <div className="auth-mobile-switch">
          <button
            type="button"
            className={`auth-mobile-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            <LogIn className="w-4 h-4" />
            Login
          </button>
          <button
            type="button"
            className={`auth-mobile-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Create Account
          </button>
        </div>
      </section>
    </div>
  );
}
