import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CalendarioClient from './calendarioClient';
import { exportarCalendarioIcs, obterCalendario } from '@/services/financas';

vi.mock('@/services/financas', () => ({
  obterCalendario: vi.fn(),
  exportarCalendarioIcs: vi.fn(),
}));

const mockLancamentos = [
  {
    id: 1,
    titulo: 'Honorários Iniciais - João Santos',
    descricao: 'Honorários',
    categoria: 'Honorários',
    tipo: 'entrada',
    valor: 5000,
    status: 'realizado',
    data_vencimento: '2026-08-01',
    dataVencimentoIso: '2026-08-01',
    google_calendar_url: 'https://calendar.google.com/render?test=1',
    outlook_calendar_url: 'https://outlook.office.com/render?test=1',
  },
  {
    id: 2,
    titulo: 'Custas Processuais - Maria Souza',
    descricao: 'Custas',
    categoria: 'Custas',
    tipo: 'saida',
    valor: 250,
    status: 'realizado',
    data_vencimento: '2026-08-05',
    dataVencimentoIso: '2026-08-05',
  },
  {
    id: 3,
    titulo: 'Honorários de Êxito - Costa Indústrias',
    descricao: 'Honorários',
    categoria: 'Honorários',
    tipo: 'entrada',
    valor: 8500,
    status: 'realizado',
    data_vencimento: '2026-08-10',
    dataVencimentoIso: '2026-08-10',
  },
  {
    id: 4,
    titulo: 'Aluguel do Escritório',
    descricao: 'Despesas Operacionais',
    categoria: 'Despesas Operacionais',
    tipo: 'saida',
    valor: 3200,
    status: 'realizado',
    data_vencimento: '2026-08-15',
    dataVencimentoIso: '2026-08-15',
  },
  {
    id: 5,
    titulo: 'Consultoria Jurídica - Tech Solutions',
    descricao: 'Honorários',
    categoria: 'Honorários',
    tipo: 'entrada',
    valor: 4200,
    status: 'pendente',
    data_vencimento: '2026-08-18',
    dataVencimentoIso: '2026-08-18',
  },
  {
    id: 6,
    titulo: 'Software Jurídico Mensalidade',
    descricao: 'Despesas Operacionais',
    categoria: 'Despesas Operacionais',
    tipo: 'saida',
    valor: 450,
    status: 'pendente',
    data_vencimento: '2026-08-22',
    dataVencimentoIso: '2026-08-22',
  },
  {
    id: 7,
    titulo: 'Honorários Recorrentes - ABC Ltda',
    descricao: 'Honorários',
    categoria: 'Honorários',
    tipo: 'entrada',
    valor: 3000,
    status: 'atrasado',
    data_vencimento: '2026-08-25',
    dataVencimentoIso: '2026-08-25',
  },
];

