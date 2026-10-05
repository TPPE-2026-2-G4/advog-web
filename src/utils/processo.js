export const PROCESS_STATUS = Object.freeze([
  'Ativo',
  'Em Análise',
  'Concluído',
  'Pendente',
]);

export const PROCESS_PAGE_SIZE = 5;

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

export function toProcessPayload(formData, { includeId = true } = {}) {
  const prazo = normalizeProcessDate(formData.prazo);
  const payload = {
    titulo: formData.titulo.trim(),
    cliente: formData.cliente.trim(),
    status: formData.status,
    tribunal: formData.tribunal.trim(),
    area: formData.area.trim(),
    responsavel: formData.responsavel.trim(),
    prazo,
    diasRestantes: calculateRemainingDays(prazo),
  };

  if (includeId) payload.id = formData.id.trim();
  return payload;
}

export function toProcessFormData(processo) {
  const data = processo ?? {};

  return {
    id: data.id ?? '',
    titulo: data.titulo ?? '',
    cliente: data.cliente ?? '',
    status: data.status ?? 'Em Análise',
    tribunal: data.tribunal ?? '',
    area: data.area ?? '',
    responsavel: data.responsavel ?? '',
    prazo: normalizeProcessDate(data.prazo),
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
    value: String(funcionario.funcionario_id),
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

export function toProcessPage(page, responsavelNames = new Map()) {
  return {
    itens: (page.itens ?? []).map((processo) =>
      toProcessView(processo, responsavelNames)
    ),
    total: page.total ?? 0,
    page: page.page ?? 1,
    pageSize: page.page_size ?? 0,
    totalPages: page.total_pages ?? 1,
  };
}
