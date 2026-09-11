import Auth from '@/components/layout/auth/auth';
import FirstLoginForm from '@/components/ui/firstLoginForm/firstLoginForm';

export default function FirstLoginPage() {
  return (
    <Auth
      title="Primeiro acesso"
      subtitle="Complete seus dados para finalizar seu cadastro e acessar a plataforma"
    >
      <FirstLoginForm />
    </Auth>
  );
}
