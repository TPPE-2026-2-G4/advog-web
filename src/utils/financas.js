export const MESES_ABREV = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export const CORES_DESPESAS_CATEGORIA = [
  '#9e2a3b',
  '#d4a017',
  '#2f6f55',
  '#5a82ae',
  '#c1a077',
  '#6b7280',
];

export function formatCurrencyNumber(val) {
  if (val === undefined || val === null || isNaN(Number(val))) return '0,00';
  return Number(val).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCurrency(val) {
  if (val === undefined || val === null || isNaN(Number(val))) return 'R$ 0,00';
  return `R$ ${formatCurrencyNumber(val)}`;
}

export function formatCompactCurrency(val) {
  if (val === undefined || val === null || isNaN(Number(val))) return 'R$ 0k';
  const num = Number(val);
  if (num === 0) return 'R$ 0k';
  if (Math.abs(num) >= 1000) {
    const k = num / 1000;
    const formatted = Number.isInteger(k)
      ? String(k)
      : k.toFixed(1).replace(/\.0$/, '');
    return `R$ ${formatted}k`;
  }
  return `R$ ${Math.round(num)}`;
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
  return s === 'realizado';
}

export function getStatusConcluido(tipo) {
  return 'realizado';
}

export function formatStatusLabel(status, tipo) {
  const s = status?.toLowerCase();
  if (s === 'realizado') {
    return 'Realizado';
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

export function obterDataEfetivaIso(item) {
  if (!item) return '';
  const concluido = isStatusConcluido(item.status);
  const raw = concluido
    ? item.dataPagamentoIso ||
      item.data_pagamento ||
      item.dataPagamento ||
      item.dataIso ||
      item.dataVencimentoIso ||
      item.data_vencimento ||
      item.dataVencimento ||
      item.data ||
      ''
    : item.dataVencimentoIso ||
      item.data_vencimento ||
      item.dataVencimento ||
      item.dataIso ||
      item.data ||
      '';
  return formatDateToIso(raw);
}

function resolverAnoMesReferencia(dataReferencia = null) {
  if (dataReferencia) {
    const isoRef =
      dataReferencia instanceof Date
        ? dataReferencia.toISOString().split('T')[0]
        : formatDateToIso(String(dataReferencia));
    const [y, m] = isoRef.split('-');
    if (y && m && !isNaN(Number(y)) && !isNaN(Number(m))) {
      return { ano: Number(y), mesIdx: Number(m) - 1 };
    }
  }
  const agora = new Date();
  return { ano: agora.getFullYear(), mesIdx: agora.getMonth() };
}

export function calcularIndicadoresFinanceiros(
  lancamentos = [],
  resumoBackend = null,
  dataReferencia = null
) {
  const temLancamentos = Array.isArray(lancamentos) && lancamentos.length > 0;

  if (!temLancamentos && resumoBackend && resumoBackend.realizado) {
    const receitaMes = Number(resumoBackend.realizado.total_entradas) || 0;
    const despesasMes = Number(resumoBackend.realizado.total_saidas) || 0;
    const aReceber =
      (Number(resumoBackend.pendente?.total_entradas) || 0) +
      (Number(resumoBackend.atrasado?.total_entradas) || 0);
    return {
      receitaMes,
      despesasMes,
      saldoLiquido: receitaMes - despesasMes,
      aReceber,
    };
  }

  const { ano, mesIdx } = resolverAnoMesReferencia(dataReferencia);
  const chaveMesAtual = `${ano}-${String(mesIdx + 1).padStart(2, '0')}`;
  const lista = Array.isArray(lancamentos) ? lancamentos : [];

  const totais = lista.reduce(
    (acc, item) => {
      const valor = Number(item?.valor) || 0;
      const tipo = item?.tipo?.toLowerCase();
      const concluido = isStatusConcluido(item?.status);
      const dataIso = obterDataEfetivaIso(item);
      const mesItem = /^\d{4}-\d{2}$/.test(dataIso.slice(0, 7))
        ? dataIso.slice(0, 7)
        : chaveMesAtual;

      if (tipo === 'entrada') {
        if (concluido) {
          if (mesItem === chaveMesAtual) {
            acc.receitaMes += valor;
          }
        } else {
          acc.aReceber += valor;
        }
      } else if (tipo === 'saida' && concluido && mesItem === chaveMesAtual) {
        acc.despesasMes += valor;
      }

      return acc;
    },
    { receitaMes: 0, despesasMes: 0, aReceber: 0 }
  );

  return {
    receitaMes: totais.receitaMes,
    despesasMes: totais.despesasMes,
    saldoLiquido: totais.receitaMes - totais.despesasMes,
    aReceber: totais.aReceber,
  };
}

export function agruparFluxoCaixaPorMes(
  pontosGrafico = [],
  lancamentos = [],
  periodoMeses = 6,
  dataReferencia = null
) {
  const totalMeses = Math.max(1, Number(periodoMeses) || 6);
  const mapaMeses = new Map();

  const listaValida = Array.isArray(lancamentos) ? lancamentos : [];
  const pontosValidos = Array.isArray(pontosGrafico) ? pontosGrafico : [];

  if (listaValida.length > 0) {
    listaValida.forEach((item) => {
      if (!isStatusConcluido(item?.status)) return;

      const iso = obterDataEfetivaIso(item);
      const chaveMes = iso.slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(chaveMes)) return;

      const valor = Number(item?.valor) || 0;
      const tipo = item?.tipo?.toLowerCase();
      const atual = mapaMeses.get(chaveMes) || { entradas: 0, saidas: 0 };

      if (tipo === 'entrada') {
        atual.entradas += valor;
      } else if (tipo === 'saida') {
        atual.saidas += valor;
      }
      mapaMeses.set(chaveMes, atual);
    });
  } else if (pontosValidos.length > 0) {
    pontosValidos.forEach((ponto) => {
      const iso = formatDateToIso(ponto?.data || '');
      const chaveMes = iso.slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(chaveMes)) return;

      const atual = mapaMeses.get(chaveMes) || { entradas: 0, saidas: 0 };
      const valorEntrada = ponto.total_entradas ?? ponto.entradas ?? 0;
      const valorSaida = ponto.total_saidas ?? ponto.saidas ?? 0;
      atual.entradas += Number(valorEntrada) || 0;
      atual.saidas += Number(valorSaida) || 0;
      mapaMeses.set(chaveMes, atual);
    });
  }

  const { ano: refYear, mesIdx: refMonth } =
    resolverAnoMesReferencia(dataReferencia);

  const resultado = [];
  for (let i = totalMeses - 1; i >= 0; i -= 1) {
    const d = new Date(refYear, refMonth - i, 1);
    const ano = d.getFullYear();
    const mesIdx = d.getMonth();
    const chave = `${ano}-${String(mesIdx + 1).padStart(2, '0')}`;
    const acumulado = mapaMeses.get(chave) || { entradas: 0, saidas: 0 };

    resultado.push({
      key: chave,
      label: MESES_ABREV[mesIdx],
      entradas: acumulado.entradas,
      saidas: acumulado.saidas,
      saldo: acumulado.entradas - acumulado.saidas,
    });
  }

  return resultado;
}

export function agruparDespesasPorCategoria(lancamentos = [], filtros = {}) {
  const lista = Array.isArray(lancamentos) ? lancamentos : [];
  const temMin =
    filtros?.valorMin !== undefined &&
    filtros?.valorMin !== null &&
    String(filtros.valorMin).trim() !== '';
  const temMax =
    filtros?.valorMax !== undefined &&
    filtros?.valorMax !== null &&
    String(filtros.valorMax).trim() !== '';
  const minVal = temMin ? Number(filtros.valorMin) : null;
  const maxVal = temMax ? Number(filtros.valorMax) : null;

  const periodoMeses = Number(filtros?.periodoMeses) || 0;
  let chaveInicio = '';
  let chaveFim = '';
  if (periodoMeses > 0) {
    const { ano, mesIdx } = resolverAnoMesReferencia(filtros?.dataReferencia);
    const dIni = new Date(ano, mesIdx - (periodoMeses - 1), 1);
    const dFim = new Date(ano, mesIdx, 1);
    chaveInicio = `${dIni.getFullYear()}-${String(dIni.getMonth() + 1).padStart(2, '0')}`;
    chaveFim = `${dFim.getFullYear()}-${String(dFim.getMonth() + 1).padStart(2, '0')}`;
  }

  const totaisPorCategoria = new Map();

  lista.forEach((item) => {
    const tipo = item?.tipo?.toLowerCase();
    if (tipo !== 'saida') return;
    if (!isStatusConcluido(item?.status)) return;

    if (chaveInicio && chaveFim) {
      const iso = obterDataEfetivaIso(item);
      const chaveMes = iso.slice(0, 7);
      if (
        /^\d{4}-\d{2}$/.test(chaveMes) &&
        (chaveMes < chaveInicio || chaveMes > chaveFim)
      ) {
        return;
      }
    }

    const valor = Number(item?.valor) || 0;
    if (valor <= 0) return;
    if (minVal !== null && !isNaN(minVal) && valor < minVal) return;
    if (maxVal !== null && !isNaN(maxVal) && valor > maxVal) return;

    const categoria = (item?.categoria || 'Outros').trim() || 'Outros';
    totaisPorCategoria.set(
      categoria,
      (totaisPorCategoria.get(categoria) || 0) + valor
    );
  });

  const ordenado = Array.from(totaisPorCategoria.entries())
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor);

  const totalGeral = ordenado.reduce((acc, item) => acc + item.valor, 0);

  return ordenado.map((item, idx) => ({
    categoria: item.categoria,
    valor: item.valor,
    percentual: Number(((item.valor / totalGeral) * 100).toFixed(1)),
    cor: CORES_DESPESAS_CATEGORIA[idx % CORES_DESPESAS_CATEGORIA.length],
  }));
}

