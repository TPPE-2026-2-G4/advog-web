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
  const token = options?.token || getAccessToken();
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

export function listarProcessos(filtros = {}) {
  const { token, ...rest } = filtros;
  const query = buildProcessQuery(rest);

  return request(
    `/processos/${query ? `?${query}` : ''}`,
    { cache: 'no-store', token },
    'Não foi possível carregar os processos.'
  );
}

export async function obterProcesso(processoId) {
  const page = await request(
    `/processos/?processo_id=${encodeURIComponent(processoId)}&page_size=1`,
    { cache: 'no-store' },
    'Não foi possível atualizar os detalhes do processo.'
  );
  return page.itens[0] ?? null;
}

export async function listarProcessosCriticos({
  diasSemMovimentacao = 15,
  funcionarioId,
} = {}) {
  const params = new URLSearchParams();
  if (diasSemMovimentacao !== undefined && diasSemMovimentacao !== null) {
    params.set('dias_sem_movimentacao', String(diasSemMovimentacao));
  }
  if (funcionarioId !== undefined && funcionarioId !== null) {
    params.set('funcionario_id', String(funcionarioId));
  }
  const query = params.toString();
  const data = await request(
    `/processos/criticos/${query ? `?${query}` : ''}`,
    { cache: 'no-store' },
    'Não foi possível carregar os processos críticos.'
  );

  if (!Array.isArray(data)) {
    throw new Error('Não foi possível carregar os processos críticos.');
  }

  return data;
}

export function sincronizarProcessos() {
  return request(
    '/processos/sincronizar',
    { method: 'POST' },
    'Não foi possível sincronizar com o DataJud. Tente novamente.'
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

export function listarDocumentos(processoId) {
  return request(
    `/processos/${encodeURIComponent(processoId)}/documentos`,
    { method: 'GET' },
    'Não foi possível carregar os documentos.'
  );
}

export function uploadDocumento(processoId, file) {
  const formData = new FormData();
  formData.append('file', file);
  return request(
    `/processos/${encodeURIComponent(processoId)}/documentos`,
    {
      method: 'POST',
      body: formData,
    },
    'Não foi possível enviar o documento.'
  );
}

export function obterUrlDocumento(processoId, documentoId) {
  return request(
    `/processos/${encodeURIComponent(processoId)}/documentos/${encodeURIComponent(documentoId)}/url`,
    { method: 'GET' },
    'Não foi possível obter o link do documento.'
  );
}

export function excluirDocumento(processoId, documentoId) {
  return request(
    `/processos/${encodeURIComponent(processoId)}/documentos/${encodeURIComponent(documentoId)}`,
    { method: 'DELETE' },
    'Não foi possível excluir o documento.'
  );
}

export function obterResumoProcessos({
  diasProximoPrazo = 7,
  funcionarioId,
} = {}) {
  const params = new URLSearchParams();
  if (diasProximoPrazo !== undefined && diasProximoPrazo !== null) {
    params.set('dias_proximo_prazo', String(diasProximoPrazo));
  }
  if (funcionarioId !== undefined && funcionarioId !== null) {
    params.set('funcionario_id', String(funcionarioId));
  }
  const query = params.toString();
  return request(
    `/processos/resumo${query ? `?${query}` : ''}`,
    { cache: 'no-store' },
    'Não foi possível carregar o resumo de processos.'
  );
}

export async function getProcessosData({ token } = {}) {
  try {
    const [page, funcionarios] = await Promise.all([
      listarProcessos({ page: 1, pageSize: PROCESS_PAGE_SIZE, token }),
      listarFuncionarios(),
    ]);

    const responsaveis = toResponsavelOptions(funcionarios);
    const initialPage = toProcessPage(page);

    return { initialPage, responsaveis, initialError: '' };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (
      message.includes('Sessão expirada') &&
      typeof window === 'undefined' &&
      !token
    ) {
      return {
        initialPage: DEFAULT_PROCESS_PAGE,
        responsaveis: [],
        initialError: '',
      };
    }
    return {
      initialPage: DEFAULT_PROCESS_PAGE,
      responsaveis: [],
      initialError: message || 'Não foi possível carregar os processos.',
    };
  }
}
