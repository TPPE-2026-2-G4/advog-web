import { getAccessToken } from '@/utils/authSession';
import { API_URL } from './api';

const getErrorMessage = async (
  response,
  fallbackMessage,
  forbiddenMessage = 'Você não possui permissão para realizar esta ação.'
) => {
  const error = await response.json().catch(() => null);

  if (response.status === 401) {
    return 'Sessão expirada. Faça login novamente.';
  }

  if (response.status === 403) {
    return forbiddenMessage;
  }

  return (typeof error?.detail === 'string' && error.detail) || fallbackMessage;
};

const request = async (path, options, fallbackMessage, forbiddenMessage) => {
  const token = getAccessToken();
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, fallbackMessage, forbiddenMessage)
    );
  }

  if (response.status === 204) return undefined;

  return response.json();
};

export function listarProdutividadeEquipe() {
  return request(
    '/atividades/produtividade',
    { method: 'GET', cache: 'no-store' },
    'Não foi possível carregar a produtividade da equipe.',
    'Você não possui permissão para visualizar a produtividade da equipe.'
  );
}

export function obterKanbanAtividades() {
  return request(
    '/atividades/kanban',
    { method: 'GET', cache: 'no-store' },
    'Não foi possível carregar as atividades.',
    'Você não possui permissão para visualizar as atividades.'
  );
}

export function buscarAtividade(atividadeId) {
  return request(
    `/atividades/${encodeURIComponent(atividadeId)}`,
    { method: 'GET', cache: 'no-store' },
    'Não foi possível carregar os detalhes da atividade.'
  );
}

export function criarAtividade(dados) {
  return request(
    '/atividades',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    },
    'Não foi possível criar a atividade.'
  );
}

export function atualizarAtividade(atividadeId, dados) {
  return request(
    `/atividades/${encodeURIComponent(atividadeId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    },
    'Não foi possível atualizar a atividade.'
  );
}

export function excluirAtividade(atividadeId) {
  return request(
    `/atividades/${encodeURIComponent(atividadeId)}`,
    { method: 'DELETE' },
    'Não foi possível excluir a atividade.'
  );
}

export function filtrarAtividades(filtros = {}) {
  const params = new URLSearchParams();

  if (filtros.busca_textual) {
    params.set('busca_textual', filtros.busca_textual.trim());
  }
  if (filtros.funcionario_id) {
    params.set('funcionario_id', filtros.funcionario_id);
  }
  if (filtros.prazo_fim) {
    params.set('prazo_fim', filtros.prazo_fim);
  }
  if (filtros.prazo_inicio) {
    params.set('prazo_inicio', filtros.prazo_inicio);
  }
  if (filtros.etapa_id) {
    params.set('etapa_id', filtros.etapa_id);
  }

  const query = params.toString();
  const path = `/atividades/${query ? `?${query}` : ''}`;

  return request(
    path,
    { method: 'GET', cache: 'no-store' },
    'Não foi possível filtrar as atividades.',
    'Você não posui permissão para visualizar estas atividades.'
  );
}
