import AjustesClient from './ajustesClient';
import { listarFuncionarios } from '@/services/funcionarios';

export default async function AjustesPage() {
  const funcionarios = await listarFuncionarios();

  return <AjustesClient initialTeam={funcionarios} />;
}