const FIELD_ERROR_MESSAGES = {
  titulo: 'Por favor, informe o título do lançamento.',
  descricao: 'Por favor, informe a descrição do lançamento.',
  valor: 'Por favor, informe um valor válido maior que zero.',
  data_vencimento: 'Por favor, informe uma data de vencimento válida.',
  categoria_id: 'Por favor, selecione ou informe uma categoria.',
  nome_categoria: 'Por favor, informe um nome válido para a categoria.',
};

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
          if (loc && FIELD_ERROR_MESSAGES[loc]) {
            return FIELD_ERROR_MESSAGES[loc];
          }
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
  const tipo =
    rawTipo === 'saída' || rawTipo === 'saida' || rawTipo === 's'
      ? 'saida'
      : 'entrada';
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
    categoria_id: apiItem.categoria_id || null,
    cliente_id: apiItem.cliente_id || null,
    status,
    recorrente: Boolean(apiItem.serie_id || apiItem.recorrente),
    google_calendar_url: apiItem.google_calendar_url || '',
    outlook_calendar_url: apiItem.outlook_calendar_url || '',
  };
}

export function toApiLancamento(item, dataReferencia = new Date()) {
  if (!item) return {};
  const isSaida =
    item.tipo?.toLowerCase() === 'saida' ||
    item.tipo?.toLowerCase() === 'saída' ||
    item.tipo?.toLowerCase() === 's';
  const tipo = isSaida ? 's' : 'e';

  const rawVencimento =
    item.dataVencimentoIso ||
    item.dataVencimento ||
    item.data_vencimento ||
    item.dataIso ||
    item.data ||
    new Date(dataReferencia).toISOString().split('T')[0];
  const vencimento = formatDateToIso(rawVencimento) || rawVencimento;

  const rawPagamento =
    item.dataPagamentoIso !== undefined
      ? item.dataPagamentoIso
      : item.dataPagamento !== undefined
        ? item.dataPagamento
        : item.data_pagamento !== undefined
          ? item.data_pagamento
          : item.dataIso !== undefined
            ? item.dataIso
            : item.data !== undefined
              ? item.data
              : null;

  const pagamento = rawPagamento
    ? formatDateToIso(rawPagamento) || rawPagamento
    : null;

  let rawStatus = item.status || 'Pendente';

  if (!isStatusConcluido(rawStatus)) {
    rawStatus = verificarStatusPorVencimento(
      {
        ...item,
        dataVencimentoIso: vencimento,
      },
      dataReferencia
    );
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
    categoria_id: item.categoria_id || null,
    cliente_id: item.cliente_id || null,
    status,
    recorrente: Boolean(item.recorrente),
    ...(item.rrule ? { rrule: item.rrule } : {}),
  };
}
