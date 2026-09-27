import { listarProcessos } from '@/services/processos';
import ProcessosClient from './processosClient';

export default async function ProcessosPage() {
  let initialData = [];
  let initialError = '';

  try {
    initialData = await listarProcessos();
  } catch (error) {
    initialError =
      error instanceof Error
        ? error.message
        : 'Não foi possível carregar os processos.';
  }

  return (
    <ProcessosClient initialData={initialData} initialError={initialError} />
  );
}
