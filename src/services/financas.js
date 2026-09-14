import { API_URL } from './api';
import { parseApiError, toApiLancamento, toLancamento } from '@/utils/financas';

export async function listarFinancas() {
  try {
    const response = await fetch(`${API_URL}/lancamentos/`, {
      cache: 'no-store',
    });

    if (!response.ok) return [];

    const dados = await response.json();
    return Array.isArray(dados) ? dados.map(toLancamento) : [];
  } catch {
    return [];
  }
}

export async function criarFinancas(dados) {
  const payload = toApiLancamento(dados);
  const response = await fetch(`${API_URL}/lancamentos/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      parseApiError(error, 'Não foi possível cadastrar o lançamento.')
    );
  }

  const created = await response.json();
  return toLancamento(created);
}

export async function atualizarFinancas(lancamentoId, dados) {
  const payload = toApiLancamento(dados);
  const response = await fetch(`${API_URL}/lancamentos/${lancamentoId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      parseApiError(error, 'Não foi possível atualizar o lançamento.')
    );
  }

  const updated = await response.json();
  return toLancamento(updated);
}

export async function excluirFinancas(lancamentoId) {
  const response = await fetch(`${API_URL}/lancamentos/${lancamentoId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      parseApiError(error, 'Não foi possível excluir o lançamento.')
    );
  }
}

export async function mudarStatusLancamento(lancamentoId, status) {
  const rawStatus = typeof status === 'object' ? status?.status : status;
  const capitalizedStatus =
    rawStatus && typeof rawStatus === 'string'
      ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase()
      : 'Pendente';

  const payload = { status: capitalizedStatus };
  const response = await fetch(
    `${API_URL}/lancamentos/${lancamentoId}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      parseApiError(error, 'Não foi possível atualizar o status do lançamento.')
    );
  }

  const result = await response.json();
  return toLancamento(result);
}

export const listarLancamentos = listarFinancas;
export const criarLancamento = criarFinancas;
export const atualizarLancamento = atualizarFinancas;
export const excluirLancamento = excluirFinancas;
