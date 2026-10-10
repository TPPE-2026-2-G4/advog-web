import { getProcessosData } from '@/services/processos';
import ProcessosClient from './processosClient';

export default async function ProcessosPage() {
  const { initialPage, initialError, responsaveis } = await getProcessosData();

  return (
    <ProcessosClient
      initialPage={initialPage}
      initialError={initialError}
      responsaveis={responsaveis}
    />
  );
}
