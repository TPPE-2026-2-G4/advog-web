import { API_URL } from './api';
import { getAccessToken } from '@/utils/authSession';

const validationFieldLabels = {
  cnj: 'Número do processo',
  titulo: 'Título do caso',
  descricao: 'Descrição',
  status: 'Status',
  tribunal: 'Tribunal',
  area: 'Área de atuação',
  data_inicio: 'Data de início',
  data_realizado: 'Data de realização',
  data_prazo: 'Próximo prazo',
  cliente_id: 'Cliente',
  funcionario_id: 'Responsável',
};

const getErrorMessage = async (response, fallbackMessage) => {
  const error = await response.json().catch(() => null);

  if (response.status === 401) return 'Sessão expirada. Faça login novamente.';
  if (response.status === 403) {
    return 'Você não possui permissão para realizar esta ação.';
  }

  if (typeof error?.detail === 'string') return error.detail;

  if (Array.isArray(error?.detail)) {
    const messages = error.detail
      .map((validationError) => {
        const field = validationError.loc?.at(-1);
        const label = validationFieldLabels[field] || field;

        if (!label || !validationError.msg) return null;
        if (validationError.type === 'missing') {
          return `${label}: campo obrigatório.`;
        }

        return `${label}: ${validationError.msg}`;
      })
      .filter(Boolean);

    if (messages.length > 0) return messages.join(' ');
  }

  return fallbackMessage;
};

const request = async (path, options, fallbackMessage) => {
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
    throw new Error(await getErrorMessage(response, fallbackMessage));
  }

  if (response.status === 204) return undefined;

  try {
    return await response.json();
  } catch {
    throw new Error(fallbackMessage);
  }
};

export function listarProcessos() {
  return request(
    '/processos/',
    { cache: 'no-store' },
    'Não foi possível carregar os processos.'
  );
}

export function criarProcesso(dados) {
  return request(
    '/processos/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    },
    'Não foi possível cadastrar o processo.'
  );
}

export function atualizarProcesso(processoId, dados) {
  return request(
    `/processos/${encodeURIComponent(processoId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    },
    'Não foi possível atualizar o processo.'
  );
}

export function excluirProcesso(processoId) {
  return request(
    `/processos/${encodeURIComponent(processoId)}`,
    { method: 'DELETE' },
    'Não foi possível excluir o processo.'
  );
}
