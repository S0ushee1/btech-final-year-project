import { AuthPage } from './AuthPage';

interface LoginProps {
  onNavigate: (page: string) => void;
}

export function Login({ onNavigate }: LoginProps) {
  return <AuthPage onNavigate={onNavigate} defaultMode="login" />;
}
