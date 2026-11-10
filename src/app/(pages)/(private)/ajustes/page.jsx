import AjustesClient from './ajustesClient';
import { listarFuncionarios } from '@/services/funcionarios';
import { isAdministratorAccount } from '@/utils/funcionario';

export default async function AjustesPage() {
  const funcionarios = await listarFuncionarios();

  return (
    <AjustesClient
      initialTeam={(funcionarios || []).filter(
        (f) => !isAdministratorAccount(f)
      )}
    />
  );
}
