export function formatCurrency(val) {
  if (val === undefined || val === null || isNaN(Number(val))) return 'R$ 0,00';
  return `R$ ${Number(val).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateToBr(isoDate) {
  if (!isoDate) return '';
  const cleanDate = String(isoDate).split('T')[0].trim();
  if (cleanDate.includes('/')) return cleanDate;
  const [year, month, day] = cleanDate.split('-');
  if (!year || !month || !day) return cleanDate;
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

export function formatDateToIso(brDate) {
  if (!brDate) return '';
  const cleanDate = String(brDate).split('T')[0].trim();
  if (cleanDate.includes('-')) return cleanDate;
  const [day, month, year] = cleanDate.split('/');
  if (!year || !month || !day) return cleanDate;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function isStatusConcluido(status) {
  const s = status?.toLowerCase();
  return s === 'pago' || s === 'recebido';
}

export function getStatusConcluido(tipo) {
  return tipo?.toLowerCase() === 'entrada' ? 'recebido' : 'pago';
}

export function formatStatusLabel(status, tipo) {
  const s = status?.toLowerCase();
  if (s === 'pago' || s === 'recebido') {
    return tipo?.toLowerCase() === 'entrada' ? 'Recebido' : 'Pago';
  }
  if (s === 'atrasado') return 'Atrasado';
  return 'Pendente';
}

export function verificarStatusPorVencimento(
  item,
  dataReferencia = new Date()
) {
  if (!item) return 'pendente';

  const vencimentoStr =
    item.dataVencimentoIso ||
    item.dataVencimento ||
    item.data_vencimento ||
    item.dataIso ||
    item.data;

  if (!vencimentoStr) return 'pendente';

  let vencimentoDate;
  if (typeof vencimentoStr === 'string' && vencimentoStr.includes('/')) {
    const [day, month, year] = vencimentoStr.split('/');
    vencimentoDate = new Date(Number(year), Number(month) - 1, Number(day));
  } else {
    const [year, month, day] = String(vencimentoStr).split('T')[0].split('-');
    vencimentoDate = new Date(Number(year), Number(month) - 1, Number(day));
  }

  if (isNaN(vencimentoDate.getTime())) return 'pendente';

  const ref = new Date(dataReferencia);
  ref.setHours(0, 0, 0, 0);
  vencimentoDate.setHours(0, 0, 0, 0);

  return vencimentoDate < ref ? 'atrasado' : 'pendente';
}

export function calcularResumoFinanceiro(lancamentos = []) {
  return lancamentos.reduce(
    (acc, item) => {
      const valor = Number(item.valor) || 0;
      const tipo = item.tipo?.toLowerCase();

      if (tipo === 'entrada') {
        acc.totalEntradas += valor;
        acc.saldo += valor;
      } else if (tipo === 'saida') {
        acc.totalSaidas += valor;
        acc.saldo -= valor;
      }

      return acc;
    },
    { totalEntradas: 0, totalSaidas: 0, saldo: 0 }
  );
}

export function parseApiError(
  error,
  defaultMessage = 'Ocorreu um erro na requisição.'
) {
  if (!error) return defaultMessage;
  if (typeof error === 'string') return error;
  if (typeof error.detail === 'string') return error.detail;
  if (Array.isArray(error.detail)) {
    const messages = error.detail
      .map((d) => {
        if (typeof d === 'string') return d;
        if (d && typeof d === 'object' && d.msg) {
          const loc = Array.isArray(d.loc)
            ? d.loc.filter((part) => part !== 'body').join('.')
            : '';
          return loc ? `${loc}: ${d.msg}` : d.msg;
        }
        return JSON.stringify(d);
      })
      .filter(Boolean);
    if (messages.length > 0) return messages.join('; ');
  }
  if (error.detail && typeof error.detail === 'object') {
    return JSON.stringify(error.detail);
  }
  if (typeof error.message === 'string') return error.message;
  return defaultMessage;
}

export function toLancamento(apiItem) {
  if (!apiItem) return null;
  const rawId = apiItem.lancamento_id ?? apiItem.id;

  const rawVencimento =
    apiItem.data_vencimento ||
    apiItem.dataVencimentoIso ||
    apiItem.dataVencimento ||
    apiItem.data ||
    '';
  const vencimentoBr = formatDateToBr(rawVencimento);
  const vencimentoIso = formatDateToIso(rawVencimento);

  const rawPagamento =
    apiItem.data_pagamento ||
    apiItem.dataPagamentoIso ||
    apiItem.dataPagamento ||
    '';
  const pagamentoBr = formatDateToBr(rawPagamento);
  const pagamentoIso = formatDateToIso(rawPagamento);

  const rawData = apiItem.data || apiItem.dataIso || '';
  const dataBrFallback = formatDateToBr(rawData);
  const dataIsoFallback = formatDateToIso(rawData);

  const dataBr = pagamentoBr || dataBrFallback || vencimentoBr;
  const dataIso = pagamentoIso || dataIsoFallback || vencimentoIso;

  const rawTipo = String(apiItem.tipo || '').toLowerCase();
  const tipo = rawTipo === 'saída' || rawTipo === 'saida' ? 'saida' : 'entrada';
  const status = (apiItem.status || 'Pendente').toLowerCase();

  return {
    ...apiItem,
    id: rawId,
    lancamento_id: rawId,
    tipo,
    titulo: apiItem.titulo || '',
    descricao: apiItem.descricao || '',
    valor: Number(apiItem.valor) || 0,
    data: dataBr,
    dataIso: dataIso,
    dataPagamento: pagamentoBr || null,
    dataPagamentoIso: pagamentoIso || null,
    data_pagamento: pagamentoIso || null,
    dataVencimento: vencimentoBr || dataBr,
    dataVencimentoIso: vencimentoIso || dataIso,
    data_vencimento: vencimentoIso || dataIso,
    categoria: apiItem.categoria || 'Outros',
    status,
    recorrente: Boolean(apiItem.recorrente),
  };
}

export function toApiLancamento(item) {
  if (!item) return {};
  const isSaida =
    item.tipo?.toLowerCase() === 'saida' ||
    item.tipo?.toLowerCase() === 'saída';
  const tipo = isSaida ? 'Saída' : 'Entrada';

  const rawVencimento =
    item.dataVencimentoIso ||
    item.dataVencimento ||
    item.data_vencimento ||
    item.dataIso ||
    item.data ||
    new Date().toISOString().split('T')[0];
  const vencimento = formatDateToIso(rawVencimento) || rawVencimento;

  const rawPagamento =
    item.dataPagamentoIso !== undefined
      ? item.dataPagamentoIso
      : item.dataPagamento !== undefined
        ? item.dataPagamento
        : item.data_pagamento !== undefined
          ? item.data_pagamento
          : null;

  const pagamento = rawPagamento
    ? formatDateToIso(rawPagamento) || rawPagamento
    : null;

  let rawStatus = item.status || 'Pendente';

  if (!isStatusConcluido(rawStatus)) {
    rawStatus = verificarStatusPorVencimento({
      ...item,
      dataVencimentoIso: vencimento,
    });
  }

  const status =
    rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

  return {
    tipo,
    titulo: item.titulo?.trim() || '',
    descricao: item.descricao?.trim() || null,
    valor: Number(item.valor) || 0,
    data_vencimento: vencimento,
    data_pagamento: pagamento,
    categoria: item.categoria || 'Honorários',
    status,
    recorrente: Boolean(item.recorrente),
  };
}
