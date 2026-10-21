import { getAccessToken } from '@/utils/authSession';

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  'http://localhost:8000';

export const DEFAULT_ATUACOES_SITE = [];

const getAuthHeaders = () => {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export async function listarAtuacoes() {
  try {
    const response = await fetch(`${apiUrl}/atuacoes`, {
      cache: 'no-store',
    });

    if (!response.ok) return DEFAULT_ATUACOES_SITE;

    const data = await response.json();
    return Array.isArray(data) ? data : DEFAULT_ATUACOES_SITE;
  } catch {
    return DEFAULT_ATUACOES_SITE;
  }
}

export async function criarAtuacao(dados) {
  const response = await fetch(`${apiUrl}/atuacoes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dados),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.detail || 'Não foi possível cadastrar a área de atuação.'
    );
  }

  return await response.json();
}

export async function atualizarAtuacao(atuacaoId, dados) {
  const response = await fetch(`${apiUrl}/atuacoes/${atuacaoId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(dados),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.detail || 'Não foi possível atualizar a área de atuação.'
    );
  }

  return await response.json();
}

export async function mudarExibicaoAtuacao(atuacaoId, exibicaoInstitucional) {
  const response = await fetch(
    `${apiUrl}/atuacoes/${atuacaoId}/exibicao-institucional`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ exibicaoInstitucional }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.detail || 'Não foi possível alterar a exibição da área de atuação.'
    );
  }

  return await response.json();
}

export async function excluirAtuacao(atuacaoId) {
  const response = await fetch(`${apiUrl}/atuacoes/${atuacaoId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.detail || 'Não foi possível excluir a área de atuação.'
    );
  }

  return await response.json();
}
