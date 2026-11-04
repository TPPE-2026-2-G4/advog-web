'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  X,
} from 'lucide-react';
import { formatCurrency, toLancamento } from '@/utils/financas';
import { exportarCalendarioIcs, obterCalendario } from '@/services/financas';
import styles from './calendario.module.css';

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function resolveInitialDate(initialData, initialDate) {
  if (initialDate) return new Date(initialDate);
  if (Array.isArray(initialData) && initialData.length > 0) {
    const itemComData = initialData.find(
      (d) =>
        d &&
        (d.dataVencimentoIso ||
          d.data_vencimento ||
          d.dataIso ||
          d.data ||
          d.dataVencimento)
    );
    if (itemComData) {
      const raw =
        itemComData.dataVencimentoIso ||
        itemComData.data_vencimento ||
        itemComData.dataIso ||
        itemComData.data ||
        itemComData.dataVencimento;
      if (typeof raw === 'string') {
        const isoMatch = raw.split('T')[0];
        if (isoMatch.includes('-')) {
          const [ano, mes] = isoMatch.split('-');
          if (ano && mes) {
            return new Date(Number(ano), Number(mes) - 1, 1);
          }
        }
        if (raw.includes('/')) {
          const parts = raw.split('/');
          if (parts.length === 3) {
            return new Date(Number(parts[2]), Number(parts[1]) - 1, 1);
          }
        }
      }
    }
  }
  return new Date();
}

