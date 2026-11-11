import CalendarioClient from './calendarioClient';
import { listarFinancas, listarCategorias } from '@/services/financas';

export default async function CalendarioPage() {
  const [financas, categorias] = await Promise.all([
    listarFinancas().catch(() => []),
    listarCategorias().catch(() => []),
  ]);

  return (
    <CalendarioClient initialData={financas} initialCategorias={categorias} />
  );
}
