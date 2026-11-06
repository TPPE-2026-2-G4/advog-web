import CalendarioClient from './calendarioClient';
import { listarFinancas } from '@/services/financas';

export default async function CalendarioPage() {
  const financas = await listarFinancas();

  return <CalendarioClient initialData={financas} />;
}
