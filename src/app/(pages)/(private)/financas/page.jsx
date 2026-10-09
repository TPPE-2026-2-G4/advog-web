import FinancasClient from './financasClient';
import { listarFinancas } from '@/services/financas';

export default async function FinancasPage() {
  const financas = await listarFinancas();

  return <FinancasClient initialData={financas} />;
}
