import { API_URL } from './api';
import { getAccessToken } from '@/utils/authSession';
import { parseApiError, toApiLancamento, toLancamento } from '@/utils/financas';

export async function listarFinancas(filters = {}) {
  try {
    const queryParams = new URLSearchParams();

    if (filters.inicio) queryParams.append('inicio', filters.inicio);
    if (filters.fim) queryParams.append('fim', filters.fim);
    if (filters.tipo) queryParams.append('tipo', filters.tipo);
    if (filters.situacao) queryParams.append('status', filters.situacao);

    if (filters.categoria) {
      try {
        const token = getAccessToken();
        const catRes = await fetch(`${API_URL}/categorias-lancamento`, {
          ...(token && { headers: { Authorization: `Bearer ${token}` } }),
        });
        if (catRes.ok) {
          const categorias = await catRes.json();
          const cat = categorias.find(
            (c) => c.nome_categoria === filters.categoria
          );
          if (cat) queryParams.append('categoria_id', cat.categoria_id);
        }
      } catch (e) {
        // ignora
      }
    }

    if (filters.categoria_id)
      queryParams.append('categoria_id', filters.categoria_id);
    if (filters.cliente_id)
      queryParams.append('cliente_id', filters.cliente_id);
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.page_size) queryParams.append('page_size', filters.page_size);

    const queryString = queryParams.toString()
      ? `?${queryParams.toString()}`
      : '';

    const token = getAccessToken();

    if (filters.page) {
      const response = await fetch(
        `${API_URL}/lancamentos/paginado${queryString}`,
        {
          cache: 'no-store',
          ...(token && { headers: { Authorization: `Bearer ${token}` } }),
        }
      );
      if (!response.ok) return { itens: [], total: 0 };
      const dados = await response.json();
      return {
        ...dados,
        itens: Array.isArray(dados.itens) ? dados.itens.map(toLancamento) : [],
      };
    } else {
      const response = await fetch(`${API_URL}/lancamentos/${queryString}`, {
        cache: 'no-store',
        ...(token && { headers: { Authorization: `Bearer ${token}` } }),
      });
      if (!response.ok) return [];
      const dados = await response.json();
      return Array.isArray(dados) ? dados.map(toLancamento) : [];
    }
  } catch {
    return filters.page ? { itens: [], total: 0 } : [];
  }
}

export async function obterResumoFinancas(filters = {}) {
  try {
    const queryParams = new URLSearchParams();
    if (filters.inicio) queryParams.append('inicio', filters.inicio);
    if (filters.fim) queryParams.append('fim', filters.fim);
    if (filters.tipo) queryParams.append('tipo', filters.tipo);
    if (filters.situacao) queryParams.append('status', filters.situacao);

    if (filters.categoria) {
      try {
        const token = getAccessToken();
        const catRes = await fetch(`${API_URL}/categorias-lancamento`, {
          ...(token && { headers: { Authorization: `Bearer ${token}` } }),
        });
        if (catRes.ok) {
          const categorias = await catRes.json();
          const cat = categorias.find(
            (c) => c.nome_categoria === filters.categoria
          );
          if (cat) queryParams.append('categoria_id', cat.categoria_id);
        }
      } catch (e) {
        // ignora
      }
    }
    if (filters.categoria_id)
      queryParams.append('categoria_id', filters.categoria_id);

    const queryString = queryParams.toString()
      ? `?${queryParams.toString()}`
      : '';
    const token = getAccessToken();
    const response = await fetch(
      `${API_URL}/lancamentos/resumo${queryString}`,
      {
        cache: 'no-store',
        ...(token && { headers: { Authorization: `Bearer ${token}` } }),
      }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function criarFinancas(dados) {
  const payload = toApiLancamento(dados);
  const token = getAccessToken();
  const response = await fetch(`${API_URL}/lancamentos/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
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
  const token = getAccessToken();
  const response = await fetch(`${API_URL}/lancamentos/${lancamentoId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
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
  const token = getAccessToken();
  const response = await fetch(`${API_URL}/lancamentos/${lancamentoId}`, {
    method: 'DELETE',
    ...(token && { headers: { Authorization: `Bearer ${token}` } }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      parseApiError(error, 'Não foi possível excluir o lançamento.')
    );
  }
}

export async function mudarStatusLancamento(lancamentoId, status) {
  const token = getAccessToken();
  const response = await fetch(
    `${API_URL}/lancamentos/${lancamentoId}/alternar-status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
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

export async function listarCategorias() {
  const token = getAccessToken();
  const response = await fetch(`${API_URL}/categorias-lancamento`, {
    cache: 'no-store',
    ...(token && { headers: { Authorization: `Bearer ${token}` } }),
  });
  if (!response.ok) return [];
  return response.json();
}

export async function criarCategoria(nome) {
  const token = getAccessToken();
  const response = await fetch(`${API_URL}/categorias-lancamento`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ nome_categoria: nome }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      parseApiError(error, 'Não foi possível criar a categoria.')
    );
  }
  return response.json();
}

export async function excluirCategoria(categoriaId) {
  const token = getAccessToken();
  const response = await fetch(
    `${API_URL}/categorias-lancamento/${categoriaId}`,
    {
      method: 'DELETE',
      ...(token && { headers: { Authorization: `Bearer ${token}` } }),
    }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      parseApiError(error, 'Não foi possível excluir a categoria.')
    );
  }
}
