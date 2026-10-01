import { useEffect, useMemo, useState, type CSSProperties, type FocusEvent, type MouseEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AuthPageProps {
  onNavigate: (page: string) => void;
  defaultMode?: 'login' | 'register';
}

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

const getStrength = (pwd: string) => {
  let score = 0;
  if (pwd.length >= 6) score = 1;
  if (pwd.length >= 9) score = 2;
  if (/[0-9]/.test(pwd) && /[^a-zA-Z0-9]/.test(pwd)) score = 3;
  if (pwd.length >= 12 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^a-zA-Z0-9]/.test(pwd)) score = 4;
  return score;
};

const strengthColors = ['#f87171', '#fbbf24', '#0d9488', '#0891b2'];
const strengthLabels = ['Too short', 'Getting better', 'Strong password', 'Excellent strength!'];

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: '#134e4a',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  marginBottom: '5px',
};

const baseInputStyle: CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  border: '1.5px solid #e2e8f0',
  borderRadius: '10px',
  fontSize: '14px',
  color: '#0f172a',
  background: 'white',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: '"DM Sans", sans-serif',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

export function AuthPage({ onNavigate, defaultMode = 'login' }: AuthPageProps) {
  const { login, register, isLoading } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [apiError, setApiError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    setMode(defaultMode);
    setApiError('');
    setErrors({});
  }, [defaultMode]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    window.setTimeout(() => setToastVisible(false), 2500);
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = '@keyframes spin { to { transform: rotate(360deg) } }';
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const strength = useMemo(() => getStrength(password), [password]);

  const validate = () => {
    const next: FieldErrors = {};
    if (mode === 'register' && (!name || name.trim().length < 2)) {
      next.name = 'Full name must be at least 2 characters';
    }
    if (!email || !email.includes('@') || !email.includes('.')) {
      next.email = 'Enter a valid email address';
    }
    if (!password || password.length < 6) {
      next.password = 'Password must be at least 6 characters';
    }
    if (mode === 'register' && confirmPassword !== password) {
      next.confirmPassword = 'Passwords do not match';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setApiError('');
    if (!validate()) return;

    if (mode === 'login') {
      const result = await login(email, password);
      if (!result.success) {
        setApiError(result.message || 'Invalid credentials');
        return;
      }
      const storedUser = localStorage.getItem('tv_auth_user');
      const role = storedUser ? JSON.parse(storedUser).role : 'citizen';
      onNavigate(role === 'authority' ? 'dashboard' : 'my-reports');
      return;
    }

    const result = await register(name, email, password);
    if (!result.success) {
      setApiError(result.message || 'Registration failed');
      return;
    }
    onNavigate('my-reports');
  };

  const inputStyle = (hasError?: boolean): CSSProperties => ({
    ...baseInputStyle,
    border: hasError ? '1.5px solid #f87171' : baseInputStyle.border,
    boxShadow: hasError ? '0 0 0 3px rgba(248,113,113,0.10)' : 'none',
    paddingRight: '42px',
  });

  const textInputStyle = (hasError?: boolean): CSSProperties => ({
    ...baseInputStyle,
    border: hasError ? '1.5px solid #f87171' : baseInputStyle.border,
    boxShadow: hasError ? '0 0 0 3px rgba(248,113,113,0.10)' : 'none',
  });

  const handleFocus = (event: FocusEvent<HTMLInputElement>, hasError?: boolean) => {
    if (hasError) return;
    event.target.style.borderColor = '#0d9488';
    event.target.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.10)';
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>, hasError?: boolean) => {
    if (hasError) {
      event.target.style.borderColor = '#f87171';
      event.target.style.boxShadow = '0 0 0 3px rgba(248,113,113,0.10)';
      return;
    }
    event.target.style.borderColor = '#e2e8f0';
    event.target.style.boxShadow = 'none';
  };

  const handleButtonEnter = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.style.transform = 'translateY(-1px)';
    event.currentTarget.style.boxShadow = '0 6px 20px rgba(13,148,136,0.45)';
    setCtaHovered(true);
  };

  const handleButtonLeave = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.style.transform = 'translateY(0)';
    event.currentTarget.style.boxShadow = '0 4px 14px rgba(13,148,136,0.35)';
    setCtaHovered(false);
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: '#f8fffe' }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #5eead4, transparent)',
            filter: 'blur(80px)',
            opacity: 0.35,
            top: '-100px',
            left: '-100px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #0891b2, transparent)',
            filter: 'blur(80px)',
            opacity: 0.35,
            bottom: '-80px',
            right: '-80px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #a7f3d0, transparent)',
            filter: 'blur(80px)',
            opacity: 0.3,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
          }}
        />
      </div>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(#99f6e4 1px, transparent 1px), linear-gradient(90deg, #99f6e4 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.04,
        }}
      />

      <div
        className="animate-cardIn"
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.95)',
          boxShadow: `
       0 8px 32px rgba(13,148,136,0.10),
       0 2px 8px rgba(0,0,0,0.05),
       inset 0 1px 0 rgba(255,255,255,1)
     `,
          padding: '36px 40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              background: 'linear-gradient(135deg, #0d9488, #0891b2)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(13,148,136,0.3)',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                color: 'white',
                fontWeight: 800,
                fontSize: '14px',
                letterSpacing: '-0.5px',
                fontFamily: '"DM Sans", sans-serif',
              }}
            >
              TV
            </span>
          </div>
          <span
            style={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: '20px',
              color: '#0f172a',
              letterSpacing: '-0.3px',
            }}
          >
            Traffic Vision
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            background: '#f1f5f9',
            borderRadius: '12px',
            padding: '3px',
            gap: '2px',
            marginBottom: '28px',
          }}
        >
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: '9px',
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.25s',
                background: mode === m ? 'white' : 'transparent',
                color: mode === m ? '#0f766e' : '#94a3b8',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                fontFamily: '"DM Sans", sans-serif',
              }}
            >
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {apiError && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              marginBottom: '16px',
            }}
          >
            {apiError}
          </div>
        )}

        <div key={mode} className="animate-fadeIn">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1
              style={{
                fontFamily: '"DM Serif Display", serif',
                fontSize: '26px',
                color: '#0f172a',
                letterSpacing: '-0.3px',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '8px 0 0' }}>
              {mode === 'login'
                ? 'Sign in to your Traffic Vision dashboard'
                : 'Join Traffic Vision as a citizen reporter'}
            </p>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => showToast('Google sign-in coming soon')}
              className="flex-1 flex items-center justify-center gap-[7px] py-[10px] border border-slate-200 rounded-[10px] text-[13px] font-medium text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50 hover:-translate-y-px hover:shadow-md transition-all"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
              Google
            </button>
            <button
              type="button"
              onClick={() => showToast('Apple sign-in coming soon')}
              className="flex-1 flex items-center justify-center gap-[7px] py-[10px] border border-slate-200 rounded-[10px] text-[13px] font-medium text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50 hover:-translate-y-px hover:shadow-md transition-all"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 384 512"
                fill="#1a1a1a"
                style={{ flexShrink: 0, display: 'block' }}
                aria-hidden="true"
              >
                <path d="M318.7 268.7c-.2-36.7 16.3-64.5 49.4-84.8-18.5-26.5-46.5-41-83.6-44.4-35.1-3.3-73.5 20.5-87.6 20.5-14.9 0-48.9-19.5-75.6-19-55.3.8-114 44.1-114 135.4 0 27 4.9 54.9 14.8 83.7 13.2 37.5 60.7 129.5 110.3 128 25.9-.6 44.2-18.4 77.9-18.4 32.8 0 49.8 18.4 78.5 18.4 50.1-.7 93.1-84.3 105.6-121.9-69.3-32.6-65.7-95.9-65.7-97.5zM262.7 104.6c27-32.3 24.5-61.7 23.7-72.3-23.8 1.4-51.4 16.2-67.1 34.5-17.3 19.7-27.5 44.1-25.3 71.6 25.8 2 49.6-11.1 68.7-33.8z" />
              </svg>
              Apple
            </button>
          </div>

          <div className="flex items-center gap-[10px] mb-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] font-medium text-slate-400">or continue with email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div style={{ marginBottom: '14px' }}>
                <label htmlFor="full-name" style={labelStyle}>Full Name</label>
                <input
                  id="full-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onFocus={(event) => handleFocus(event, Boolean(errors.name))}
                  onBlur={(event) => handleBlur(event, Boolean(errors.name))}
                  placeholder="Your full name"
                  autoComplete="name"
                  style={textInputStyle(Boolean(errors.name))}
                />
                {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="email" style={labelStyle}>Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onFocus={(event) => handleFocus(event, Boolean(errors.email))}
                onBlur={(event) => handleBlur(event, Boolean(errors.email))}
                placeholder="you@example.com"
                autoComplete="email"
                style={textInputStyle(Boolean(errors.email))}
              />
              {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div style={{ marginBottom: '14px', position: 'relative' }}>
              <label htmlFor="password" style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onFocus={(event) => handleFocus(event, Boolean(errors.password))}
                  onBlur={(event) => handleBlur(event, Boolean(errors.password))}
                  placeholder="........"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  style={inputStyle(Boolean(errors.password))}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-[11px] text-red-500 mt-1">{errors.password}</p>}

              {mode === 'register' && (
                <>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '10px' }}>
                    {[0, 1, 2, 3].map((index) => (
                      <div
                        key={index}
                        style={{
                          flex: 1,
                          height: '3px',
                          borderRadius: '999px',
                          background: strength > index ? strengthColors[Math.max(strength - 1, 0)] : '#e2e8f0',
                          transition: 'background 0.2s',
                        }}
                      />
                    ))}
                  </div>
                  <p
                    style={{
                      fontSize: '10px',
                      marginTop: '6px',
                      color: password.length === 0 ? '#94a3b8' : strengthColors[Math.max(strength - 1, 0)] ?? '#94a3b8',
                    }}
                  >
                    {password.length === 0 ? 'Enter a password' : strengthLabels[Math.max(strength - 1, 0)]}
                  </p>
                </>
              )}
            </div>

            {mode === 'register' && (
              <div style={{ marginBottom: '14px', position: 'relative' }}>
                <label htmlFor="confirm-password" style={labelStyle}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    onFocus={(event) => handleFocus(event, Boolean(errors.confirmPassword))}
                    onBlur={(event) => handleBlur(event, Boolean(errors.confirmPassword))}
                    placeholder="........"
                    autoComplete="new-password"
                    style={inputStyle(Boolean(errors.confirmPassword))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-[11px] text-red-500 mt-1">{errors.confirmPassword}</p>}
              </div>
            )}

            {mode === 'login' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => showToast('Check your inbox soon')}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#0d9488',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: '"DM Sans", sans-serif',
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '13px',
                background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(13,148,136,0.35)',
                fontFamily: '"DM Sans", sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                opacity: isLoading ? 0.75 : 1,
              }}
              onMouseEnter={handleButtonEnter}
              onMouseLeave={handleButtonLeave}
            >
              {isLoading ? (
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                    display: 'inline-block',
                  }}
                />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <span style={{ transform: ctaHovered ? 'translateX(3px)' : 'translateX(0)', transition: 'transform 0.2s' }}>-&gt;</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            marginTop: '14px',
            fontSize: '11px',
            color: '#94a3b8',
          }}
        >
          <span>🔒 256-bit encrypted · Your data is always private</span>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: toastVisible
            ? 'translateX(-50%) translateY(0)'
            : 'translateX(-50%) translateY(12px)',
          background: '#0f172a',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 500,
          opacity: toastVisible ? 1 : 0,
          transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
          zIndex: 999,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}
      >
        {toastMsg}
      </div>
    </div>
  );
}
