import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AtividadesClient from './atividadesClient';
import AtividadesPage from './page';
import {
  filtrarAtividades,
  listarProdutividadeEquipe,
  obterKanbanAtividades,
} from '@/services/atividades';
import { obterResumoAtividades } from '@/services/dashboard';
import { useKanbanAtividades } from '@/hooks/useKanbanAtividades';
import { useResumoAtividades } from '@/hooks/useResumoAtividades';

vi.mock('@/services/atividades', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    obterKanbanAtividades: vi.fn((...args) =>
      actual.obterKanbanAtividades(...args)
    ),
    filtrarAtividades: vi.fn(),
  };
});

vi.mock('@/services/dashboard', () => ({
  obterResumoAtividades: vi.fn(),
}));

const atividade = (id) => ({
  atividade_id: id,
  titulo: `Atividade ${id}`,
  data_prazo: '2026-12-01T18:00:00',
  processo_id: null,
  responsaveis: [],
});

const kanban = {
  escopo: 'escritorio',
  etapas: [
    { etapa_id: 4, nome: 'Finalizado', ordem: 4, atividades: [atividade(7)] },
    {
      etapa_id: 1,
      nome: 'Backlog',
      ordem: 1,
      atividades: [atividade(1), atividade(2), atividade(3)],
    },
    {
      etapa_id: 3,
      nome: 'Revisão',
      ordem: 3,
      atividades: [atividade(5), atividade(6)],
    },
    {
      etapa_id: 2,
      nome: 'Em Execução',
      ordem: 2,
      atividades: [atividade(4)],
    },
  ],
};

describe('AtividadesClient integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obterKanbanAtividades.mockResolvedValue(kanban);
  });

  it('renderiza AtividadesPage como wrapper de AtividadesClient', () => {
    const page = AtividadesPage();
    expect(page).toBeTruthy();
  });

  it('exibe o total e a contagem de cada etapa na ordem do quadro', async () => {
    render(<AtividadesClient />);

    await waitFor(() =>
      expect(screen.getByText('Total').nextSibling).toHaveTextContent('7')
    );

    const labels = screen
      .getAllByRole('listitem')
      .map((item) => item.firstChild.textContent);
    expect(labels).toEqual([
      'Total',
      'Backlog',
      'Em Execução',
      'Revisão',
      'Finalizado',
    ]);
    expect(screen.getByText('Backlog').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('Em Execução').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Revisão').nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Finalizado').nextSibling).toHaveTextContent('1');
  });

  it('mostra traços enquanto os dados carregam', () => {
    obterKanbanAtividades.mockReturnValue(new Promise(() => {}));

    render(<AtividadesClient />);

    expect(screen.getByText('Total').nextSibling).toHaveTextContent('—');
  });

  it('permite tentar novamente quando o carregamento falha', async () => {
    obterKanbanAtividades
      .mockRejectedValueOnce(new Error('Falha ao carregar o quadro'))
      .mockResolvedValueOnce(kanban);

    render(<AtividadesClient />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Falha ao carregar o quadro'
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() =>
      expect(screen.getByText('Total').nextSibling).toHaveTextContent('7')
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('usa mensagem padrão quando a falha não é uma instância de Error', async () => {
    obterKanbanAtividades.mockRejectedValue('falha');

    render(<AtividadesClient />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar as atividades.'
    );
  });

  it('exibe o quadro do usuário quando a API não devolve o escopo do escritório', async () => {
    obterKanbanAtividades.mockResolvedValue({
      escopo: 'usuario',
      etapas: [{ etapa_id: 1, nome: 'Backlog', ordem: 1 }],
    });
    const { result } = renderHook(() => useKanbanAtividades());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.scope).toBe('usuario');
  });

  it('ignora respostas do quadro que chegam depois da desmontagem', async () => {
    let resolveKanban;
    let rejectKanban;
    obterKanbanAtividades
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveKanban = resolve;
        })
      )
      .mockReturnValueOnce(
        new Promise((_, reject) => {
          rejectKanban = reject;
        })
      );

    const first = render(<AtividadesClient />);
    first.unmount();
    resolveKanban(kanban);

    const second = render(<AtividadesClient />);
    second.unmount();
    rejectKanban(new Error('tarde demais'));

    await Promise.resolve();
    expect(screen.queryByText('tarde demais')).not.toBeInTheDocument();
  });

  describe('hooks de atividades desabilitados', () => {
    it('não consultam a API quando desabilitados', () => {
      const kanbanHook = renderHook(() => useKanbanAtividades(false));
      const summaryHook = renderHook(() => useResumoAtividades(false));

      expect(kanbanHook.result.current.isLoading).toBe(false);
      expect(summaryHook.result.current.isLoading).toBe(false);
      expect(obterKanbanAtividades).not.toHaveBeenCalled();
      expect(obterResumoAtividades).not.toHaveBeenCalled();
    });
  });

  describe('resumo de atividades', () => {
    it('recarrega o resumo, trata falhas e ignora respostas tardias', async () => {
      obterResumoAtividades
        .mockRejectedValueOnce('falha')
        .mockResolvedValueOnce({ escopo: 'escritorio', pendentes: 2 });
      const { result, rerender } = renderHook(() => useResumoAtividades());

      await waitFor(() =>
        expect(result.current.error).toBe(
          'Não foi possível carregar o resumo de atividades.'
        )
      );

      result.current.reload();
      rerender();
      await waitFor(() => expect(result.current.summary.pendentes).toBe(2));
      expect(result.current.error).toBe('');
    });

    it('usa a mensagem do erro recebido e ignora respostas após a desmontagem', async () => {
      obterResumoAtividades.mockRejectedValueOnce(new Error('Falha na API'));
      const failed = renderHook(() => useResumoAtividades());
      await waitFor(() =>
        expect(failed.result.current.error).toBe('Falha na API')
      );

      let resolveSummary;
      let rejectSummary;
      obterResumoAtividades
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveSummary = resolve;
          })
        )
        .mockReturnValueOnce(
          new Promise((_, reject) => {
            rejectSummary = reject;
          })
        );
      renderHook(() => useResumoAtividades()).unmount();
      resolveSummary({ pendentes: 9 });
      renderHook(() => useResumoAtividades()).unmount();
      rejectSummary(new Error('tarde demais'));

      await Promise.resolve();
      expect(failed.result.current.summary.pendentes).toBe(0);
    });
  });
});

