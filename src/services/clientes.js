import { getAccessToken } from '@/utils/authSession';
import { API_URL } from './api';

const getAuthHeaders = () => {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const extrairMensagemErro = async (response, mensagemPadrao) => {
  const errorData = await response.json().catch(() => null);
  if (typeof errorData?.detail === 'string') return errorData.detail;
  if (Array.isArray(errorData?.detail)) {
    return errorData.detail
      .map((e) => e.msg || e.message)
      .filter(Boolean)
      .join(' ');
  }
  return mensagemPadrao;
};

export async function listarClientes(filtros = {}) {
  try {
    const params = new URLSearchParams();

    if (filtros.busca) params.append('busca', filtros.busca);
    if (filtros.responsavel_id)
      params.append('responsavel_id', filtros.responsavel_id);
    if (filtros.etapa_id) params.append('etapa_id', filtros.etapa_id);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_URL}/clientes/${query}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      if (typeof window === 'undefined') {
        return [];
      }
      throw new Error(
        await extrairMensagemErro(
          response,
          'Não foi possível carregar a lista de clientes.'
        )
      );
    }

    return await response.json();
  } catch (error) {
    if (typeof window === 'undefined') {
      return [];
    }
    throw error;
  }
}

export async function obterCliente(clienteId) {
  const response = await fetch(`${API_URL}/clientes/${clienteId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      await extrairMensagemErro(
        response,
        'Não foi possível obter os dados do cliente.'
      )
    );
  }

  return response.json();
}

export async function criarCliente(dados) {
  const response = await fetch(`${API_URL}/clientes/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dados),
  });

  if (!response.ok) {
    throw new Error(
      await extrairMensagemErro(
        response,
        'Não foi possível cadastrar o cliente.'
      )
    );
  }

  return response.json();
}

export async function atualizarCliente(clienteId, dados) {
  const response = await fetch(`${API_URL}/clientes/${clienteId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(dados),
  });

  if (!response.ok) {
    throw new Error(
      await extrairMensagemErro(
        response,
        'Não foi possível atualizar o cliente.'
      )
    );
  }

  return response.json();
}

export async function excluirCliente(clienteId) {
  const response = await fetch(`${API_URL}/clientes/${clienteId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(
      await extrairMensagemErro(response, 'Não foi possível excluir o cliente.')
    );
  }

  return true;
}
