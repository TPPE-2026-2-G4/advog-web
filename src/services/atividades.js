import { getAccessToken } from '@/utils/authSession';
import { API_URL } from './api';

const getErrorMessage = async (
  response,
  fallbackMessage = 'Não foi possível carregar a produtividade da equipe.',
  forbiddenMessage = 'Você não possui permissão para visualizar a produtividade da equipe.'
) => {
  const error = await response.json().catch(() => null);

  if (response.status === 401) {
    return 'Sessão expirada. Faça login novamente.';
  }

  if (response.status === 403) {
    return forbiddenMessage;
  }

  return error?.detail || fallbackMessage;
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

export async function obterKanbanAtividades() {
  const fallbackMessage = 'Não foi possível carregar as atividades.';
  const token = getAccessToken();
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');

  let response;

  try {
    response = await fetch(`${API_URL}/atividades/kanban`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        fallbackMessage,
        'Você não possui permissão para visualizar as atividades.'
      )
    );
  }

  return response.json();
}
