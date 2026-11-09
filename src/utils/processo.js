export const PROCESS_STATUS = Object.freeze([
  'Em Análise',
  'Ativo',
  'Concluído',
  'Arquivado',
]);

export const FINALIZED_PROCESS_STATUS = Object.freeze([
  'Concluído',
  'Arquivado',
]);

export const PROCESS_PAGE_SIZE = 5;

export const EMPTY_PROCESS_SUMMARY = Object.freeze({
  total: 0,
  em_andamento: 0,
  em_analise: 0,
  finalizados: 0,
  proximos_do_prazo: 0,
  atrasados: 0,
});

export const formatarResumoProcessos = (summary) => ({
  total: Number(summary?.total || 0),
  em_andamento: Number(summary?.em_andamento || 0),
  em_analise: Number(summary?.em_analise || 0),
  finalizados: Number(summary?.finalizados || 0),
  proximos_do_prazo: Number(summary?.proximos_do_prazo || 0),
  atrasados: Number(summary?.atrasados || 0),
});

export const DEFAULT_PROCESS_PAGE = {
  itens: [],
  total: 0,
  page: 1,
  pageSize: PROCESS_PAGE_SIZE,
  totalPages: 1,
};

export const CNJ_PATTERN = '^\\d{7}-\\d{2}\\.\\d{4}\\.\\d\\.\\d{2}\\.\\d{4}$';
export const CNJ_REGEX = new RegExp(CNJ_PATTERN);
const CNJ_DIGIT_LIMIT = 20;

const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const BR_DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

const formatUtcDateIso = (utcTimestamp) => {
  const date = new Date(utcTimestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isValidDateParts = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

export function normalizeProcessDate(value) {
  if (!value) return '';

  const text = String(value).trim().slice(0, 10);
  const isoMatch = text.match(ISO_DATE_REGEX);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return isValidDateParts(Number(year), Number(month), Number(day))
      ? `${year}-${month}-${day}`
      : '';
  }

  const brMatch = text.match(BR_DATE_REGEX);
  if (!brMatch) return '';

  const [, day, month, year] = brMatch;
  return isValidDateParts(Number(year), Number(month), Number(day))
    ? `${year}-${month}-${day}`
    : '';
}

export function formatProcessDate(value) {
  const normalizedDate = normalizeProcessDate(value);
  if (!normalizedDate) return value || 'Não informado';

  const [year, month, day] = normalizedDate.split('-');
  return `${day}/${month}/${year}`;
}

export function calculateRemainingDays(value, now = new Date()) {
  const normalizedDate = normalizeProcessDate(value);
  if (!normalizedDate) return null;

  const [year, month, day] = normalizedDate.split('-').map(Number);
  const deadline = Date.UTC(year, month - 1, day);
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );

  return Math.round((deadline - today) / DAY_IN_MILLISECONDS);
}

export function isOverdueDeadline(value, now = new Date()) {
  const remainingDays = calculateRemainingDays(value, now);
  return remainingDays !== null && remainingDays < 0;
}

export function getUpcomingDeadlineWindow(days = 15, now = new Date()) {
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const safeDays = Math.max(0, Number(days) || 0);
  const endUtc = todayUtc + safeDays * DAY_IN_MILLISECONDS;

  return {
    prazoInicio: formatUtcDateIso(todayUtc),
    prazoFim: formatUtcDateIso(endUtc),
  };
}

export function getDeadlineTone(remainingDays) {
  if (remainingDays <= 3) return 'danger';
  if (remainingDays <= 5) return 'warning';
  return 'success';
}

export function formatDeadlineCountdown(remainingDays) {
  if (remainingDays === 0) return 'Vence hoje';
  return `Vence em: ${remainingDays} dia(s)`;
}

export function getUpcomingProcesses(
  processes = [],
  { days = 15, limit = 5, now = new Date() } = {}
) {
  const safeList = Array.isArray(processes) ? processes : [];

  return safeList
    .filter(
      (process) => process && !FINALIZED_PROCESS_STATUS.includes(process.status)
    )
    .map((process) => ({
      ...process,
      dias_restantes: calculateRemainingDays(process.data_prazo, now),
    }))
    .filter(
      (process) =>
        process.dias_restantes !== null &&
        process.dias_restantes >= 0 &&
        process.dias_restantes <= days
    )
    .sort((a, b) => {
      if (a.dias_restantes !== b.dias_restantes) {
        return a.dias_restantes - b.dias_restantes;
      }
      const idA = Number(a.processo_id ?? a.id ?? 0);
      const idB = Number(b.processo_id ?? b.id ?? 0);
      return idA - idB;
    })
    .slice(0, limit);
}

export function calculateDaysSince(value, now = new Date()) {
  const normalizedDate = normalizeProcessDate(value);
  if (!normalizedDate) return null;

  const [year, month, day] = normalizedDate.split('-').map(Number);
  const eventDate = Date.UTC(year, month - 1, day);
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );

  return Math.max(0, Math.round((today - eventDate) / DAY_IN_MILLISECONDS));
}

export function toProcessApiDate(value) {
  const normalizedDate = normalizeProcessDate(value);
  return normalizedDate ? `${normalizedDate}T00:00:00` : null;
}

