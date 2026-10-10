import {
  buildProcessQuery,
  PROCESS_PAGE_SIZE,
  DEFAULT_PROCESS_PAGE,
  toProcessPage,
  toResponsavelNames,
  toResponsavelOptions,
} from '@/utils/processo';
import { listarFuncionarios } from '@/services/funcionarios';
import { API_URL } from './api';

const validationFieldLabels = {
  id: 'Número do processo',
  titulo: 'Título do caso',
  cliente: 'Cliente',
  status: 'Status',
  tribunal: 'Tribunal',
  area: 'Área de atuação',
  responsavel: 'Responsável',
  prazo: 'Próximo prazo',
  diasRestantes: 'Dias restantes',
};

const getErrorMessage = async (response, fallbackMessage) => {
  const error = await response.json().catch(() => null);

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
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, options);
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

export function listarProcessos(filtros = {}) {
  const query = buildProcessQuery(filtros);

  return request(
    `/processos/${query ? `?${query}` : ''}`,
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

export async function getProcessosData() {
  try {
    const [page, funcionarios] = await Promise.all([
      listarProcessos({ page: 1, pageSize: PROCESS_PAGE_SIZE }),
      listarFuncionarios(),
    ]);

    const responsaveis = toResponsavelOptions(funcionarios);
    const initialPage = toProcessPage(page, toResponsavelNames(responsaveis));

    return { initialPage, responsaveis, initialError: '' };
  } catch (error) {
    return {
      initialPage: DEFAULT_PROCESS_PAGE,
      responsaveis: [],
      initialError:
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os processos.',
    };
  }
}
