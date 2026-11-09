import { listarAtuacoes } from '@/services/atuacoes';
import PerfilClient from './perfilClient';

export default async function PerfilPage() {
  const atuacoes = await listarAtuacoes();

  return <PerfilClient atuacoes={atuacoes} />;
}
