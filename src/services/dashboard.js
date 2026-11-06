import { getAccessToken } from '@/utils/authSession';
import { API_URL } from './api';

const FALLBACK_MESSAGE = 'Não foi possível carregar o resumo de atividades.';

const getErrorMessage = async (response) => {
  const error = await response.json().catch(() => null);

  if (response.status === 401) {
    return 'Sessão expirada. Faça login novamente.';
  }

  return typeof error?.detail === 'string' ? error.detail : FALLBACK_MESSAGE;
};

export async function obterResumoAtividades() {
  const token = getAccessToken();
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');

  let response;

  try {
    response = await fetch(`${API_URL}/dashboard/atividades/resumo`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
  } catch {
    throw new Error(FALLBACK_MESSAGE);
  }

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json();
}
