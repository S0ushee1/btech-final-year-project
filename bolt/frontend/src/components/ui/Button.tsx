import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type Variant = 'primary' | 'soft' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  children,
  ...props
}: PropsWithChildren<ButtonProps>) {
  const base =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'danger'
      ? 'btn-danger'
      : 'btn-soft';
  return (
    <button
      {...props}
      className={`${base} ${fullWidth ? 'w-full' : ''} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
