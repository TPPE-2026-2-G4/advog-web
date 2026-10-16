import ClientesClient from './clientesClient';
import { listarClientes } from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';

export default async function ClientesPage() {
  const [clientes, funcionarios] = await Promise.all([
    listarClientes(),
    listarFuncionarios(),
  ]);

  return (
    <ClientesClient
      initialClientes={clientes}
      initialFuncionarios={funcionarios}
    />
  );
}
