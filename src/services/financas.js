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

    const token = getAccessToken();
    const catMap = new Map();
    let outrosCatId = null;

    try {
      const catRes = await fetch(`${API_URL}/categorias-lancamento`, {
        ...(token && { headers: { Authorization: `Bearer ${token}` } }),
      });
      if (catRes.ok) {
        const categorias = await catRes.json();
        if (Array.isArray(categorias)) {
          categorias.forEach((c) => {
            const id = c.categoria_id || c.id;
            const nome = c.nome_categoria || c.nome;
            if (id) catMap.set(id, nome);
            if (nome && nome.toLowerCase() === 'outros') {
              outrosCatId = id;
            }
          });
        }
      }
    } catch {
      // Ignora erro ao obter categorias
    }

    const isOutros =
      Boolean(filters.categoria) &&
      filters.categoria.trim().toLowerCase() === 'outros';

    if (isOutros) {
      const queryString = queryParams.toString()
        ? `?${queryParams.toString()}`
        : '';
      const response = await fetch(`${API_URL}/lancamentos/${queryString}`, {
        cache: 'no-store',
        ...(token && { headers: { Authorization: `Bearer ${token}` } }),
      });
      if (!response.ok) return filters.page ? { itens: [], total: 0 } : [];
      const dados = await response.json();
      const todos = Array.isArray(dados)
        ? dados.map((d) => {
            const l = toLancamento(d);
            if (l.categoria_id && catMap.has(l.categoria_id)) {
              l.categoria = catMap.get(l.categoria_id);
            }
            return l;
          })
        : [];
      const outrosItens = todos.filter((item) => {
        if (!item.categoria_id) return true;
        if (outrosCatId && item.categoria_id === outrosCatId) return true;
        return item.categoria.toLowerCase() === 'outros';
      });

      if (filters.page) {
        const page = Number(filters.page) || 1;
        const pageSize = Number(filters.page_size) || 5;
        const start = (page - 1) * pageSize;
        return {
          itens: outrosItens.slice(start, start + pageSize),
          total: outrosItens.length,
          page,
          page_size: pageSize,
          total_pages: Math.ceil(outrosItens.length / pageSize) || 1,
        };
      }
      return outrosItens;
    }

    if (filters.categoria) {
      let matchedId = null;
      for (const [id, nome] of catMap.entries()) {
        if (nome && nome.toLowerCase() === filters.categoria.toLowerCase()) {
          matchedId = id;
          break;
        }
      }
      if (matchedId) {
        queryParams.append('categoria_id', matchedId);
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
      const itensMapeados = Array.isArray(dados.itens)
        ? dados.itens.map((d) => {
            const l = toLancamento(d);
            if (l.categoria_id && catMap.has(l.categoria_id)) {
              l.categoria = catMap.get(l.categoria_id);
            }
            return l;
          })
        : [];
      return {
        ...dados,
        itens: itensMapeados,
      };
    } else {
      const response = await fetch(`${API_URL}/lancamentos/${queryString}`, {
        cache: 'no-store',
        ...(token && { headers: { Authorization: `Bearer ${token}` } }),
      });
      if (!response.ok) return [];
      const dados = await response.json();
      return Array.isArray(dados)
        ? dados.map((d) => {
            const l = toLancamento(d);
            if (l.categoria_id && catMap.has(l.categoria_id)) {
              l.categoria = catMap.get(l.categoria_id);
            }
            return l;
          })
        : [];
    }
  } catch {
    return filters.page ? { itens: [], total: 0 } : [];
  }
}

export async function obterResumoFinancas(filters = {}) {
  try {
    const isOutros =
      Boolean(filters.categoria) &&
      filters.categoria.trim().toLowerCase() === 'outros';

    if (isOutros) {
      const itens = await listarFinancas({ ...filters, page: undefined });
      const realizado = { quantidade: 0, total_entradas: 0, total_saidas: 0 };
      const pendente = { quantidade: 0, total_entradas: 0, total_saidas: 0 };
      const atrasado = { quantidade: 0, total_entradas: 0, total_saidas: 0 };

      itens.forEach((item) => {
        const status = item.status?.toLowerCase();
        const target =
          status === 'realizado'
            ? realizado
            : status === 'atrasado'
              ? atrasado
              : pendente;
        target.quantidade += 1;
        if (item.tipo === 'entrada') {
          target.total_entradas += Number(item.valor) || 0;
        } else {
          target.total_saidas += Number(item.valor) || 0;
        }
      });

      return { realizado, pendente, atrasado };
    }

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
            (c) =>
              (c.nome_categoria || c.nome || '').toLowerCase() ===
              filters.categoria.toLowerCase()
          );
          if (cat)
            queryParams.append('categoria_id', cat.categoria_id || cat.id);
        }
      } catch {
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
