import { API_URL } from './api';
import { getAccessToken } from '@/utils/authSession';

const resolveToken = (options) => {
  if (typeof options === 'string') return options;
  if (options && typeof options === 'object' && 'token' in options) {
    return options.token;
  }
  return getAccessToken();
};

const getErrorMessage = async (response, fallbackMessage) => {
  const error = await response.json().catch(() => null);
  return error?.detail || fallbackMessage;
};

export async function listarCargos(options) {
  try {
    const token = resolveToken(options);
    const response = await fetch(`${API_URL}/cargos`, {
      cache: 'no-store',
      ...(token && { headers: { Authorization: `Bearer ${token}` } }),
    });

    if (!response.ok) return [];

    return await response.json();
  } catch {
    return [];
  }
}

export async function criarCargo(dados, options) {
  const token = resolveToken(options);
  const response = await fetch(`${API_URL}/cargos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(dados),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Não foi possível criar o cargo.')
    );
  }

  return response.json();
}

export async function atualizarCargo(cargoId, dados, options) {
  const token = resolveToken(options);
  const response = await fetch(`${API_URL}/cargos/${cargoId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(dados),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Não foi possível atualizar o cargo.')
    );
  }

  return response.json();
}

export async function excluirCargo(cargoId, options) {
  const token = resolveToken(options);
  const response = await fetch(`${API_URL}/cargos/${cargoId}`, {
    method: 'DELETE',
    ...(token && { headers: { Authorization: `Bearer ${token}` } }),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Não foi possível excluir o cargo.')
    );
  }

  return response.json();
}
