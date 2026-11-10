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

export async function obterGraficoFinancas(filters = {}) {
  try {
    const token = getAccessToken();
    const queryParams = new URLSearchParams();

    if (filters.inicio) queryParams.append('inicio', filters.inicio);
    if (filters.fim) queryParams.append('fim', filters.fim);
    if (
      filters.dias !== undefined &&
      filters.dias !== null &&
      String(filters.dias).trim() !== ''
    ) {
      queryParams.append('dias', String(filters.dias));
    }
    if (
      filters.valor_min !== undefined &&
      filters.valor_min !== null &&
      String(filters.valor_min).trim() !== ''
    ) {
      queryParams.append('valor_min', String(filters.valor_min));
    }
    if (
      filters.valor_max !== undefined &&
      filters.valor_max !== null &&
      String(filters.valor_max).trim() !== ''
    ) {
      queryParams.append('valor_max', String(filters.valor_max));
    }
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.tipo) queryParams.append('tipo', filters.tipo);
    if (filters.categoria_id)
      queryParams.append('categoria_id', filters.categoria_id);
    if (filters.cliente_id)
      queryParams.append('cliente_id', filters.cliente_id);

    const queryString = queryParams.toString()
      ? `?${queryParams.toString()}`
      : '';
    const response = await fetch(
      `${API_URL}/lancamentos/grafico${queryString}`,
      {
        cache: 'no-store',
        ...(token && { headers: { Authorization: `Bearer ${token}` } }),
      }
    );

    if (!response.ok) return null;
    const dados = await response.json();
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
      return null;
    }
    return {
      ...dados,
      itens: Array.isArray(dados.itens) ? dados.itens : [],
    };
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
  delete payload.rrule;
  const token = getAccessToken();
  const alcance = dados.alcance === 'serie' ? '?alcance=serie' : '';
  const response = await fetch(
    `${API_URL}/lancamentos/${lancamentoId}${alcance}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      parseApiError(error, 'Não foi possível atualizar o lançamento.')
    );
  }

  const updated = await response.json();
  return toLancamento(updated);
}

export async function excluirFinancas(lancamentoId, alcance = 'individual') {
  const token = getAccessToken();
  const query = alcance === 'serie' ? '?alcance=serie' : '';
  const response = await fetch(
    `${API_URL}/lancamentos/${lancamentoId}${query}`,
    {
      method: 'DELETE',
      ...(token && { headers: { Authorization: `Bearer ${token}` } }),
    }
  );

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

export async function exportarFinancas(filters = {}, formato = 'pdf') {
  const fallbackMessage = 'Não foi possível exportar os lançamentos.';
  const token = getAccessToken();
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');

  const params = new URLSearchParams({ formato });
  if (filters.inicio) params.append('inicio', filters.inicio);
  if (filters.fim) params.append('fim', filters.fim);
  if (filters.tipo) params.append('tipo', filters.tipo);
  if (filters.situacao) params.append('status', filters.situacao);
  if (filters.categoria_id) params.append('categoria_id', filters.categoria_id);
  if (filters.cliente_id) params.append('cliente_id', filters.cliente_id);

  let response;

  try {
    response = await fetch(`${API_URL}/lancamentos/exportar?${params}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    if (response.status === 403) {
      throw new Error(
        'Você não possui permissão para exportar os dados financeiros.'
      );
    }
    const error = await response.json().catch(() => null);
    throw new Error(parseApiError(error, fallbackMessage));
  }

  return response.blob();
}

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

export async function obterCalendario(filters = {}) {
  try {
    const token = getAccessToken();
    const queryParams = new URLSearchParams();

    if (filters.inicio) queryParams.append('inicio', filters.inicio);
    if (filters.fim) queryParams.append('fim', filters.fim);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.tipo) queryParams.append('tipo', filters.tipo);
    if (filters.categoria_id)
      queryParams.append('categoria_id', filters.categoria_id);
    if (filters.cliente_id)
      queryParams.append('cliente_id', filters.cliente_id);

    const queryString = queryParams.toString()
      ? `?${queryParams.toString()}`
      : '';
    const response = await fetch(
      `${API_URL}/lancamentos/calendario${queryString}`,
      {
        cache: 'no-store',
        ...(token && { headers: { Authorization: `Bearer ${token}` } }),
      }
    );

    if (!response.ok) return [];
    const dados = await response.json();
    return Array.isArray(dados) ? dados.map(toLancamento) : [];
  } catch {
    return [];
  }
}

export async function exportarCalendarioIcs(filters = {}) {
  const token = getAccessToken();
  const queryParams = new URLSearchParams();

  if (filters.inicio) queryParams.append('inicio', filters.inicio);
  if (filters.fim) queryParams.append('fim', filters.fim);
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.tipo) queryParams.append('tipo', filters.tipo);
  if (filters.categoria_id)
    queryParams.append('categoria_id', filters.categoria_id);
  if (filters.cliente_id) queryParams.append('cliente_id', filters.cliente_id);

  const queryString = queryParams.toString()
    ? `?${queryParams.toString()}`
    : '';
  const response = await fetch(
    `${API_URL}/lancamentos/calendario/exportar${queryString}`,
    {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      parseApiError(error, 'Não foi possível exportar o calendário.')
    );
  }

  const blob = await response.blob();
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calendario_financeiro.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
  return blob;
}
