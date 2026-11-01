import { cookies } from 'next/headers';
import { getProcessosData } from '@/services/processos';
import ProcessosClient from './processosClient';

export default async function ProcessosPage() {
  let token;
  try {
    const cookieStore = await cookies();
    token = cookieStore.get('access_token')?.value;
  } catch {}

  const { initialPage, initialError, responsaveis } = await getProcessosData({
    token,
  });

  return (
    <ProcessosClient
      initialPage={initialPage}
      initialError={initialError}
      responsaveis={responsaveis}
    />
  );
}
