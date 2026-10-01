import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
}

export function Input({ label, id, className = '', ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = props.type === 'password';
  const resolvedType = isPasswordField ? (showPassword ? 'text' : 'password') : props.type;

  return (
    <div>
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          className={`form-input ${isPasswordField ? 'pr-12' : ''} ${className}`.trim()}
          {...props}
          type={resolvedType}
        />
        {isPasswordField && (
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