const FAKE_TOKEN = 'token-kanban-123';

const createJsonResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});

describe('US08 e US10 - Kanban e Gerenciamento de Atividades (Integração)', () => {
  let fetchMock;
  let dbEtapas;
  let dbAtividades;
  let realObterKanbanAtividades;

  beforeEach(async () => {
    vi.clearAllMocks();
    const actual = await vi.importActual('@/services/atividades');
    realObterKanbanAtividades = actual.obterKanbanAtividades;
    obterKanbanAtividades.mockImplementation((...args) =>
      realObterKanbanAtividades(...args)
    );
    sessionStorage.clear();
    localStorage.clear();
    sessionStorage.setItem('access_token', FAKE_TOKEN);
    sessionStorage.setItem(
      'current_user',
      JSON.stringify({
        funcionario_id: 1,
        nome: 'Dr. Alexandre',
        cargo: {
          permissao: {
            criar_atividades: true,
            editar_atividades: true,
            excluir_atividades: true,
          },
        },
      })
    );

    dbAtividades = [
      {
        atividade_id: 10,
        titulo: 'Elaborar contestação',
        descricao: 'Contestação cível com documentos',
        data_inicio: '2026-10-01T09:00:00',
        data_prazo: '2026-10-20T18:00:00',
        etapa_id: 1,
        processo_id: 50,
        responsaveis: [{ funcionario_id: 1, nome: 'Dr. Alexandre' }],
      },
      {
        atividade_id: 11,
        titulo: 'Revisar contrato',
        descricao: 'Contrato social',
        data_inicio: '2026-10-01T09:00:00',
        data_prazo: '2026-10-25T18:00:00',
        etapa_id: 1,
        processo_id: 999,
        responsaveis: [],
      },
    ];

    dbEtapas = [
      { etapa_id: 1, nome: 'Backlog', ordem: 1 },
      { etapa_id: 2, nome: 'Em Execução', ordem: 2 },
      { etapa_id: 3, nome: 'Finalizado', ordem: 3 },
    ];

    fetchMock = vi.fn(async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input.url;
      const method = (init.method || 'GET').toUpperCase();

      if (method === 'GET' && url.includes('/atividades/produtividade')) {
        return createJsonResponse([{ funcionario_id: 1, finalizadas: 2 }]);
      }
      if (method === 'GET' && url.includes('/atividades/kanban')) {
        return createJsonResponse({
          escopo: 'usuario',
          etapas: dbEtapas.map((et) => ({
            ...et,
            atividades: dbAtividades.filter((a) => a.etapa_id === et.etapa_id),
          })),
        });
      }
      if (method === 'GET' && /\/atividades\/\d+$/.test(url)) {
        const id = Number(url.split('/atividades/')[1]);
        const found = dbAtividades.find((a) => a.atividade_id === id);
        return found
          ? createJsonResponse(found)
          : createJsonResponse({ detail: 'Não encontrada' }, 404);
      }
      if (method === 'POST' && url.endsWith('/atividades')) {
        const body = JSON.parse(init.body);
        const created = {
          ...body,
          atividade_id: 99,
          responsaveis: body.responsaveis_ids.map((id) => ({
            funcionario_id: id,
            nome: id === 1 ? 'Dr. Alexandre' : 'Dra. Ana',
          })),
        };
        dbAtividades.push(created);
        return createJsonResponse(created, 201);
      }
      if (method === 'PATCH' && /\/atividades\/\d+$/.test(url)) {
        const id = Number(url.split('/atividades/')[1]);
        const body = JSON.parse(init.body);
        dbAtividades = dbAtividades.map((a) =>
          a.atividade_id === id ? { ...a, ...body } : a
        );
        return createJsonResponse(
          dbAtividades.find((a) => a.atividade_id === id)
        );
      }
      if (method === 'DELETE' && /\/atividades\/\d+$/.test(url)) {
        const id = Number(url.split('/atividades/')[1]);
        dbAtividades = dbAtividades.filter((a) => a.atividade_id !== id);
        return createJsonResponse(null, 204);
      }
      if (method === 'GET' && url.includes('/funcionarios')) {
        return createJsonResponse([
          { funcionario_id: 1, nome: 'Dr. Alexandre' },
          { funcionario_id: 2, nome: 'Dra. Ana' },
        ]);
      }
      if (method === 'GET' && url.includes('/processos')) {
        return createJsonResponse({
          itens: [{ processo_id: 50, titulo: 'Processo Cível 50' }],
        });
      }
      return createJsonResponse({ detail: 'Erro' }, 500);
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('executa fluxo completo de visualização, criação, edição, movimentação e exclusão no Kanban', async () => {
    const realSetTimeout = global.setTimeout;
    let dismissFeedback;
    vi.spyOn(global, 'setTimeout').mockImplementation((fn, delay, ...args) => {
      if (delay === 15000) dismissFeedback = fn;
      return realSetTimeout(fn, delay, ...args);
    });
    await expect(listarProdutividadeEquipe()).resolves.toEqual([
      { funcionario_id: 1, finalizadas: 2 },
    ]);

    render(<AtividadesPage />);

    await waitFor(() => {
      expect(screen.getByText('Elaborar contestação')).toBeInTheDocument();
    });
    expect(screen.getByText('Não atribuído')).toBeInTheDocument();
    expect(screen.getByText('Processo #999')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Revisar contrato'));
    await waitFor(() => {
      expect(screen.getByText('Contrato social')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Editar Atividade' })
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Fechar' })[0]);

    fireEvent.click(screen.getByText('Revisar contrato'));
    await waitFor(() => {
      expect(screen.getByText('Contrato social')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Fechar' })[1]);

    fireEvent.click(
      screen.getByRole('button', { name: 'Editar Elaborar contestação' })
    );
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Editar Atividade' })
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText('Dr. Alexandre'));
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Contestação atualizada' },
    });
    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('Processo associado'), {
      target: { value: '50' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Salvar Alterações' }));
    await waitFor(() => {
      expect(screen.getByText('Contestação atualizada')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Nova Atividade/i }));
    fireEvent.submit(screen.getByRole('button', { name: 'Criar Atividade' }));
    expect(
      screen.getByText('Preencha todos os campos obrigatórios.')
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Audiência trabalhista' },
    });
    fireEvent.change(screen.getByLabelText('Descrição'), {
      target: { value: 'Preparar testemunhas' },
    });
    fireEvent.change(screen.getByLabelText('Data de início'), {
      target: { value: '2026-11-10' },
    });
    fireEvent.change(screen.getByLabelText('Prazo'), {
      target: { value: '2026-11-01' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Criar Atividade' }));
    expect(
      screen.getByText('O prazo não pode ser anterior à data de início.')
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Prazo'), {
      target: { value: '2026-11-15' },
    });
    fireEvent.click(screen.getByLabelText('Dra. Ana'));
    fireEvent.submit(screen.getByRole('button', { name: 'Criar Atividade' }));

    await waitFor(() => {
      expect(screen.getByText('Audiência trabalhista')).toBeInTheDocument();
    });

    const card = screen
      .getByText('Audiência trabalhista')
      .closest('[draggable]');
    const colExec = screen.getByTestId('coluna-2');
    fireEvent.dragStart(card);
    fireEvent.dragOver(colExec);
    fireEvent.drop(colExec);

    await waitFor(() => {
      expect(colExec).toHaveTextContent('Audiência trabalhista');
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Excluir Revisar contrato' })
    );
    await waitFor(() => {
      expect(screen.queryByText('Revisar contrato')).not.toBeInTheDocument();
      expect(screen.getByText('Atividade excluída.')).toBeInTheDocument();
    });

    act(() => {
      dismissFeedback();
    });
    expect(screen.queryByText('Atividade excluída.')).not.toBeInTheDocument();
  });

  it('trata falhas de autenticação, permissão e rede nos serviços e tela', async () => {
    fetchMock.mockResolvedValueOnce(createJsonResponse({}, 401));
    await expect(listarProdutividadeEquipe()).rejects.toThrow(
      'Sessão expirada. Faça login novamente.'
    );

    fetchMock.mockResolvedValueOnce(createJsonResponse({}, 403));
    await expect(listarProdutividadeEquipe()).rejects.toThrow(
      'Você não possui permissão para visualizar a produtividade da equipe.'
    );

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });
    await expect(listarProdutividadeEquipe()).rejects.toThrow(
      'Não foi possível carregar a produtividade da equipe.'
    );

    fetchMock.mockResolvedValueOnce(createJsonResponse({}, 403));
    await expect(realObterKanbanAtividades()).rejects.toThrow(
      'Você não possui permissão para visualizar as atividades.'
    );

    fetchMock.mockRejectedValueOnce(new Error('Network error'));
    await expect(realObterKanbanAtividades()).rejects.toThrow(
      'Não foi possível carregar as atividades.'
    );

    render(<AtividadesPage />);
    await waitFor(() => {
      expect(screen.getByText('Elaborar contestação')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Nova Atividade/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    fetchMock.mockRejectedValueOnce(new Error('Network error'));
    fireEvent.click(screen.getByText('Elaborar contestação'));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Não foi possível carregar os detalhes da atividade.'
      );
    });

    fetchMock.mockRejectedValueOnce(new Error('Network error'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Excluir Elaborar contestação' })
    );
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Não foi possível excluir a atividade.'
      );
    });
  });
});

describe('Integração de Filtros no Quadro de Atividades', () => {
  const atividadeItem = (id, etapaId, titulo) => ({
    atividade_id: id,
    titulo,
    etapa_id: etapaId,
    data_prazo: '2026-12-31T23:59:59',
    processo_id: null,
    responsaveis: [{ funcionario_id: 1, nome: 'Ana Paula' }],
  });
  const kanbanSeteAtividades = {
    escopo: 'escritorio',
    etapas: [
      {
        etapa_id: 1,
        nome: 'Backlog',
        ordem: 1,
        atividades: [
          atividadeItem(1, 1, 'Petição Inicial Santos'),
          atividadeItem(2, 1, 'Contrato Social Alpha'),
          atividadeItem(3, 1, 'Defesa Trabalhista'),
        ],
      },
      {
        etapa_id: 2,
        nome: 'Em Execução',
        ordem: 2,
        atividades: [atividadeItem(4, 2, 'Recurso Ordinário')],
      },
      {
        etapa_id: 3,
        nome: 'Revisão',
        ordem: 3,
        atividades: [
          atividadeItem(5, 3, 'Parecer Tributário'),
          atividadeItem(6, 3, 'Consultoria LGPD'),
        ],
      },
      {
        etapa_id: 4,
        nome: 'Finalizado',
        ordem: 4,
        atividades: [atividadeItem(7, 4, 'Homologação Acordo')],
      },
    ],
  };
  beforeEach(() => {
    vi.clearAllMocks();
    obterKanbanAtividades.mockResolvedValue(kanbanSeteAtividades);
  });
  it('fluxo ponta a ponta: renderiza total inicial, aplica filtro textual e limpa para restaurar', async () => {
    const atividadeFiltrada = [atividadeItem(1, 1, 'Petição Inicial Santos')];
    filtrarAtividades.mockResolvedValue(atividadeFiltrada);
    render(<AtividadesClient />);

    await waitFor(() =>
      expect(screen.getByText('Total').nextSibling).toHaveTextContent('7')
    );
    expect(screen.getByText('Backlog').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('Em Execução').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Revisão').nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Finalizado').nextSibling).toHaveTextContent('1');

    const inputBusca = screen.getByPlaceholderText(
      'Buscar por título, categoria ou responsável...'
    );
    fireEvent.change(inputBusca, { target: { value: 'Petição' } });

    await waitFor(() =>
      expect(filtrarAtividades).toHaveBeenCalledWith(
        expect.objectContaining({ busca_textual: 'Petição' })
      )
    );

    await waitFor(() =>
      expect(screen.getByText('Total').nextSibling).toHaveTextContent('1')
    );
    expect(screen.getByText('Backlog').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Em Execução').nextSibling).toHaveTextContent('0');
    expect(screen.getByText('Revisão').nextSibling).toHaveTextContent('0');
    expect(screen.getByText('Finalizado').nextSibling).toHaveTextContent('0');

    const botaoLimpar = await screen.findByRole('button', {
      name: 'Limpar filtros',
    });
    fireEvent.click(botaoLimpar);

    await waitFor(() =>
      expect(screen.getByText('Total').nextSibling).toHaveTextContent('7')
    );
    expect(screen.getByText('Backlog').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('Em Execução').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Revisão').nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Finalizado').nextSibling).toHaveTextContent('1');
  });
});
