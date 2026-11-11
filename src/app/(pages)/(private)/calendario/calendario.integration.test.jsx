import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CalendarioClient from './calendarioClient';
import { exportarCalendarioIcs, obterCalendario } from '@/services/financas';

vi.mock('@/services/financas', () => ({
  obterCalendario: vi.fn(),
  exportarCalendarioIcs: vi.fn(),
  listarCategorias: vi.fn().mockResolvedValue([]),
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

describe('CalendarioClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obterCalendario.mockResolvedValue([]);
    exportarCalendarioIcs.mockResolvedValue(new Blob(['ics content']));
  });

  it('renderiza o calendário inicial e os lançamentos do mês', () => {
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
  });

  it('renderiza os detalhes de um dia com múltiplos lançamentos', () => {
    render(
      <CalendarioClient
        initialData={mockEventosAgosto}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    fireEvent.click(screen.getByTestId('day-10'));

    expect(screen.getByText('10/08/2026')).toBeInTheDocument();
    expect(screen.getByText('Honorários Processuais A')).toBeInTheDocument();
    expect(screen.getByText('+ R$ 10.000,00')).toBeInTheDocument();
    expect(screen.getByText('Serviço de Nuvem e Backup')).toBeInTheDocument();
    expect(screen.getByText('− R$ 1.500,00')).toBeInTheDocument();
  });

  it('fecha os detalhes ao clicar novamente no mesmo dia', () => {
    render(
      <CalendarioClient
        initialData={mockEventosAgosto}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    const day10Button = screen.getByTestId('day-10');

    fireEvent.click(day10Button);
    expect(screen.getByText('10/08/2026')).toBeInTheDocument();

    fireEvent.click(day10Button);

    expect(
      screen.getByText(
        'Selecione uma data no calendário para ver os lançamentos.'
      )
    ).toBeInTheDocument();
  });

  it('fecha os detalhes pelo botão de fechar', () => {
    render(
      <CalendarioClient
        initialData={mockEventosAgosto}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    fireEvent.click(screen.getByTestId('day-10'));

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Fechar detalhes da data',
      })
    );

    expect(
      screen.getByText(
        'Selecione uma data no calendário para ver os lançamentos.'
      )
    ).toBeInTheDocument();
  });

  it('navega para o mês anterior e limpa o dia selecionado', async () => {
    const onMonthChange = vi.fn();
    const onSelectDay = vi.fn();

    render(
      <CalendarioClient
        initialData={mockEventosAgosto}
        initialDate={new Date(2026, 7, 1)}
        onMonthChange={onMonthChange}
        onSelectDay={onSelectDay}
      />
    );

    fireEvent.click(screen.getByTestId('day-10'));
    expect(screen.getByText('10/08/2026')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Mês anterior',
      })
    );

    expect(screen.getByText('Julho 2026')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Selecione uma data no calendário para ver os lançamentos.'
      )
    ).toBeInTheDocument();

    expect(onMonthChange).toHaveBeenCalledWith(new Date(2026, 6, 1));

    await waitFor(() => {
      expect(obterCalendario).toHaveBeenCalledWith({
        inicio: '2026-07-01',
        fim: '2026-07-31',
      });
    });
  });

  it('navega para o mês seguinte e chama onMonthChange', async () => {
    const onMonthChange = vi.fn();

    obterCalendario
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(mockEventosSetembro);

    render(
      <CalendarioClient
        initialData={mockEventosAgosto}
        initialDate={new Date(2026, 7, 1)}
        onMonthChange={onMonthChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Próximo mês',
      })
    );

    expect(screen.getByText('Setembro 2026')).toBeInTheDocument();

    expect(onMonthChange).toHaveBeenCalledWith(new Date(2026, 8, 1));

    await waitFor(() => {
      expect(obterCalendario).toHaveBeenCalledWith({
        inicio: '2026-09-01',
        fim: '2026-09-30',
      });
    });
  });

  it('chama onSelectDay ao selecionar e deselecionar um dia', () => {
    const onSelectDay = vi.fn();

    render(
      <CalendarioClient
        initialData={mockEventosAgosto}
        initialDate={new Date(2026, 7, 1)}
        onSelectDay={onSelectDay}
      />
    );

    const day10Button = screen.getByTestId('day-10');

    fireEvent.click(day10Button);
    expect(onSelectDay).toHaveBeenLastCalledWith(10);

    fireEvent.click(day10Button);
    expect(onSelectDay).toHaveBeenLastCalledWith(null);
  });

  it('busca os lançamentos do mês seguinte e exibe os dados recebidos', async () => {
    obterCalendario
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(mockEventosSetembro);

    render(
      <CalendarioClient
        initialData={mockEventosAgosto}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Próximo mês',
      })
    );

    await waitFor(() => {
      expect(screen.getByText('Setembro 2026')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('day-5'));

    expect(screen.getByText('05/09/2026')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText('Honorários Mensais Setembro')
      ).toBeInTheDocument();
      expect(screen.getByText('+ R$ 7.500,00')).toBeInTheDocument();
    });
  });

  it('determina o mês inicial a partir de uma data ISO quando initialDate não é informado', () => {
    render(
      <CalendarioClient
        initialData={[
          {
            id: 50,
            titulo: 'Lançamento Outubro',
            tipo: 'entrada',
            valor: 1000,
            status: 'pendente',
            data_vencimento: '2026-10-15T12:00:00',
          },
        ]}
      />
    );

    expect(screen.getByText('Outubro 2026')).toBeInTheDocument();
  });

  it('determina o mês inicial a partir de uma data brasileira quando initialDate não é informado', () => {
    render(
      <CalendarioClient
        initialData={[
          {
            id: 51,
            titulo: 'Lançamento Setembro',
            tipo: 'entrada',
            valor: 1000,
            status: 'pendente',
            dataVencimento: '15/09/2026',
          },
        ]}
      />
    );

    expect(screen.getByText('Setembro 2026')).toBeInTheDocument();
  });

  it('usa a data de fallback quando initialData não possui data válida', () => {
    const currentDate = new Date();

    render(
      <CalendarioClient
        initialData={[
          {
            id: 52,
            titulo: 'Lançamento sem data',
            tipo: 'entrada',
            valor: 1000,
            status: 'pendente',
          },
        ]}
      />
    );

    expect(
      screen.getByText(
        `${
          [
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
          ][currentDate.getMonth()]
        } ${currentDate.getFullYear()}`
      )
    ).toBeInTheDocument();
  });

  it('converte datas brasileiras para o formato ISO ao filtrar lançamentos do dia', () => {
    render(
      <CalendarioClient
        initialData={[
          {
            id: 53,
            titulo: 'Lançamento em formato brasileiro',
            descricao: 'Pagamento em setembro',
            tipo: 'entrada',
            valor: 1800,
            status: 'pendente',
            dataVencimento: '15/09/2026',
          },
        ]}
        initialDate={new Date(2026, 8, 1)}
      />
    );

    fireEvent.click(screen.getByTestId('day-15'));

    expect(screen.getByText('15/09/2026')).toBeInTheDocument();
    expect(
      screen.getByText('Lançamento em formato brasileiro')
    ).toBeInTheDocument();
    expect(screen.getByText('+ R$ 1.800,00')).toBeInTheDocument();
  });

  it('exibe corretamente um lançamento atrasado', () => {
    render(
      <CalendarioClient
        initialData={[
          {
            id: 54,
            titulo: 'Honorários em atraso',
            descricao: 'Pagamento vencido',
            categoria: 'Honorários',
            tipo: 'entrada',
            valor: 2500,
            status: 'atrasado',
            dataVencimentoIso: '2026-08-25',
          },
        ]}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    fireEvent.click(screen.getByTestId('day-25'));

    expect(screen.getByText('25/08/2026')).toBeInTheDocument();
    expect(screen.getAllByText('Atrasado').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('+ R$ 2.500,00')).toBeInTheDocument();
    expect(screen.getByText('Pagamento vencido')).toBeInTheDocument();
  });

  it('exibe descrição diferente do título', () => {
    render(
      <CalendarioClient
        initialData={[
          {
            id: 55,
            titulo: 'Pagamento de honorários',
            descricao: 'Parcela referente ao contrato mensal',
            categoria: 'Honorários',
            tipo: 'entrada',
            valor: 3000,
            status: 'pendente',
            dataVencimentoIso: '2026-08-12',
          },
        ]}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    fireEvent.click(screen.getByTestId('day-12'));

    expect(screen.getByText('Pagamento de honorários')).toBeInTheDocument();
    expect(
      screen.getByText('Parcela referente ao contrato mensal')
    ).toBeInTheDocument();
  });

  it('usa a descrição como título quando não existe título', () => {
    render(
      <CalendarioClient
        initialData={[
          {
            id: 56,
            descricao: 'Pagamento sem título',
            tipo: 'saida',
            valor: 800,
            status: 'pendente',
            dataVencimentoIso: '2026-08-13',
          },
        ]}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    fireEvent.click(screen.getByTestId('day-13'));

    expect(screen.getByText('Pagamento sem título')).toBeInTheDocument();
    expect(screen.getByText('− R$ 800,00')).toBeInTheDocument();
  });

  it('usa "Sem título" quando não existe título nem descrição', () => {
    render(
      <CalendarioClient
        initialData={[
          {
            id: 57,
            tipo: 'despesa',
            valor: 500,
            status: 'pendente',
            dataVencimentoIso: '2026-08-14',
          },
        ]}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    fireEvent.click(screen.getByTestId('day-14'));

    expect(screen.getByText('Sem título')).toBeInTheDocument();
  });

  it.each(['saída', 's'])('reconhece "%s" como saída', (tipo) => {
    render(
      <CalendarioClient
        initialData={[
          {
            id: 60,
            titulo: `Despesa ${tipo}`,
            tipo,
            valor: 700,
            status: 'pendente',
            dataVencimentoIso: '2026-08-16',
          },
        ]}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    fireEvent.click(screen.getByTestId('day-16'));

    expect(screen.getByText(`Despesa ${tipo}`)).toBeInTheDocument();

    expect(screen.getByText('− R$ 700,00')).toBeInTheDocument();
  });

  it('exporta o calendário usando o serviço padrão', async () => {
    render(
      <CalendarioClient
        initialData={mockEventosAgosto}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    const exportButton = screen.getByRole('button', {
      name: 'Exportar Agosto de 2026',
    });

    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(exportarCalendarioIcs).toHaveBeenCalledWith({
        inicio: '2026-08-01',
        fim: '2026-08-31',
      });
    });
    expect(exportButton).not.toBeDisabled();
  });

  it('exporta usando onExportIcs quando o callback é fornecido', async () => {
    const onExportIcs = vi.fn().mockResolvedValue(undefined);

    render(
      <CalendarioClient
        initialData={mockEventosAgosto}
        initialDate={new Date(2026, 7, 1)}
        onExportIcs={onExportIcs}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Exportar Agosto de 2026',
      })
    );

    await waitFor(() => {
      expect(onExportIcs).toHaveBeenCalledWith({
        inicio: '2026-08-01',
        fim: '2026-08-31',
      });
    });

    expect(exportarCalendarioIcs).not.toHaveBeenCalled();
  });

  it('mostra erro quando a exportação falha', async () => {
    exportarCalendarioIcs.mockRejectedValueOnce(
      new Error('Falha ao gerar calendário')
    );

    render(
      <CalendarioClient
        initialData={mockEventosAgosto}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Exportar Agosto de 2026',
      })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falha ao gerar calendário'
    );

    expect(
      screen.getByRole('button', {
        name: 'Exportar Agosto de 2026',
      })
    ).not.toBeDisabled();
  });

  it('usa mensagem padrão quando a exportação rejeita sem mensagem', async () => {
    exportarCalendarioIcs.mockRejectedValueOnce({});

    render(
      <CalendarioClient
        initialData={mockEventosAgosto}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Exportar Agosto de 2026',
      })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Erro ao exportar calendário.'
    );
  });

  it('impede uma segunda exportação enquanto a primeira está em andamento', async () => {
    let resolveExport;

    exportarCalendarioIcs.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveExport = resolve;
      })
    );

    render(
      <CalendarioClient
        initialData={mockEventosAgosto}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    const exportButton = screen.getByRole('button', {
      name: 'Exportar Agosto de 2026',
    });

    fireEvent.click(exportButton);
    fireEvent.click(exportButton);

    expect(exportarCalendarioIcs).toHaveBeenCalledTimes(1);
    expect(exportButton).toBeDisabled();

    resolveExport(new Blob(['ics']));

    await waitFor(() => {
      expect(exportButton).not.toBeDisabled();
    });
  });

  it('ignora resposta da API depois que o componente é desmontado', async () => {
    let resolveCalendario;

    obterCalendario.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCalendario = resolve;
      })
    );

    const { unmount } = render(
      <CalendarioClient initialData={[]} initialDate={new Date(2026, 7, 1)} />
    );

    unmount();

    resolveCalendario([
      {
        id: 999,
        titulo: 'Resposta ignorada',
        tipo: 'entrada',
        valor: 1000,
        status: 'pendente',
        dataVencimentoIso: '2026-08-20',
      },
    ]);

    await waitFor(() => {
      expect(obterCalendario).toHaveBeenCalledWith({
        inicio: '2026-08-01',
        fim: '2026-08-31',
      });
    });
  });

  it('lida com lançamentos com data em formato BR (DD/MM/YYYY), tipos e e despesa, sem título e sem categoria', () => {
    const customItems = [
      {
        id: 301,
        titulo: '',
        descricao: 'Descrição sem título',
        tipo: 'e',
        valor: 1200,
        status: 'pendente',
        data_vencimento: '15/08/2026',
        categoria: null,
      },
      {
        id: 302,
        titulo: 'Despesa Operacional',
        descricao: '',
        tipo: 'despesa',
        valor: 800,
        status: 'pendente',
        data_vencimento: '15/08/2026',
        categoria: '',
      },
    ];

    render(
      <CalendarioClient
        initialData={customItems}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    fireEvent.click(screen.getByTestId('day-15'));
    expect(screen.getByText('Descrição sem título')).toBeInTheDocument();
    expect(screen.getByText('Despesa Operacional')).toBeInTheDocument();
  });

  it('mostra mensagem quando o dia selecionado não tem lançamentos e trata erro ao exportar ics', async () => {
    exportarCalendarioIcs.mockRejectedValueOnce(
      new Error('Falha no servidor ao gerar ICS')
    );

    render(
      <CalendarioClient
        initialData={mockEventosAgosto}
        initialDate={new Date(2026, 7, 1)}
      />
    );

    // Dia 25 não tem eventos em agosto
    fireEvent.click(screen.getByTestId('day-25'));
    expect(screen.getByText('Sem lançamentos neste dia.')).toBeInTheDocument();

    // Exportar ICS falhando
    fireEvent.click(screen.getByRole('button', { name: /Exportar/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Falha no servidor ao gerar ICS')
      ).toBeInTheDocument();
    });
  });

  describe('data inicial, mês sem lançamentos e exportação', () => {
    const withDate = (overrides) => ({
      id: 301,
      titulo: 'Lançamento de teste',
      tipo: 'entrada',
      valor: 100,
      status: 'pendente',
      ...overrides,
    });

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 9, 15));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it.each([
      ['data brasileira', { data: '15/08/2026' }, 'Agosto 2026'],
      [
        'data ISO com horário',
        { dataIso: '2026-09-05T10:00:00' },
        'Setembro 2026',
      ],
      ['data em formato desconhecido', { data: 'quando der' }, 'Outubro 2026'],
      ['data brasileira incompleta', { data: '15/08' }, 'Outubro 2026'],
      ['ano sem mês', { data: '2026-' }, 'Outubro 2026'],
    ])(
      'abre o calendário no mês indicado por %s',
      (_label, overrides, month) => {
        render(<CalendarioClient initialData={[withDate(overrides)]} />);

        expect(screen.getByText(month)).toBeInTheDocument();
      }
    );

    it('abre no mês atual quando os lançamentos não possuem data', () => {
      render(
        <CalendarioClient initialData={[{ id: 1, titulo: 'Sem data' }]} />
      );

      expect(screen.getByText('Outubro 2026')).toBeInTheDocument();
    });

    it('abre no mês atual quando não há lançamentos iniciais válidos', () => {
      render(<CalendarioClient initialData={null} />);

      expect(screen.getByText('Outubro 2026')).toBeInTheDocument();
    });

    it('mantém os lançamentos quando a consulta do mês não devolve uma lista', async () => {
      obterCalendario.mockResolvedValue(null);

      render(
        <CalendarioClient
          initialData={mockEventosAgosto}
          initialDate={new Date(2026, 7, 1)}
        />
      );

      await waitFor(() => expect(obterCalendario).toHaveBeenCalled());
      expect(screen.getByText('R$ 10.000,00')).toBeInTheDocument();
    });

    it('mescla lançamentos recebidos do servidor identificados por lancamento_id', async () => {
      obterCalendario.mockResolvedValue([
        {
          lancamento_id: 777,
          titulo: 'Recebido do servidor',
          tipo: 'entrada',
          valor: 321,
          status: 'pendente',
          data_vencimento: '2026-08-12',
        },
      ]);

      render(
        <CalendarioClient
          initialData={mockEventosAgosto}
          initialDate={new Date(2026, 7, 1)}
        />
      );

      expect(await screen.findByText('R$ 321,00')).toBeInTheDocument();
    });

    it('informa quando o dia selecionado não tem lançamentos', () => {
      render(
        <CalendarioClient
          initialData={mockEventosAgosto}
          initialDate={new Date(2026, 7, 1)}
        />
      );

      fireEvent.click(screen.getByTestId('day-15'));

      expect(
        screen.getByText('Sem lançamentos neste dia.')
      ).toBeInTheDocument();
    });

    it('ignora um segundo clique em exportar enquanto a exportação está em andamento', async () => {
      let finish;
      exportarCalendarioIcs.mockReturnValue(
        new Promise((resolve) => {
          finish = resolve;
        })
      );
      render(
        <CalendarioClient
          initialData={mockEventosAgosto}
          initialDate={new Date(2026, 7, 1)}
        />
      );
      const button = screen.getByRole('button', { name: /Exportar/i });

      fireEvent.click(button);
      fireEvent.click(button);

      expect(exportarCalendarioIcs).toHaveBeenCalledTimes(1);
      finish(new Blob([]));
      await waitFor(() => expect(button).not.toBeDisabled());
    });

    it('usa mensagem padrão quando a exportação falha sem mensagem', async () => {
      exportarCalendarioIcs.mockRejectedValue(undefined);
      render(
        <CalendarioClient
          initialData={mockEventosAgosto}
          initialDate={new Date(2026, 7, 1)}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Exportar/i }));

      expect(
        await screen.findByText('Erro ao exportar calendário.')
      ).toBeInTheDocument();
    });
  });
});
