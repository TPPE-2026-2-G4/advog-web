export const PROCESS_STATUS = Object.freeze([
  'Em Análise',
  'Ativo',
  'Concluído',
  'Arquivado',
]);

export const PROCESS_PAGE_SIZE = 5;

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
    responsavel_id: filters.responsavelId,
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
