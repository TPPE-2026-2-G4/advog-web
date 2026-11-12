import { getAccessToken } from '@/utils/authSession';
import { normalizarNotificacao } from '@/utils/notificacao';
import { API_URL } from './api';

const BASE = `${API_URL.replace(/\/+$/, '')}/notificacoes`;

export class NotificacoesApiError extends Error {
  constructor(status, detail, message = detail || `Erro HTTP ${status}`) {
    super(message);
    this.name = 'NotificacoesApiError';
    this.status = status;
    this.detail = detail;
  }
}

const getErrorMessage = (status, detail, fallbackMessage) => {
  if (status === 401) return 'Sessão expirada. Faça login novamente.';
  if (status === 403) {
    return 'Você não possui permissão para realizar esta ação.';
  }
  if (status === 404) return 'Notificação não encontrada.';
  if (status === 429) {
    return 'Muitas tentativas em pouco tempo. Aguarde e tente novamente.';
  }
  return detail || fallbackMessage;
};

const request = async (path, options = {}, fallbackMessage) => {
  const token = getAccessToken();
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');

  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        Authorization: 'Bearer ' + token,
      },
      cache: 'no-store',
    });
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = typeof body?.detail === 'string' ? body.detail : undefined;
    throw new NotificacoesApiError(
      response.status,
      detail,
      getErrorMessage(response.status, detail, fallbackMessage)
    );
  }

  if (response.status === 204) return undefined;

  try {
    return await response.json();
  } catch {
    throw new Error(fallbackMessage);
  }
};

export async function listarNotificacoes({
  limite = 20,
  offset = 0,
  apenasNaoLidas = false,
  tipo,
} = {}) {
  const params = new URLSearchParams({
    limite: String(limite),
    offset: String(offset),
    apenas_nao_lidas: String(apenasNaoLidas),
  });
  if (tipo) params.set('tipo', tipo);

  const data = await request(
    '?' + params.toString(),
    {},
    'Não foi possível carregar as notificações.'
  );
  if (!Array.isArray(data)) {
    throw new NotificacoesApiError(
      200,
      undefined,
      'Resposta inválida ao carregar as notificações.'
    );
  }

  return data.map(normalizarNotificacao);
}

export async function obterContagemNaoLidas() {
  const data = await request(
    '/nao-lidas/contagem',
    {},
    'Não foi possível carregar a contagem de notificações.'
  );
  return Number(data?.total_nao_lidas ?? 0);
}

export const obterContagemNotificacoes = obterContagemNaoLidas;

export async function marcarNotificacaoComoLida(id) {
  const data = await request(
    `/${encodeURIComponent(id)}/lida`,
    {
      method: 'PATCH',
    },
    'Não foi possível marcar a notificação como lida.'
  );
  return data ? normalizarNotificacao(data) : undefined;
}

export function marcarTodasNotificacoesComoLidas() {
  return request(
    '/marcar-todas-lidas',
    { method: 'PATCH' },
    'Não foi possível marcar todas as notificações como lidas.'
  );
}
