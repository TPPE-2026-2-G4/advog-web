import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FinancialDashboard, {
  buildSmoothAreaPath,
  buildSmoothLinePath,
} from './FinancialDashboard';
import * as financasService from '@/services/financas';

vi.mock('@/services/financas', () => ({
  obterGraficoFinancas: vi.fn(),
}));

const mockLancamentos = [
  {
    id: 1,
    dataIso: '2026-08-05',
    titulo: 'Honorários Caso A',
    categoria: 'Honorários',
    tipo: 'entrada',
    valor: 13500,
    status: 'realizado',
  },
  {
    id: 2,
    dataIso: '2026-08-12',
    titulo: 'Aluguel Escritório',
    categoria: 'Despesas Operacionais',
    tipo: 'saida',
    valor: 3200,
    status: 'realizado',
  },
  {
    id: 3,
    dataIso: '2026-08-18',
    titulo: 'Custas Judiciais',
    categoria: 'Custas',
    tipo: 'saida',
    valor: 1030,
    status: 'realizado',
  },
  {
    id: 4,
    dataIso: '2026-08-25',
    titulo: 'Honorários Pendentes',
    categoria: 'Honorários',
    tipo: 'entrada',
    valor: 7200,
    status: 'pendente',
  },
];

describe('FinancialDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    financasService.obterGraficoFinancas.mockResolvedValue({
      itens: [
        { data: '2026-06-10', entradas: 12000, saidas: 4000, saldo_dia: 8000 },
        { data: '2026-08-10', entradas: 13500, saidas: 4230, saldo_dia: 9270 },
      ],
    });
  });

  describe('helpers SVG (buildSmoothLinePath e buildSmoothAreaPath)', () => {
    it('retorna string vazia para lista vazia ou inválida', () => {
      expect(buildSmoothLinePath([])).toBe('');
      expect(buildSmoothLinePath(null)).toBe('');
      expect(buildSmoothAreaPath([])).toBe('');
      expect(buildSmoothAreaPath(null)).toBe('');
    });

    it('gera comando M simples quando há apenas 1 ponto', () => {
      expect(buildSmoothLinePath([{ x: 10, y: 20 }])).toBe('M 10.0 20.0');
      expect(buildSmoothAreaPath([{ x: 10, y: 20 }], 200)).toBe(
        'M 10.0 20.0 L 10.0 200.0 L 10.0 200.0 Z'
      );
    });

    it('gera curvas cúbicas de Bézier (C) para múltiplos pontos', () => {
      const path = buildSmoothLinePath([
        { x: 0, y: 100 },
        { x: 100, y: 50 },
      ]);
      expect(path).toContain('M 0.0 100.0 C');
    });
  });

  it('renderiza os 4 cards de indicadores financeiros e os gráficos de Fluxo de Caixa e Despesas por Categoria', async () => {
    render(
      <FinancialDashboard
        lancamentos={mockLancamentos}
        dataReferencia="2026-08-31"
      />
    );

    expect(screen.getByText('Receita do Mês')).toBeInTheDocument();
    expect(screen.getByText('Despesas do Mês')).toBeInTheDocument();
    expect(screen.getByText('Saldo Líquido')).toBeInTheDocument();
    expect(screen.getByText('A Receber')).toBeInTheDocument();

    expect(screen.getByTestId('kpi-receita-mes')).toHaveTextContent(
      '13.500,00'
    );
    expect(screen.getByTestId('kpi-despesas-mes')).toHaveTextContent(
      '4.230,00'
    );
    expect(screen.getByTestId('kpi-saldo-liquido')).toHaveTextContent(
      '9.270,00'
    );
    expect(screen.getByTestId('kpi-a-receber')).toHaveTextContent('7.200,00');
    expect(screen.getByLabelText('Tendência positiva')).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { level: 2, name: 'Fluxo de Caixa' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Despesas por Categoria' })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(financasService.obterGraficoFinancas).toHaveBeenCalledWith({
        dias: 180,
        valor_min: undefined,
        valor_max: undefined,
      });
    });

    expect(
      screen.getByTestId('donut-segment-Despesas Operacionais')
    ).toBeInTheDocument();
    expect(screen.getByTestId('donut-segment-Custas')).toBeInTheDocument();
  });

  it('exibe ícone de tendência negativa quando o saldo líquido é menor que zero', () => {
    render(
      <FinancialDashboard
        indicadores={{
          receitaMes: 1000,
          despesasMes: 2500,
          saldoLiquido: -1500,
          aReceber: 0,
        }}
      />
    );

    expect(screen.getByLabelText('Tendência negativa')).toBeInTheDocument();
  });

  it('permite alternar períodos (3m, 6m, 1a), filtrar por valor mínimo/máximo e exibir linha vertical + card flutuante ao passar perto do mês', async () => {
    const onFilterGrafico = vi.fn();
    render(
      <FinancialDashboard
        lancamentos={mockLancamentos}
        dataReferencia="2026-08-31"
        onFilterGrafico={onFilterGrafico}
      />
    );

    const btn3m = screen.getByRole('button', { name: '3m' });
    const btn1a = screen.getByRole('button', { name: '1a' });

    fireEvent.click(btn3m);
    await waitFor(() => {
      expect(financasService.obterGraficoFinancas).toHaveBeenCalledWith(
        expect.objectContaining({ dias: 90 })
      );
    });

    fireEvent.click(btn1a);
    await waitFor(() => {
      expect(financasService.obterGraficoFinancas).toHaveBeenCalledWith(
        expect.objectContaining({ dias: 365 })
      );
    });

    fireEvent.change(screen.getByLabelText('Valor mínimo do gráfico'), {
      target: { value: '1500' },
    });
    fireEvent.change(screen.getByLabelText('Valor máximo do gráfico'), {
      target: { value: '5000' },
    });

    await waitFor(() => {
      expect(financasService.obterGraficoFinancas).toHaveBeenCalledWith({
        dias: 365,
        valor_min: '1500',
        valor_max: '5000',
      });
    });

    const faixaJul = screen.getByTestId('ponto-entrada-Jul');
    fireEvent.mouseEnter(faixaJul);
    expect(screen.getByTestId('fluxo-crosshair')).toBeInTheDocument();
    expect(screen.getByTestId('fluxo-tooltip')).toBeInTheDocument();

    const faixaAgo = screen.getByTestId('ponto-entrada-Ago');
    fireEvent.mouseMove(faixaAgo);
    expect(screen.getByTestId('fluxo-tooltip')).toBeInTheDocument();

    fireEvent.click(faixaAgo);
    expect(screen.queryByTestId('fluxo-tooltip')).not.toBeInTheDocument();
    fireEvent.click(faixaAgo);
    expect(screen.getByTestId('fluxo-tooltip')).toBeInTheDocument();

    fireEvent.mouseLeave(faixaAgo.closest('div'));
    expect(screen.queryByTestId('fluxo-tooltip')).not.toBeInTheDocument();

    const segDespesas = screen.getByTestId(
      'donut-segment-Despesas Operacionais'
    );
    fireEvent.mouseEnter(segDespesas);
    expect(screen.getByTestId('donut-center-tooltip')).toBeInTheDocument();
    fireEvent.click(segDespesas);
    expect(
      screen.queryByTestId('donut-center-tooltip')
    ).not.toBeInTheDocument();
    fireEvent.click(segDespesas);
    expect(screen.getByTestId('donut-center-tooltip')).toBeInTheDocument();
    fireEvent.mouseLeave(segDespesas.closest('div'));
    expect(
      screen.queryByTestId('donut-center-tooltip')
    ).not.toBeInTheDocument();

    const legendaDespesas = screen.getByText('Despesas Operacionais');
    fireEvent.mouseEnter(legendaDespesas.parentElement);
    expect(screen.getByTestId('donut-center-tooltip')).toBeInTheDocument();
    fireEvent.mouseLeave(legendaDespesas.parentElement);
    expect(
      screen.queryByTestId('donut-center-tooltip')
    ).not.toBeInTheDocument();
  });

  it('exibe estado vazio no gráfico de rosca quando não há despesas e funciona com categoria única', () => {
    financasService.obterGraficoFinancas.mockResolvedValueOnce(null);

    const { rerender } = render(<FinancialDashboard lancamentos={[]} />);
    expect(screen.getByText('Nenhuma despesa registrada')).toBeInTheDocument();

    rerender(
      <FinancialDashboard
        lancamentos={[
          {
            id: 10,
            tipo: 'saida',
            categoria: 'Aluguel',
            valor: 2000,
            dataIso: '2026-08-01',
          },
        ]}
      />
    );
    expect(screen.getByTestId('donut-segment-Aluguel')).toBeInTheDocument();
  });
});
