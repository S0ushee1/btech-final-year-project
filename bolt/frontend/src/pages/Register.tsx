import { AuthPage } from './AuthPage';

interface RegisterProps {
  onNavigate: (page: string) => void;
}

export function Register({ onNavigate }: RegisterProps) {
  return <AuthPage onNavigate={onNavigate} defaultMode="register" />;
}
