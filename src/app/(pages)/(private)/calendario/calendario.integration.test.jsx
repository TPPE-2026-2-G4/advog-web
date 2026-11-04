import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CalendarioClient from './calendarioClient';
import { exportarCalendarioIcs, obterCalendario } from '@/services/financas';

vi.mock('@/services/financas', () => ({
  obterCalendario: vi.fn(),
  exportarCalendarioIcs: vi.fn(),
}));

const mockEventosAgosto = [
  {
    id: 101,
    titulo: 'Honorários Processuais A',
    descricao: 'Primeira parcela',
    categoria: 'Honorários',
    tipo: 'entrada',
    valor: 10000,
    status: 'realizado',
    data_vencimento: '2026-08-10',
    dataVencimentoIso: '2026-08-10',
    google_calendar_url:
      'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Honorarios',
    outlook_calendar_url:
      'https://outlook.office.com/calendar/0/deeplink/compose?subject=Honorarios',
  },
  {
    id: 102,
    titulo: 'Serviço de Nuvem e Backup',
    descricao: 'Assinatura AWS',
    categoria: 'TI',
    tipo: 'saida',
    valor: 1500,
    status: 'realizado',
    data_vencimento: '2026-08-10',
    dataVencimentoIso: '2026-08-10',
  },
  {
    id: 103,
    titulo: 'Custas de Recurso',
    descricao: 'Tribunal de Justiça',
    categoria: 'Custas',
    tipo: 'saida',
    valor: 600,
    status: 'pendente',
    data_vencimento: '2026-08-20',
    dataVencimentoIso: '2026-08-20',
  },
  {
    id: 104,
    titulo: 'Fatura Telefonia Escritório',
    descricao: 'Telefonia fixa e internet',
    categoria: 'Despesas Operacionais',
    tipo: 'saida',
    valor: 350,
    status: 'atrasado',
    data_vencimento: '2026-08-02',
    dataVencimentoIso: '2026-08-02',
  },
];

const mockEventosSetembro = [
  {
    id: 201,
    titulo: 'Honorários Mensais Setembro',
    descricao: 'Cliente Alpha',
    categoria: 'Honorários',
    tipo: 'entrada',
    valor: 7500,
    status: 'pendente',
    data_vencimento: '2026-09-05',
    dataVencimentoIso: '2026-09-05',
  },
];

describe('Integração: Calendário de Pagamentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obterCalendario.mockResolvedValue([]);
  });

  it('renderiza o fluxo completo: visualização de mês e seleção de dia com múltiplos itens', async () => {
    render(
      <CalendarioClient
        initialData={mockEventosAgosto}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    expect(screen.getByText('Agosto 2026')).toBeInTheDocument();
    expect(screen.getByText('R$ 10.000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.500,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 600,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 350,00')).toBeInTheDocument();

    const day10Button = screen.getByTestId('day-10');
    fireEvent.click(day10Button);

    expect(screen.getByText('10/08/2026')).toBeInTheDocument();
    expect(screen.getByText('Honorários Processuais A')).toBeInTheDocument();
    expect(screen.getByText('+ R$ 10.000,00')).toBeInTheDocument();
    expect(screen.getByText('Serviço de Nuvem e Backup')).toBeInTheDocument();
    expect(screen.getByText('− R$ 1.500,00')).toBeInTheDocument();

    expect(
      screen.getByText(
        'Baixe os compromissos do mês em um único arquivo para importar no Google Agenda ou Outlook.'
      )
    ).toBeInTheDocument();
  });

  it('integração com troca de mês e busca via obterCalendario', async () => {
    obterCalendario.mockResolvedValueOnce(mockEventosSetembro);

    render(
      <CalendarioClient
        initialData={mockEventosAgosto}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    const nextBtn = screen.getByRole('button', { name: /Próximo mês/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText('Setembro 2026')).toBeInTheDocument();

    await waitFor(() => {
      expect(obterCalendario).toHaveBeenCalledWith({
        inicio: '2026-09-01',
        fim: '2026-09-30',
      });
    });

    const day5Button = screen.getByTestId('day-5');
    fireEvent.click(day5Button);

    expect(screen.getByText('05/09/2026')).toBeInTheDocument();
    expect(screen.getByText('Honorários Mensais Setembro')).toBeInTheDocument();
    expect(screen.getAllByText('A receber').length).toBeGreaterThan(0);
    expect(screen.getByText('+ R$ 7.500,00')).toBeInTheDocument();
  });

  it('integração com exportação de calendário iCal (.ics)', async () => {
    exportarCalendarioIcs.mockResolvedValueOnce(new Blob(['ics content']));

    render(
      <CalendarioClient
        initialData={mockEventosAgosto}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    const exportBtn = screen.getByRole('button', {
      name: /Exportar Agosto de 2026 \(\.ics\)/i,
    });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(exportarCalendarioIcs).toHaveBeenCalledWith({
        inicio: '2026-08-01',
        fim: '2026-08-31',
      });
    });
  });

  it('suporta datas em formato brasileiro DD/MM/YYYY na inicialização e filtros de dia', () => {
    const dadosFormatoBr = [
      {
        id: 301,
        titulo: 'Entrada Data BR',
        valor: 1200,
        tipo: 'entrada',
        status: 'pendente',
        dataVencimento: '15/08/2026',
      },
    ];

    render(
      <CalendarioClient
        initialData={dadosFormatoBr}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    expect(screen.getByText('Agosto 2026')).toBeInTheDocument();

    const day15Button = screen.getByTestId('day-15');
    fireEvent.click(day15Button);

    expect(screen.getByText('15/08/2026')).toBeInTheDocument();
    expect(screen.getByText('Entrada Data BR')).toBeInTheDocument();
    expect(screen.getByText('+ R$ 1.200,00')).toBeInTheDocument();
  });
});