export function formatCnjInput(value) {
  const digits = String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, CNJ_DIGIT_LIMIT);

  if (digits.length <= 7) return digits;

  let formatted = `${digits.slice(0, 7)}-${digits.slice(7, 9)}`;
  if (digits.length > 9) formatted += `.${digits.slice(9, 13)}`;
  if (digits.length > 13) formatted += `.${digits.slice(13, 14)}`;
  if (digits.length > 14) formatted += `.${digits.slice(14, 16)}`;
  if (digits.length > 16) formatted += `.${digits.slice(16, 20)}`;

  return formatted;
}

export function toProcessPayload(formData, { includeCnj = true } = {}) {
  const payload = {
    titulo: formData.titulo.trim(),
    descricao: formData.descricao.trim() || null,
    status: formData.status,
    tribunal: formData.tribunal.trim(),
    area: formData.area.trim(),
    data_inicio: toProcessApiDate(formData.data_inicio),
    data_realizado: toProcessApiDate(formData.data_realizado),
    data_prazo: toProcessApiDate(formData.data_prazo),
    cliente_id: Number(formData.cliente_id),
    funcionario_id: formData.funcionario_id
      ? Number(formData.funcionario_id)
      : null,
  };

  if (includeCnj) payload.cnj = formData.cnj.trim();
  return payload;
}

export function toProcessUpdatePayload(formData, originalProcess) {
  const currentPayload = toProcessPayload(formData, { includeCnj: false });
  const originalPayload = toProcessPayload(toProcessFormData(originalProcess), {
    includeCnj: false,
  });

  return Object.fromEntries(
    Object.entries(currentPayload).filter(
      ([field, value]) => value !== originalPayload[field]
    )
  );
}

export function toProcessFormData(processo) {
  const data = processo ?? {};

  return {
    cnj: data.cnj ?? '',
    titulo: data.titulo ?? '',
    descricao: data.descricao ?? '',
    status: data.status ?? 'Em Análise',
    tribunal: data.tribunal ?? '',
    area: data.area ?? '',
    data_inicio: normalizeProcessDate(data.data_inicio),
    data_realizado: normalizeProcessDate(data.data_realizado),
    data_prazo: normalizeProcessDate(data.data_prazo),
    cliente_id: data.cliente_id == null ? '' : String(data.cliente_id),
    funcionario_id:
      data.funcionario_id == null ? '' : String(data.funcionario_id),
  };
}

export function buildProcessQuery(filters = {}) {
  const params = new URLSearchParams();
  const values = {
    busca: filters.busca?.trim(),
    status: filters.status,
    funcionario_id: filters.responsavelId,
    prazo_inicio: normalizeProcessDate(filters.prazoInicio),
    prazo_fim: normalizeProcessDate(filters.prazoFim),
    page: filters.page,
    page_size: filters.pageSize,
  };

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });

  return params.toString();
}

export function hasInvalidDateRange(startDate, endDate) {
  const start = normalizeProcessDate(startDate);
  const end = normalizeProcessDate(endDate);

  return Boolean(start && end && start > end);
}

export function toResponsavelOptions(funcionarios = []) {
  return funcionarios.map((funcionario) => ({
    value: String(funcionario.funcionario_id || funcionario.id),
    label: funcionario.nome,
  }));
}

export function toResponsavelNames(responsaveis = []) {
  return new Map(responsaveis.map(({ value, label }) => [value, label]));
}

export function toProcessView(processo, responsavelNames = new Map()) {
  return {
    id: processo.cnj ?? '',
    titulo: processo.titulo_proc,
    cliente: processo.cliente_id
      ? `Cliente nº ${processo.cliente_id}`
      : 'Não informado',
    status: processo.status,
    tribunal: processo.tribunal,
    area: processo.area,
    responsavel:
      responsavelNames.get(String(processo.responsavel_id)) ?? 'Não informado',
    prazo: normalizeProcessDate(processo.data_prazo),
  };
}

export function toProcessPage(page) {
  return {
    itens: (page.itens ?? []).map((processo) => processo),
    total: page.total ?? 0,
    page: page.page ?? 1,
    pageSize: page.page_size ?? 0,
    totalPages: page.total_pages ?? 1,
  };
}

export function sortCriticalProcesses(processes = []) {
  return [...processes].sort((a, b) => {
    const refDateA = normalizeProcessDate(a?.data_realizado || a?.data_inicio);
    const refDateB = normalizeProcessDate(b?.data_realizado || b?.data_inicio);

    if (refDateA && refDateB) {
      const cmp = refDateA.localeCompare(refDateB);
      if (cmp !== 0) return cmp;
    } else if (refDateA) {
      return -1;
    } else if (refDateB) {
      return 1;
    }

    const idA = Number(a?.processo_id ?? 0);
    const idB = Number(b?.processo_id ?? 0);
    return idB - idA;
  });
}

export function enrichProcess(
  process,
  clientNames = new Map(),
  employeeNames = new Map()
) {
  if (!process) return null;

  const procId = process.processo_id || process.id || process.cnj;
  const respId = process.responsavel_id || process.funcionario_id;
  const clienteId = process.cliente_id;
  const title = process.titulo_proc || process.titulo;
  const desc = process.descricao_proc || process.descricao;

  return {
    ...process,
    processo_id: procId,
    id: procId,
    titulo: title,
    descricao: desc,
    funcionario_id: respId,
    responsavel_id: respId,
    cliente:
      clientNames.get(clienteId) ??
      (clienteId ? `Cliente #${clienteId}` : 'Sem cliente'),
    responsavel: respId
      ? (employeeNames.get(respId) ?? `Responsável #${respId}`)
      : 'Sem responsável',
  };
}