describe('CalendarioClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obterCalendario.mockResolvedValue([]);
  });

  it('renderiza o cabeçalho, título e subtítulo corretamente', () => {
    render(
      <CalendarioClient
        initialData={mockLancamentos}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Calendário de Pagamentos',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Controle financeiro por data de vencimento')
    ).toBeInTheDocument();
  });

  it('calcula e exibe os valores corretos nos 5 cards de resumo financeiro', () => {
    render(
      <CalendarioClient
        initialData={mockLancamentos}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    expect(screen.getByText('Entradas pagas')).toBeInTheDocument();
    expect(screen.getByText('R$ 13.500,00')).toBeInTheDocument();

    expect(screen.getByText('Saídas pagas')).toBeInTheDocument();
    expect(screen.getByText('R$ 3.450,00')).toBeInTheDocument();

    expect(screen.getAllByText('A receber')[0]).toBeInTheDocument();
    expect(screen.getByText('R$ 4.200,00')).toBeInTheDocument();

    expect(screen.getAllByText('A pagar')[0]).toBeInTheDocument();
    expect(screen.getByText('R$ 450,00')).toBeInTheDocument();

    expect(screen.getByText('Em atraso')).toBeInTheDocument();
    expect(screen.getByText('R$ 3.000,00')).toBeInTheDocument();
  });

  it('renderiza os dias da semana e o mês/ano selecionado', () => {
    render(
      <CalendarioClient
        initialData={mockLancamentos}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    expect(screen.getByText('Agosto 2026')).toBeInTheDocument();

    ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach((dia) => {
      expect(screen.getByText(dia)).toBeInTheDocument();
    });
  });

  it('exibe estado inicial na lateral pedindo para selecionar uma data', () => {
    render(
      <CalendarioClient
        initialData={mockLancamentos}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    expect(
      screen.getByText(
        'Selecione uma data no calendário para ver os lançamentos.'
      )
    ).toBeInTheDocument();
  });

  it('permite selecionar um dia e exibe os lançamentos detalhados no painel lateral', () => {
    const onSelectDay = vi.fn();
    render(
      <CalendarioClient
        initialData={mockLancamentos}
        initialDate={new Date(2026, 7, 1)}
        onSelectDay={onSelectDay}
      />
    );

    const day1Button = screen.getByTestId('day-1');
    fireEvent.click(day1Button);

    expect(onSelectDay).toHaveBeenCalledWith(1);
    expect(day1Button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('01/08/2026')).toBeInTheDocument();
    expect(
      screen.getByText('Honorários Iniciais - João Santos')
    ).toBeInTheDocument();
    expect(screen.getByText('+ R$ 5.000,00')).toBeInTheDocument();
    expect(screen.getByText('Recebido')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /Exportar Agosto de 2026 \(\.ics\)/i,
      })
    ).toBeInTheDocument();
  });

  it('carrega automaticamente os lançamentos via obterCalendario na montagem inicial', async () => {
    obterCalendario.mockResolvedValueOnce([
      {
        id: 99,
        titulo: 'Lançamento Novembro',
        valor: 1500,
        tipo: 'entrada',
        status: 'pendente',
        data_vencimento: '2026-11-12',
        dataVencimentoIso: '2026-11-12',
      },
    ]);

    render(
      <CalendarioClient initialData={[]} initialDate={new Date(2026, 10, 1)} />
    );

    await waitFor(() => {
      expect(obterCalendario).toHaveBeenCalledWith({
        inicio: '2026-11-01',
        fim: '2026-11-30',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('R$ 1.500,00')).toBeInTheDocument();
    });
  });

  it('exibe mensagem quando o dia selecionado não possui lançamentos', () => {
    render(
      <CalendarioClient
        initialData={mockLancamentos}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    const day2Button = screen.getByTestId('day-2');
    fireEvent.click(day2Button);

    expect(screen.getByText('02/08/2026')).toBeInTheDocument();
    expect(screen.getByText('Sem lançamentos neste dia.')).toBeInTheDocument();
  });

  it('desmarca o dia ao clicar novamente no mesmo dia ou no botão de fechar', () => {
    render(
      <CalendarioClient
        initialData={mockLancamentos}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    const day1Button = screen.getByTestId('day-1');
    fireEvent.click(day1Button);
    expect(screen.getByText('01/08/2026')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', {
      name: /Fechar detalhes da data/i,
    });
    fireEvent.click(closeBtn);

    expect(
      screen.getByText(
        'Selecione uma data no calendário para ver os lançamentos.'
      )
    ).toBeInTheDocument();

    fireEvent.click(day1Button);
    expect(screen.getByText('01/08/2026')).toBeInTheDocument();
    fireEvent.click(day1Button);
    expect(
      screen.getByText(
        'Selecione uma data no calendário para ver os lançamentos.'
      )
    ).toBeInTheDocument();
  });

  it('navega entre meses anteriores e posteriores', async () => {
    const onMonthChange = vi.fn();
    obterCalendario.mockResolvedValue([]);

    render(
      <CalendarioClient
        initialData={mockLancamentos}
        initialDate={new Date(2026, 7, 1)}
        onMonthChange={onMonthChange}
      />
    );

    expect(screen.getByText('Agosto 2026')).toBeInTheDocument();

    const nextBtn = screen.getByRole('button', { name: /Próximo mês/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText('Setembro 2026')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /Exportar Setembro de 2026 \(\.ics\)/i,
      })
    ).toBeInTheDocument();
    expect(onMonthChange).toHaveBeenCalled();

    const prevBtn = screen.getByRole('button', { name: /Mês anterior/i });
    fireEvent.click(prevBtn);
    expect(screen.getByText('Agosto 2026')).toBeInTheDocument();

    fireEvent.click(prevBtn);
    expect(screen.getByText('Julho 2026')).toBeInTheDocument();
  });

  it('exporta o mês exibido com o nome do mês e ano no botão', async () => {
    const onExportIcs = vi.fn();
    render(
      <CalendarioClient
        initialData={mockLancamentos}
        initialDate={new Date(2026, 7, 1)}
        onExportIcs={onExportIcs}
      />
    );

    const exportBtn = screen.getByRole('button', {
      name: /Exportar Agosto de 2026 \(\.ics\)/i,
    });
    fireEvent.click(exportBtn);

    expect(onExportIcs).toHaveBeenCalledWith({
      inicio: '2026-08-01',
      fim: '2026-08-31',
    });
  });

  it('desabilita o botão enquanto a exportação está em andamento', async () => {
    let concluirExportacao;
    const exportacaoPendente = new Promise((resolve) => {
      concluirExportacao = resolve;
    });
    const onExportIcs = vi.fn(() => exportacaoPendente);

    render(
      <CalendarioClient
        initialData={mockLancamentos}
        initialDate={new Date(2026, 7, 1)}
        onExportIcs={onExportIcs}
      />
    );

    const exportBtn = screen.getByRole('button', {
      name: /Exportar Agosto de 2026 \(\.ics\)/i,
    });
    fireEvent.click(exportBtn);

    expect(exportBtn).toBeDisabled();
    expect(exportBtn).toHaveTextContent('Exportar Agosto de 2026 (.ics)');

    fireEvent.click(exportBtn);
    expect(onExportIcs).toHaveBeenCalledTimes(1);

    concluirExportacao();
    await waitFor(() => expect(exportBtn).not.toBeDisabled());
  });

  it('exibe mensagem de erro quando a exportação falha', async () => {
    exportarCalendarioIcs.mockRejectedValueOnce(
      new Error('Erro ao gerar arquivo')
    );

    render(
      <CalendarioClient
        initialData={mockLancamentos}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    const exportBtn = screen.getByRole('button', {
      name: /Exportar Agosto de 2026 \(\.ics\)/i,
    });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Erro ao gerar arquivo'
      );
    });
  });
});
