import { Suspense } from 'react';
import ClientesClient from './clientesClient';
import { listarClientesPaginado } from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';

export default async function ClientesPage() {
  const [initialPage, funcionarios] = await Promise.all([
    listarClientesPaginado({ page: 1 }),
    listarFuncionarios(),
  ]);

  return (
    <Suspense fallback={null}>
      <ClientesClient
        initialPage={initialPage}
        initialFuncionarios={funcionarios}
      />
    </Suspense>
  );
}
