'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import {
  agruparDespesasPorCategoria,
  agruparFluxoCaixaPorMes,
  calcularIndicadoresFinanceiros,
  formatCompactCurrency,
  formatCurrency,
  formatCurrencyNumber,
} from '@/utils/financas';
import * as financasService from '@/services/financas';
import styles from './FinancialDashboard.module.css';

const PERIODOS = [
  { key: '3m', label: '3m', meses: 3, dias: 90 },
  { key: '6m', label: '6m', meses: 6, dias: 180 },
  { key: '1a', label: '1a', meses: 12, dias: 365 },
];

export function buildSmoothLinePath(points = []) {
  if (!Array.isArray(points) || points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = (p1.x - p0.x) * 0.42;
    const cpX1 = p0.x + dx;
    const cpY1 = p0.y;
    const cpX2 = p1.x - dx;
    const cpY2 = p1.y;
    d += ` C ${cpX1.toFixed(1)} ${cpY1.toFixed(1)}, ${cpX2.toFixed(1)} ${cpY2.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

export function buildSmoothAreaPath(points = [], baseY = 214) {
  if (!Array.isArray(points) || points.length === 0) return '';
  const line = buildSmoothLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${last.x.toFixed(1)} ${baseY.toFixed(1)} L ${first.x.toFixed(1)} ${baseY.toFixed(1)} Z`;
}

export default function FinancialDashboard({
  lancamentos = [],
  resumoBackend = null,
  indicadores: indicadoresProp = null,
  pontosGraficoInicial = [],
  dataReferencia = null,
  onFilterGrafico,
}) {
  const uid = useId();
  const [periodoAtivo, setPeriodoAtivo] = useState('6m');
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');
  const [pontosGraficoApi, setPontosGraficoApi] =
    useState(pontosGraficoInicial);
  const [indiceAtivo, setIndiceAtivo] = useState(null);
  const [categoriaHover, setCategoriaHover] = useState(null);

  const configPeriodo = useMemo(
    () => PERIODOS.find((p) => p.key === periodoAtivo) || PERIODOS[1],
    [periodoAtivo]
  );

  useEffect(() => {
    let ativo = true;
    const buscar = async () => {
      if (typeof financasService.obterGraficoFinancas !== 'function') return;
      const resposta = await financasService.obterGraficoFinancas({
        dias: configPeriodo.dias,
        valor_min: valorMin || undefined,
        valor_max: valorMax || undefined,
      });
      if (ativo && resposta && Array.isArray(resposta.itens)) {
        setPontosGraficoApi((prev) =>
          prev.length === 0 && resposta.itens.length === 0
            ? prev
            : resposta.itens
        );
      }
    };

    buscar();
    onFilterGrafico?.({
      periodo: periodoAtivo,
      dias: configPeriodo.dias,
      valorMin,
      valorMax,
    });

    return () => {
      ativo = false;
    };
  }, [periodoAtivo, configPeriodo.dias, valorMin, valorMax, onFilterGrafico]);

  const lancamentosFiltradosPorValor = useMemo(() => {
    const lista = Array.isArray(lancamentos) ? lancamentos : [];
    const temMin = String(valorMin).trim() !== '';
    const temMax = String(valorMax).trim() !== '';
    if (!temMin && !temMax) return lista;

    const min = temMin ? Number(valorMin) : null;
    const max = temMax ? Number(valorMax) : null;

    return lista.filter((item) => {
      const v = Number(item?.valor) || 0;
      if (min !== null && !isNaN(min) && v < min) return false;
      if (max !== null && !isNaN(max) && v > max) return false;
      return true;
    });
  }, [lancamentos, valorMin, valorMax]);

  const indicadores = useMemo(() => {
    if (indicadoresProp) return indicadoresProp;
    return calcularIndicadoresFinanceiros(lancamentos, resumoBackend);
  }, [indicadoresProp, lancamentos, resumoBackend]);

  const serieFluxo = useMemo(
    () =>
      agruparFluxoCaixaPorMes(
        pontosGraficoApi,
        lancamentosFiltradosPorValor,
        configPeriodo.meses,
        dataReferencia
      ),
    [
      pontosGraficoApi,
      lancamentosFiltradosPorValor,
      configPeriodo.meses,
      dataReferencia,
    ]
  );

  const categoriasDespesas = useMemo(
    () =>
      agruparDespesasPorCategoria(lancamentos, {
        valorMin,
        valorMax,
      }),
    [lancamentos, valorMin, valorMax]
  );

  const maxAxis = useMemo(() => {
    const maiorValor = serieFluxo.reduce(
      (max, item) => Math.max(max, item.entradas, item.saidas),
      0
    );
    if (maiorValor <= 0) return 22000;
    return Math.ceil((maiorValor * 1.1) / 2000) * 2000;
  }, [serieFluxo]);

  const ticksY = useMemo(
    () => [maxAxis, maxAxis * 0.75, maxAxis * 0.5, maxAxis * 0.25, 0],
    [maxAxis]
  );

  const svgPadding = { left: 64, right: 20, top: 18, bottom: 36 };
  const svgWidth = 640;
  const svgHeight = 250;
  const plotWidth = svgWidth - svgPadding.left - svgPadding.right;
  const plotHeight = svgHeight - svgPadding.top - svgPadding.bottom;
  const baseY = svgPadding.top + plotHeight;

  const { pontosEntradas, pontosSaidas, faixasHover } = useMemo(() => {
    const total = serieFluxo.length;
    const divisor = total > 1 ? total - 1 : 1;

    const pEntradas = serieFluxo.map((item, idx) => {
      const x = svgPadding.left + (idx / divisor) * plotWidth;
      const ratio = Math.min(1, Math.max(0, item.entradas / maxAxis));
      const y = baseY - ratio * plotHeight;
      return { x, y, ...item };
    });

    const pSaidas = serieFluxo.map((item, idx) => {
      const x = svgPadding.left + (idx / divisor) * plotWidth;
      const ratio = Math.min(1, Math.max(0, item.saidas / maxAxis));
      const y = baseY - ratio * plotHeight;
      return { x, y, ...item };
    });

    const faixas = pEntradas.map((ponto, idx) => {
      const prevX = idx === 0 ? svgPadding.left : pEntradas[idx - 1].x;
      const nextX =
        idx === pEntradas.length - 1
          ? svgWidth - svgPadding.right
          : pEntradas[idx + 1].x;
      const xInicio = idx === 0 ? svgPadding.left : (prevX + ponto.x) / 2;
      const xFim =
        idx === pEntradas.length - 1
          ? svgWidth - svgPadding.right
          : (ponto.x + nextX) / 2;
      return {
        idx,
        label: ponto.label,
        key: ponto.key,
        x: xInicio,
        width: Math.max(10, xFim - xInicio),
      };
    });

    return {
      pontosEntradas: pEntradas,
      pontosSaidas: pSaidas,
      faixasHover: faixas,
    };
  }, [
    serieFluxo,
    maxAxis,
    plotWidth,
    plotHeight,
    baseY,
    svgPadding.left,
    svgPadding.right,
    svgWidth,
  ]);

  const entradasLinePath = useMemo(
    () => buildSmoothLinePath(pontosEntradas),
    [pontosEntradas]
  );
  const entradasAreaPath = useMemo(
    () => buildSmoothAreaPath(pontosEntradas, baseY),
    [pontosEntradas, baseY]
  );
  const saidasLinePath = useMemo(
    () => buildSmoothLinePath(pontosSaidas),
    [pontosSaidas]
  );
  const saidasAreaPath = useMemo(
    () => buildSmoothAreaPath(pontosSaidas, baseY),
    [pontosSaidas, baseY]
  );

  const donutRadius = 68;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const segmentosDonut = useMemo(() => {
    const totalDespesas = categoriasDespesas.reduce(
      (acc, item) => acc + item.valor,
      0
    );
    if (totalDespesas <= 0) return [];

    const gap = categoriasDespesas.length > 1 ? 6 : 0;
    let offsetAcumulado = 0;

    return categoriasDespesas.map((item) => {
      const proporcao = item.valor / totalDespesas;
      const comprimentoBruto = proporcao * donutCircumference;
      const comprimentoArco = Math.max(2, comprimentoBruto - gap);
      const dashArray = `${comprimentoArco.toFixed(2)} ${(donutCircumference - comprimentoArco).toFixed(2)}`;
      const dashOffset = -offsetAcumulado;
      offsetAcumulado += comprimentoBruto;

      return {
        ...item,
        dashArray,
        dashOffset,
      };
    });
  }, [categoriasDespesas, donutCircumference]);

  const pontoEntradaAtivo =
    indiceAtivo !== null && pontosEntradas[indiceAtivo]
      ? pontosEntradas[indiceAtivo]
      : null;
  const pontoSaidaAtivo =
    indiceAtivo !== null && pontosSaidas[indiceAtivo]
      ? pontosSaidas[indiceAtivo]
      : null;

  const tooltipAlinhadoEsquerda =
    indiceAtivo !== null &&
    pontosEntradas.length > 1 &&
    indiceAtivo >= pontosEntradas.length - 1;

  const segmentoDonutAtivo = useMemo(() => {
    if (!categoriaHover) return null;
    return segmentosDonut.find((s) => s.categoria === categoriaHover) || null;
  }, [categoriaHover, segmentosDonut]);

  const saldoPositivo = indicadores.saldoLiquido >= 0;
  const gradEntradasId = `entradas-grad-${uid}`;
  const gradSaidasId = `saidas-grad-${uid}`;

  return (
    <section
      className={styles.dashboardWrapper}
      aria-label="Dashboard Financeiro"
    >
      <div className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Receita do Mês</p>
          <div className={styles.kpiValueRow}>
            <p
              className={`${styles.kpiValue} ${styles.kpiGreen}`}
              data-testid="kpi-receita-mes"
              aria-label={`Receita do Mês: ${formatCurrency(indicadores.receitaMes)}`}
            >
              {formatCurrencyNumber(indicadores.receitaMes)}
            </p>
          </div>
        </article>

        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Despesas do Mês</p>
          <div className={styles.kpiValueRow}>
            <p
              className={`${styles.kpiValue} ${styles.kpiRed}`}
              data-testid="kpi-despesas-mes"
              aria-label={`Despesas do Mês: ${formatCurrency(indicadores.despesasMes)}`}
            >
              {formatCurrencyNumber(indicadores.despesasMes)}
            </p>
          </div>
        </article>

        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Saldo Líquido</p>
          <div className={styles.kpiValueRow}>
            <p
              className={`${styles.kpiValue} ${
                saldoPositivo ? styles.kpiDark : styles.kpiRed
              }`}
              data-testid="kpi-saldo-liquido"
              aria-label={`Saldo Líquido: ${formatCurrency(indicadores.saldoLiquido)}`}
            >
              {formatCurrencyNumber(indicadores.saldoLiquido)}
            </p>
            {saldoPositivo ? (
              <TrendingUp
                size={18}
                className={styles.trendIconPositive}
                aria-label="Tendência positiva"
              />
            ) : (
              <TrendingDown
                size={18}
                className={styles.trendIconNegative}
                aria-label="Tendência negativa"
              />
            )}
          </div>
        </article>

        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>A Receber</p>
          <div className={styles.kpiValueRow}>
            <p
              className={`${styles.kpiValue} ${styles.kpiAmber}`}
              data-testid="kpi-a-receber"
              aria-label={`A Receber: ${formatCurrency(indicadores.aReceber)}`}
            >
              {formatCurrencyNumber(indicadores.aReceber)}
            </p>
          </div>
        </article>
      </div>

      <div className={styles.chartsGrid}>
        <article className={styles.chartCard} aria-label="Fluxo de Caixa">
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>Fluxo de Caixa</h2>

            <div className={styles.chartControls}>
              <div className={styles.valueFilters}>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="Valor mín."
                  className={styles.valueInput}
                  value={valorMin}
                  onChange={(e) => setValorMin(e.target.value)}
                  aria-label="Valor mínimo do gráfico"
                />
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="Valor máx."
                  className={styles.valueInput}
                  value={valorMax}
                  onChange={(e) => setValorMax(e.target.value)}
                  aria-label="Valor máximo do gráfico"
                />
              </div>

              <div
                className={styles.periodSelector}
                role="group"
                aria-label="Período do fluxo de caixa"
              >
                {PERIODOS.map((p) => {
                  const ativo = periodoAtivo === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      className={`${styles.periodBtn} ${
                        ativo ? styles.periodBtnActive : ''
                      }`}
                      aria-pressed={ativo}
                      onClick={() => {
                        setPeriodoAtivo(p.key);
                        setIndiceAtivo(null);
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            className={styles.areaChartContainer}
            onMouseLeave={() => setIndiceAtivo(null)}
          >
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className={styles.areaSvg}
              role="img"
              aria-label="Gráfico de área de entradas e saídas"
            >
              <defs>
                <linearGradient id={gradEntradasId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34785f" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#34785f" stopOpacity="0.06" />
                </linearGradient>
                <linearGradient id={gradSaidasId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a8283a" stopOpacity="0.65" />
                  <stop offset="100%" stopColor="#a8283a" stopOpacity="0.06" />
                </linearGradient>
              </defs>

              {ticksY.map((tickVal, idx) => {
                const y =
                  svgPadding.top + (idx / (ticksY.length - 1)) * plotHeight;
                return (
                  <g key={`tick-${idx}`}>
                    <line
                      x1={svgPadding.left}
                      y1={y}
                      x2={svgWidth - svgPadding.right}
                      y2={y}
                      className={
                        idx === ticksY.length - 1
                          ? styles.axisLine
                          : styles.gridLine
                      }
                    />
                    <text
                      x={svgPadding.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      className={styles.axisTickText}
                    >
                      {formatCompactCurrency(tickVal)}
                    </text>
                  </g>
                );
              })}

              <path d={entradasAreaPath} fill={`url(#${gradEntradasId})`} />
              <path
                d={entradasLinePath}
                fill="none"
                stroke="#34785f"
                strokeWidth="2"
              />

              <path d={saidasAreaPath} fill={`url(#${gradSaidasId})`} />
              <path
                d={saidasLinePath}
                fill="none"
                stroke="#a8283a"
                strokeWidth="2"
              />

              {pontosEntradas.map((ponto) => (
                <text
                  key={`label-${ponto.key}`}
                  x={ponto.x}
                  y={baseY + 20}
                  textAnchor="middle"
                  className={styles.axisTickText}
                >
                  {ponto.label}
                </text>
              ))}

              {pontoEntradaAtivo && pontoSaidaAtivo && (
                <g data-testid="fluxo-crosshair">
                  <line
                    x1={pontoEntradaAtivo.x}
                    y1={svgPadding.top}
                    x2={pontoEntradaAtivo.x}
                    y2={baseY}
                    className={styles.crosshairLine}
                  />
                  <circle
                    cx={pontoEntradaAtivo.x}
                    cy={pontoEntradaAtivo.y}
                    r="5"
                    fill="#34785f"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className={styles.activeDot}
                  />
                  <circle
                    cx={pontoSaidaAtivo.x}
                    cy={pontoSaidaAtivo.y}
                    r="5"
                    fill="#a8283a"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className={styles.activeDot}
                  />
                </g>
              )}

              {faixasHover.map((faixa) => (
                <rect
                  key={`hover-${faixa.key}`}
                  x={faixa.x}
                  y={svgPadding.top}
                  width={faixa.width}
                  height={plotHeight + 24}
                  className={styles.hoverBand}
                  data-testid={`ponto-entrada-${faixa.label}`}
                  onMouseEnter={() => setIndiceAtivo(faixa.idx)}
                  onMouseMove={() => setIndiceAtivo(faixa.idx)}
                  onClick={() =>
                    setIndiceAtivo((prev) =>
                      prev === faixa.idx ? null : faixa.idx
                    )
                  }
                />
              ))}
            </svg>

            {pontoEntradaAtivo && (
              <div
                className={`${styles.floatingTooltip} ${
                  tooltipAlinhadoEsquerda
                    ? styles.floatingTooltipLeft
                    : styles.floatingTooltipRight
                }`}
                style={{
                  left: `${(pontoEntradaAtivo.x / svgWidth) * 100}%`,
                }}
                data-testid="fluxo-tooltip"
              >
                <span className={styles.tooltipMonth}>
                  {pontoEntradaAtivo.label}
                </span>
                <span className={styles.tooltipEntrada}>
                  Entradas : R${' '}
                  {formatCurrencyNumber(pontoEntradaAtivo.entradas)}
                </span>
                <span className={styles.tooltipSaida}>
                  Saídas : R$ {formatCurrencyNumber(pontoEntradaAtivo.saidas)}
                </span>
              </div>
            )}
          </div>

          <div className={styles.areaLegend}>
            <span className={`${styles.legendItem} ${styles.legendEntrada}`}>
              <svg
                className={styles.legendLineIcon}
                viewBox="0 0 16 10"
                aria-hidden="true"
              >
                <line
                  x1="0"
                  y1="5"
                  x2="16"
                  y2="5"
                  stroke="#34785f"
                  strokeWidth="2"
                />
                <circle
                  cx="8"
                  cy="5"
                  r="2.5"
                  fill="#ffffff"
                  stroke="#34785f"
                  strokeWidth="1.8"
                />
              </svg>
              Entradas
            </span>

            <span className={`${styles.legendItem} ${styles.legendSaida}`}>
              <svg
                className={styles.legendLineIcon}
                viewBox="0 0 16 10"
                aria-hidden="true"
              >
                <line
                  x1="0"
                  y1="5"
                  x2="16"
                  y2="5"
                  stroke="#a8283a"
                  strokeWidth="2"
                />
                <circle
                  cx="8"
                  cy="5"
                  r="2.5"
                  fill="#ffffff"
                  stroke="#a8283a"
                  strokeWidth="1.8"
                />
              </svg>
              Saídas
            </span>
          </div>
        </article>

        <article
          className={styles.chartCard}
          aria-label="Despesas por Categoria"
        >
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>Despesas por Categoria</h2>
          </div>

          <div className={styles.donutBody}>
            <div
              className={styles.donutChartWrap}
              onMouseLeave={() => setCategoriaHover(null)}
            >
              <svg
                viewBox="0 0 220 220"
                className={styles.donutSvg}
                role="img"
                aria-label="Gráfico de rosca de despesas por categoria"
              >
                {segmentosDonut.length === 0 ? (
                  <circle
                    cx="110"
                    cy="110"
                    r={donutRadius}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="22"
                  />
                ) : (
                  segmentosDonut.map((seg) => {
                    const isHovered = categoriaHover === seg.categoria;
                    return (
                      <circle
                        key={seg.categoria}
                        cx="110"
                        cy="110"
                        r={donutRadius}
                        fill="none"
                        stroke={seg.cor}
                        strokeWidth={isHovered ? '25' : '22'}
                        strokeDasharray={seg.dashArray}
                        strokeDashoffset={seg.dashOffset}
                        transform="rotate(-90 110 110)"
                        className={styles.donutSegment}
                        data-testid={`donut-segment-${seg.categoria}`}
                        onMouseEnter={() => setCategoriaHover(seg.categoria)}
                        onClick={() =>
                          setCategoriaHover((prev) =>
                            prev === seg.categoria ? null : seg.categoria
                          )
                        }
                      >
                        <title>
                          {`${seg.categoria}: ${formatCurrency(seg.valor)} (${seg.percentual}%)`}
                        </title>
                      </circle>
                    );
                  })
                )}
              </svg>

              {segmentoDonutAtivo && (
                <div
                  className={styles.donutCenterTooltip}
                  data-testid="donut-center-tooltip"
                >
                  <span className={styles.donutCenterCategory}>
                    {segmentoDonutAtivo.categoria}
                  </span>
                  <span className={styles.donutCenterValue}>
                    {formatCurrencyNumber(segmentoDonutAtivo.valor)}
                  </span>
                  <span className={styles.donutCenterPercent}>
                    {segmentoDonutAtivo.percentual}%
                  </span>
                </div>
              )}
            </div>

            {segmentosDonut.length === 0 ? (
              <p className={styles.emptyCategoryText}>
                Nenhuma despesa registrada
              </p>
            ) : (
              <div className={styles.donutLegend}>
                {segmentosDonut.map((seg) => (
                  <div
                    key={seg.categoria}
                    className={styles.donutLegendItem}
                    title={`${seg.categoria}: ${formatCurrency(seg.valor)} (${seg.percentual}%)`}
                    onMouseEnter={() => setCategoriaHover(seg.categoria)}
                    onMouseLeave={() => setCategoriaHover(null)}
                  >
                    <span
                      className={styles.donutColorSwatch}
                      style={{ backgroundColor: seg.cor }}
                      aria-hidden="true"
                    />
                    <span className={styles.donutLegendLabel}>
                      {seg.categoria}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