function getItemDateIso(item) {
  if (!item) return '';
  const raw =
    item.dataVencimentoIso ||
    item.data_vencimento ||
    item.dataIso ||
    item.data ||
    item.dataVencimento ||
    '';
  if (!raw) return '';
  const clean = String(raw).split('T')[0].trim();
  if (clean.includes('-')) return clean;
  if (clean.includes('/')) {
    const [d, m, y] = clean.split('/');
    if (d && m && y) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return clean;
}

function isEntrada(item) {
  const tipo = String(item?.tipo || '').toLowerCase();
  return tipo === 'entrada' || tipo === 'e';
}

function isSaida(item) {
  const tipo = String(item?.tipo || '').toLowerCase();
  return (
    tipo === 'saida' || tipo === 'saída' || tipo === 's' || tipo === 'despesa'
  );
}

function normalizarStatus(item) {
  return String(item?.status || 'Pendente').toLowerCase();
}

export default function CalendarioClient({
  initialData = [],
  initialDate,
  onExportIcs,
  onSelectDay,
  onMonthChange,
}) {
  const [currentDate, setCurrentDate] = useState(() =>
    resolveInitialDate(initialData, initialDate)
  );
  const [selectedDay, setSelectedDay] = useState(null);
  const [lancamentos, setLancamentos] = useState(() =>
    Array.isArray(initialData)
      ? initialData.map((d) => toLancamento(d) || d)
      : []
  );
  const [exportError, setExportError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  const lancamentosDoMes = useMemo(() => {
    return lancamentos.filter((item) => {
      const dateIso = getItemDateIso(item);
      return dateIso.startsWith(monthPrefix);
    });
  }, [lancamentos, monthPrefix]);

  const totais = useMemo(() => {
    let entradasPagas = 0;
    let saidasPagas = 0;
    let aReceber = 0;
    let aPagar = 0;
    let emAtraso = 0;

    lancamentosDoMes.forEach((item) => {
      const valor = Number(item.valor) || 0;
      const st = normalizarStatus(item);
      const entrada = isEntrada(item);
      const saida = isSaida(item);

      if (st === 'atrasado') {
        emAtraso += valor;
      } else if (st === 'realizado' || st === 'pago') {
        if (entrada) {
          entradasPagas += valor;
        } else {
          saidasPagas += valor;
        }
      } else {
        if (entrada) {
          aReceber += valor;
        } else {
          aPagar += valor;
        }
      }
    });

    return {
      entradasPagas,
      saidasPagas,
      aReceber,
      aPagar,
      emAtraso,
    };
  }, [lancamentosDoMes]);

  const getLancamentosDoDia = (day) => {
    const dayPrefix = `${monthPrefix}-${String(day).padStart(2, '0')}`;
    return lancamentosDoMes.filter(
      (item) => getItemDateIso(item) === dayPrefix
    );
  };

  const selectedDayItems = selectedDay ? getLancamentosDoDia(selectedDay) : [];

  useEffect(() => {
    let ativo = true;
    const inicio = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const fim = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    obterCalendario({ inicio, fim })
      .then((novos) => {
        if (!ativo) return;
        if (novos && Array.isArray(novos)) {
          setLancamentos((prev) => {
            const map = new Map();
            prev.forEach((item) =>
              map.set(item.id || item.lancamento_id, item)
            );
            novos.forEach((item) =>
              map.set(item.id || item.lancamento_id, item)
            );
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});

    return () => {
      ativo = false;
    };
  }, [currentYear, currentMonth, daysInMonth]);

  const handlePrevMonth = () => {
    const newDate = new Date(currentYear, currentMonth - 1, 1);
    setCurrentDate(newDate);
    setSelectedDay(null);
    onMonthChange?.(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentYear, currentMonth + 1, 1);
    setCurrentDate(newDate);
    setSelectedDay(null);
    onMonthChange?.(newDate);
  };

  const handleSelectDay = (day) => {
    const nextVal = selectedDay === day ? null : day;
    setSelectedDay(nextVal);
    onSelectDay?.(nextVal);
  };

  const handleExportIcs = async () => {
    if (isExporting) return;
    setExportError('');
    setIsExporting(true);
    const inicio = `${monthPrefix}-01`;
    const fim = `${monthPrefix}-${String(daysInMonth).padStart(2, '0')}`;
    try {
      if (onExportIcs) {
        await onExportIcs({ inicio, fim });
      } else {
        await exportarCalendarioIcs({ inicio, fim });
      }
    } catch (err) {
      setExportError(err?.message || 'Erro ao exportar calendário.');
    } finally {
      setIsExporting(false);
    }
  };

  const hoje = new Date();
  const isMesAtual =
    hoje.getFullYear() === currentYear && hoje.getMonth() === currentMonth;

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Calendário de Pagamentos</h1>
          <p className={styles.subtitle}>
            Controle financeiro por data de vencimento
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.exportButton}
            onClick={handleExportIcs}
            disabled={isExporting}
            aria-busy={isExporting}
          >
            <Download size={16} />
            {`Exportar ${MESES[currentMonth]} de ${currentYear}`}
          </button>
        </div>
      </div>

      {exportError && (
        <div role="alert" className={styles.errorMessage}>
          {exportError}
        </div>
      )}

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.iconSuccess}`}>
            <Check size={20} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statLabel}>Entradas pagas</p>
            <p className={styles.statValue}>
              {formatCurrency(totais.entradasPagas)}
            </p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.iconDanger}`}>
            <ArrowDownRight size={20} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statLabel}>Saídas pagas</p>
            <p className={styles.statValue}>
              {formatCurrency(totais.saidasPagas)}
            </p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.iconWarning}`}>
            <ArrowUpRight size={20} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statLabel}>A receber</p>
            <p className={styles.statValue}>
              {formatCurrency(totais.aReceber)}
            </p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.iconOrange}`}>
            <CreditCard size={20} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statLabel}>A pagar</p>
            <p className={styles.statValue}>{formatCurrency(totais.aPagar)}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.iconDanger}`}>
            <AlertCircle size={20} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statLabel}>Em atraso</p>
            <p className={styles.statValue}>
              {formatCurrency(totais.emAtraso)}
            </p>
          </div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.calendarCard}>
          <div className={styles.calendarNav}>
            <button
              type="button"
              className={styles.navButton}
              onClick={handlePrevMonth}
              aria-label="Mês anterior"
            >
              <ChevronLeft size={20} />
            </button>

            <h2 className={styles.monthTitle}>
              {MESES[currentMonth]} {currentYear}
            </h2>

            <button
              type="button"
              className={styles.navButton}
              onClick={handleNextMonth}
              aria-label="Próximo mês"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className={styles.weekdaysRow}>
            {DIAS_SEMANA.map((dia) => (
              <div key={dia} className={styles.weekdayHeader}>
                {dia}
              </div>
            ))}
          </div>

          <div className={styles.daysGrid}>
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className={styles.emptyDay} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const itemsDoDia = getLancamentosDoDia(day);
              const isSelected = selectedDay === day;
              const isHoje = isMesAtual && hoje.getDate() === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`${styles.dayButton} ${
                    isSelected ? styles.daySelected : ''
                  } ${isHoje ? styles.dayToday : ''}`}
                  aria-pressed={isSelected}
                  aria-label={`Dia ${day} de ${MESES[currentMonth]}`}
                  data-testid={`day-${day}`}
                >
                  <span
                    className={`${styles.dayNumber} ${
                      isHoje ? styles.dayNumberToday : ''
                    }`}
                  >
                    {day}
                  </span>

                  <div className={styles.dotsContainer}>
                    {itemsDoDia.map((item, dotIdx) => {
                      const st = normalizarStatus(item);
                      const entrada = isEntrada(item);

                      let dotClass = styles.dotSuccess;
                      if (st === 'atrasado') {
                        dotClass = styles.dotDanger;
                      } else if (st === 'pendente') {
                        dotClass = entrada
                          ? styles.dotWarning
                          : styles.dotOrange;
                      }

                      return (
                        <span
                          key={item.id || item.lancamento_id || dotIdx}
                          className={`${styles.dot} ${dotClass}`}
                        />
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>

          <div className={styles.legendRow}>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.dotSuccess}`} />
              <span>Pago</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.dotWarning}`} />
              <span>A receber</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.dotOrange}`} />
              <span>A pagar</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.dotDanger}`} />
              <span>Atrasado</span>
            </div>
          </div>
        </div>

        <div className={styles.detailsCard}>
          {selectedDay ? (
            <>
              <div className={styles.detailsHeader}>
                <h3 className={styles.detailsDateTitle}>
                  {String(selectedDay).padStart(2, '0')}/
                  {String(currentMonth + 1).padStart(2, '0')}/{currentYear}
                </h3>
                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={() => setSelectedDay(null)}
                  aria-label="Fechar detalhes da data"
                >
                  <X size={18} />
                </button>
              </div>

              {selectedDayItems.length > 0 ? (
                <div className={styles.itemsList}>
                  {selectedDayItems.map((item) => {
                    const entrada = isEntrada(item);
                    const st = normalizarStatus(item);

                    let statusLabel = 'Pendente';
                    let badgeClass = styles.badgeWarning;

                    if (st === 'realizado' || st === 'pago') {
                      statusLabel = entrada ? 'Recebido' : 'Pago';
                      badgeClass = styles.badgeSuccess;
                    } else if (st === 'atrasado') {
                      statusLabel = 'Atrasado';
                      badgeClass = styles.badgeDanger;
                    } else {
                      statusLabel = entrada ? 'A receber' : 'A pagar';
                      badgeClass = entrada
                        ? styles.badgeWarning
                        : styles.badgeOrange;
                    }

                    return (
                      <div
                        key={item.id || item.lancamento_id}
                        className={styles.itemCard}
                      >
                        <div className={styles.itemCardTop}>
                          <span className={`${styles.badge} ${badgeClass}`}>
                            {statusLabel}
                          </span>
                          <span
                            className={`${styles.itemAmount} ${
                              entrada
                                ? styles.amountPositive
                                : styles.amountNegative
                            }`}
                          >
                            {entrada ? '+ ' : '− '}
                            {formatCurrency(item.valor)}
                          </span>
                        </div>

                        <p className={styles.itemTitle}>
                          {item.titulo || item.descricao || 'Sem título'}
                        </p>

                        {item.descricao &&
                          item.titulo &&
                          item.descricao !== item.titulo && (
                            <p className={styles.itemDescricao}>
                              {item.descricao}
                            </p>
                          )}

                        <div className={styles.itemFooter}>
                          <span className={styles.itemTipo}>
                            {entrada ? 'Entrada' : 'Saída'}
                            {item.categoria ? ` · ${item.categoria}` : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.noItemsText}>Sem lançamentos neste dia.</p>
              )}
            </>
          ) : (
            <div className={styles.emptyDetails}>
              <div className={styles.emptyIconWrap}>
                <AlertCircle size={24} />
              </div>
              <p className={styles.emptyText}>
                Selecione uma data no calendário para ver os lançamentos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
