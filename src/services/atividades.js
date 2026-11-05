import { getAccessToken } from '@/utils/authSession';
import { API_URL } from './api';

const getErrorMessage = async (response) => {
  const error = await response.json().catch(() => null);

  if (response.status === 401) {
    return 'Sessão expirada. Faça login novamente.';
  }

  if (response.status === 403) {
    return 'Você não possui permissão para visualizar a produtividade da equipe.';
  }

  return (
    error?.detail || 'Não foi possível carregar a produtividade da equipe.'
  );
};

export async function listarProdutividadeEquipe() {
  const token = getAccessToken();
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');

  let response;

  try {
    response = await fetch(`${API_URL}/atividades/produtividade`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
  } catch {
    throw new Error('Não foi possível carregar a produtividade da equipe.');
  }

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json();
}
