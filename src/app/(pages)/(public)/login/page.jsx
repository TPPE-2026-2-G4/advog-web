import Auth from '@/components/layout/auth/auth';
import LoginForm from '@/components/ui/loginForm/loginForm';

export default function LoginPage() {
  return (
    <Auth
      title="Acesso ao Sistema"
      subtitle="Insira suas credenciais para continuar"
    >
      <LoginForm />
    </Auth>
  );
}
