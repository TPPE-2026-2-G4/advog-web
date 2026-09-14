import { API_URL } from './api';

export async function listarFuncionarios() {
  try {
    const response = await fetch(`${API_URL}/funcionarios`, {
      cache: 'no-store',
    });

    if (!response.ok) return [];

    return await response.json();
  } catch {
    return [];
  }
}

export async function criarFuncionario(dados) {
  const response = await fetch(`${API_URL}/funcionarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dados),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || 'Não foi possível cadastrar o usuário.');
  }

  return response.json();
}

export async function excluirFuncionario(funcionarioId) {
  const response = await fetch(`${API_URL}/funcionarios/${funcionarioId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || 'Não foi possível excluir o usuário.');
  }
}

export async function mudarAcessoFuncionario(funcionarioId) {
  const response = await fetch(
    `${API_URL}/funcionarios/${funcionarioId}/mudar-acesso`,
    {
      method: 'PATCH',
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || 'Não foi possível atualizar o acesso.');
  }

  return response.json();
}
