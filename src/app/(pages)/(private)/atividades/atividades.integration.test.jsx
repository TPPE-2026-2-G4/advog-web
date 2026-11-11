import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
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
      if (method === 'POST' && url.endsWith('/atividades/etapas')) {
        const body = JSON.parse(init.body);
        if (
          dbEtapas.some(
            (e) => e.nome.toLowerCase() === body.nome.trim().toLowerCase()
          )
        ) {
          return createJsonResponse(
            { detail: 'Já existe uma etapa com este nome' },
            422
          );
        }
        const maxOrdem = Math.max(0, ...dbEtapas.map((e) => e.ordem));
        const nova = {
          etapa_id: 50,
          nome: body.nome.trim(),
          ordem: maxOrdem + 1,
        };
        dbEtapas.push(nova);
        return createJsonResponse(nova, 201);
      }
      if (method === 'PATCH' && url.endsWith('/atividades/etapas/reordenar')) {
        const body = JSON.parse(init.body);
        dbEtapas = body.etapa_ids.map((id, idx) => {
          const et = dbEtapas.find((e) => e.etapa_id === id);
          return { ...et, ordem: idx + 1 };
        });
        return createJsonResponse(dbEtapas);
      }
      if (method === 'PATCH' && /\/atividades\/etapas\/\d+$/.test(url)) {
        const id = Number(url.split('/atividades/etapas/')[1]);
        const body = JSON.parse(init.body);
        dbEtapas = dbEtapas.map((e) =>
          e.etapa_id === id ? { ...e, nome: body.nome.trim() } : e
        );
        return createJsonResponse(dbEtapas.find((e) => e.etapa_id === id));
      }
      if (method === 'DELETE' && /\/atividades\/etapas\/\d+$/.test(url)) {
        const id = Number(url.split('/atividades/etapas/')[1]);
        if (dbAtividades.some((a) => a.etapa_id === id)) {
          return createJsonResponse(
            {
              detail:
                'Não é possível excluir uma etapa que possui atividades vinculadas. Mova ou exclua as atividades antes.',
            },
            422
          );
        }
        dbEtapas = dbEtapas.filter((e) => e.etapa_id !== id);
        return createJsonResponse(null, 204);
      }
      if (method === 'GET' && url.includes('/funcionarios')) {
        return createJsonResponse([
          {
            funcionario_id: 1,
            nome: 'Dr. Alexandre',
            cargo: { nome: 'Advogado Associado' },
          },
          {
            funcionario_id: 2,
            nome: 'Dra. Ana',
            foto_perfil_url: 'https://exemplo.com/ana.png',
            cargo: { nome: 'Sócia' },
          },
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
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Não foi possível excluir a atividade.'
      );
    });
  });

  it('permite criar, renomear, reordenar e excluir etapas, protegendo Backlog e Finalizado', async () => {
    render(<AtividadesPage />);

    await waitFor(() => {
      expect(screen.getByText('Elaborar contestação')).toBeInTheDocument();
    });

    // Backlog e Finalizado não possuem botões de renomear ou excluir
    expect(
      screen.queryByRole('button', { name: 'Renomear etapa Backlog' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Excluir etapa Backlog' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Renomear etapa Finalizado' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Excluir etapa Finalizado' })
    ).not.toBeInTheDocument();

    // Em Execução possui botões de renomear e excluir
    expect(
      screen.getByRole('button', { name: 'Renomear etapa Em Execução' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Excluir etapa Em Execução' })
    ).toBeInTheDocument();

    // Criar nova etapa pelo botão do cabeçalho
    fireEvent.click(screen.getAllByRole('button', { name: /Nova Etapa/i })[0]);
    fireEvent.submit(screen.getByRole('button', { name: 'Criar Etapa' }));
    expect(screen.getByText('Informe o nome da etapa.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nome da etapa'), {
      target: { value: 'Aguardando Cliente' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Criar Etapa' }));

    await waitFor(() => {
      expect(screen.getByText('Etapa criada com sucesso.')).toBeInTheDocument();
      expect(screen.getByTestId('coluna-50')).toBeInTheDocument();
    });

    // Testar o botão de nova etapa inline ao final das colunas (abrir, Escape, abrir e criar com Enter)
    fireEvent.click(
      screen.getByRole('button', { name: 'Adicionar nova etapa ao final' })
    );
    const inlineInput = screen.getByPlaceholderText('Nome da etapa...');
    fireEvent.keyDown(inlineInput, { key: 'Escape' });
    expect(
      screen.queryByPlaceholderText('Nome da etapa...')
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Adicionar nova etapa ao final' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Cancelar nova etapa' })
    );
    expect(
      screen.queryByPlaceholderText('Nome da etapa...')
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Adicionar nova etapa ao final' })
    );
    const inlineInputEnter = screen.getByPlaceholderText('Nome da etapa...');
    fireEvent.change(inlineInputEnter, {
      target: { value: 'Aguardando Cliente' },
    });
    fireEvent.keyDown(inlineInputEnter, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Já existe uma etapa com este nome'
      );
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Cancelar nova etapa' })
    );

    // Renomear a etapa criada
    fireEvent.click(
      screen.getByRole('button', { name: 'Renomear etapa Aguardando Cliente' })
    );
    fireEvent.change(screen.getByLabelText('Nome da etapa'), {
      target: { value: 'Validação Cliente' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Salvar Etapa' }));

    await waitFor(() => {
      expect(
        screen.getByText('Etapa renomeada com sucesso.')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Renomear etapa Validação Cliente' })
      ).toBeInTheDocument();
    });

    // Reordenar colunas arrastando Finalizado (coluna-3) sobre Backlog (coluna-1)
    const colFinalizado = screen.getByTestId('coluna-3');
    const colBacklog = screen.getByTestId('coluna-1');
    fireEvent.dragStart(colFinalizado);
    fireEvent.dragOver(colBacklog);
    fireEvent.drop(colBacklog);
    fireEvent.dragEnd(colFinalizado);

    await waitFor(() => {
      const labels = screen
        .getAllByRole('listitem')
        .map((item) => item.firstChild.textContent);
      expect(labels[1]).toBe('Finalizado');
    });

    // Excluir etapa vazia (Validação Cliente)
    fireEvent.click(
      screen.getByRole('button', { name: 'Excluir etapa Validação Cliente' })
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Excluir etapa' })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));

    await waitFor(() => {
      expect(screen.getByText('Etapa excluída.')).toBeInTheDocument();
      expect(screen.queryByTestId('coluna-50')).not.toBeInTheDocument();
    });
  });

  describe('US - Exclusão de etapa/atividade, AutocompleteMultiResponsible e Detalhes', () => {
    it('bloqueia exclusão de etapa com atividades vinculadas e descarta mensagem após timeout', async () => {
      dbAtividades.push({
        atividade_id: 12,
        titulo: 'Audiência de conciliação',
        descricao: 'Audiência de conciliação cível',
        data_inicio: '2026-10-01T09:00:00',
        data_prazo: '2026-10-28T18:00:00',
        etapa_id: 2,
        processo_id: 50,
        responsaveis: [
          {
            funcionario_id: 2,
            nome: 'Dra. Ana',
            foto_perfil_url: 'https://exemplo.com/ana.png',
          },
        ],
      });

      let dismissActionError;
      const realSetTimeout = global.setTimeout;
      vi.spyOn(global, 'setTimeout').mockImplementation(
        (fn, delay, ...args) => {
          if (delay === 5000) dismissActionError = fn;
          return realSetTimeout(fn, delay, ...args);
        }
      );

      render(<AtividadesPage />);

      await waitFor(() => {
        expect(
          screen.getByText('Audiência de conciliação')
        ).toBeInTheDocument();
      });

      // Tenta excluir etapa 'Em Execução' que possui atividades vinculadas
      const btnExcluirEtapa = screen.getByRole('button', {
        name: 'Excluir etapa Em Execução',
      });
      fireEvent.click(btnExcluirEtapa);

      const msgAlerta =
        'Não é possível excluir uma etapa que possui atividades vinculadas. Mova ou exclua as atividades antes.';
      expect(await screen.findByText(msgAlerta)).toBeInTheDocument();

      // Não abre o modal de confirmação de exclusão
      expect(
        screen.queryByRole('heading', { name: 'Excluir etapa' })
      ).not.toBeInTheDocument();

      // Executa o timeout de 5 segundos que limpa a mensagem automaticamente
      act(() => {
        dismissActionError?.();
      });
      expect(screen.queryByText(msgAlerta)).not.toBeInTheDocument();
    });

    it('abre modal para confirmação de exclusão de atividade com opções de cancelar e confirmar', async () => {
      render(<AtividadesPage />);

      await waitFor(() => {
        expect(screen.getByText('Elaborar contestação')).toBeInTheDocument();
      });

      // Clica em excluir atividade
      fireEvent.click(
        screen.getByRole('button', { name: 'Excluir Elaborar contestação' })
      );

      // Modal de confirmação é exibido
      expect(
        await screen.findByRole('dialog', { name: 'Excluir atividade' })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Tem certeza que deseja excluir a atividade/i)
      ).toBeInTheDocument();

      // Fecha pressionando Escape (cobrindo onClose do Modal de exclusão de atividade)
      fireEvent.keyDown(
        screen.getByRole('dialog', { name: 'Excluir atividade' }),
        { key: 'Escape' }
      );
      expect(
        screen.queryByRole('dialog', { name: 'Excluir atividade' })
      ).not.toBeInTheDocument();

      // Clica em excluir novamente e fecha clicando no botão Fechar (X)
      fireEvent.click(
        screen.getByRole('button', { name: 'Excluir Elaborar contestação' })
      );
      fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
      expect(
        screen.queryByRole('dialog', { name: 'Excluir atividade' })
      ).not.toBeInTheDocument();

      // Clica em excluir novamente
      fireEvent.click(
        screen.getByRole('button', { name: 'Excluir Elaborar contestação' })
      );
      expect(
        await screen.findByRole('dialog', { name: 'Excluir atividade' })
      ).toBeInTheDocument();

      // Clica em Cancelar
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(
        screen.queryByRole('dialog', { name: 'Excluir atividade' })
      ).not.toBeInTheDocument();
      expect(screen.getByText('Elaborar contestação')).toBeInTheDocument();

      // Clica novamente e confirma exclusão
      fireEvent.click(
        screen.getByRole('button', { name: 'Excluir Elaborar contestação' })
      );
      fireEvent.click(
        screen.getByRole('button', { name: 'Confirmar exclusão' })
      );

      await waitFor(() => {
        expect(
          screen.queryByText('Elaborar contestação')
        ).not.toBeInTheDocument();
        expect(screen.getByText('Atividade excluída.')).toBeInTheDocument();
      });
    });

    it('exercita AutocompleteMultiResponsible com busca, teclado, chips, remoção e erro de imagem', async () => {
      render(<AtividadesPage />);

      await waitFor(() => {
        expect(screen.getByText('Revisar contrato')).toBeInTheDocument();
      });

      // Abre modal Nova Atividade
      fireEvent.click(screen.getByRole('button', { name: /Nova Atividade/i }));
      expect(
        await screen.findByRole('heading', { name: 'Nova Atividade' })
      ).toBeInTheDocument();

      // Data de início deve vir com a data atual
      const dataInicioInput = screen.getByLabelText('Data de início');
      expect(dataInicioInput.value).toBe(
        new Date().toISOString().split('T')[0]
      );

      // AutocompleteMultiResponsible
      const combobox = screen.getByRole('combobox', {
        name: /selecione os responsáveis/i,
      });

      // Foca no input
      fireEvent.focus(combobox);

      // Digita 'Ana' para filtrar
      fireEvent.change(combobox, { target: { value: 'Ana' } });

      // Teclado: ArrowDown, ArrowUp, Enter para selecionar Dra. Ana
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      fireEvent.keyDown(combobox, { key: 'ArrowUp' });
      fireEvent.keyDown(combobox, { key: 'Enter' });

      // Chip de Dra. Ana é renderizado
      expect(
        await screen.findByRole('button', { name: 'Remover Dra. Ana' })
      ).toBeInTheDocument();

      // Testa erro de imagem no avatar do chip
      const chipAvatars = screen.getAllByRole('img', {
        name: 'Foto de Dra. Ana',
      });
      chipAvatars.forEach((img) => fireEvent.error(img));

      // Remove Dra. Ana pelo botão do chip
      const removeBtn = screen.getByRole('button', {
        name: 'Remover Dra. Ana',
      });
      fireEvent.click(removeBtn);

      // Limpa busca e clica diretamente na opção Dr. Alexandre do dropdown
      fireEvent.change(combobox, { target: { value: '' } });
      const listbox = screen.getByRole('listbox');

      // Testa erro na imagem do avatar na lista de opções
      const optionImg = within(listbox).queryByRole('img', {
        name: 'Foto de Dra. Ana',
      });
      if (optionImg) {
        fireEvent.error(optionImg);
      }

      const optAlexandre = within(listbox).getByRole('option', {
        name: /Dr. Alexandre/i,
      });
      fireEvent.click(optAlexandre);
      expect(
        await screen.findByRole('button', { name: 'Remover Dr. Alexandre' })
      ).toBeInTheDocument();

      // Clica na opção Dr. Alexandre novamente para desmarcar (toggle off)
      fireEvent.click(optAlexandre);
      expect(
        screen.queryByRole('button', { name: 'Remover Dr. Alexandre' })
      ).not.toBeInTheDocument();

      // Testa busca sem resultados
      fireEvent.change(combobox, { target: { value: 'NenhumExisteAqui' } });
      expect(
        screen.getByText('Nenhum responsável encontrado')
      ).toBeInTheDocument();

      // Testa clique fora para fechar o dropdown (linhas 30-32 do AutocompleteMultiResponsible)
      fireEvent.mouseDown(screen.getByLabelText('Título'));
      expect(
        screen.queryByText('Nenhum responsável encontrado')
      ).not.toBeInTheDocument();

      // Reabre o combobox e navega com teclado envolvendo extremos (wrapping)
      fireEvent.focus(combobox);
      fireEvent.change(combobox, { target: { value: '' } });
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      fireEvent.keyDown(combobox, { key: 'ArrowUp' });
      fireEvent.keyDown(combobox, { key: 'ArrowUp' });
      fireEvent.keyDown(combobox, { key: 'ArrowUp' });

      // Fecha com Escape
      fireEvent.keyDown(combobox, { key: 'Escape' });
    });

    it('abre modal para confirmação de exclusão de etapa vazia com opções de fechar e cancelar', async () => {
      dbEtapas.push({ etapa_id: 88, nome: 'Etapa Teste Cancelar', ordem: 4 });

      render(<AtividadesPage />);

      await waitFor(() => {
        expect(screen.getByText('Etapa Teste Cancelar')).toBeInTheDocument();
      });

      // Clica em excluir etapa
      const btnExcluir = screen.getByRole('button', {
        name: 'Excluir etapa Etapa Teste Cancelar',
      });
      fireEvent.click(btnExcluir);

      // Modal de exclusão de etapa é exibido
      expect(
        await screen.findByRole('dialog', { name: 'Excluir etapa' })
      ).toBeInTheDocument();

      // Clica no botão Fechar (X) do modal de exclusão de etapa
      const fecharXBtn = screen.getByRole('button', { name: 'Fechar' });
      fireEvent.click(fecharXBtn);
      expect(
        screen.queryByRole('dialog', { name: 'Excluir etapa' })
      ).not.toBeInTheDocument();

      // Fecha pressionando Escape (cobrindo onClose do Modal de exclusão de etapa)
      fireEvent.click(btnExcluir);
      expect(
        await screen.findByRole('dialog', { name: 'Excluir etapa' })
      ).toBeInTheDocument();
      fireEvent.keyDown(screen.getByRole('dialog', { name: 'Excluir etapa' }), {
        key: 'Escape',
      });
      expect(
        screen.queryByRole('dialog', { name: 'Excluir etapa' })
      ).not.toBeInTheDocument();

      // Clica novamente em excluir etapa e clica em Cancelar
      fireEvent.click(btnExcluir);
      expect(
        await screen.findByRole('dialog', { name: 'Excluir etapa' })
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(
        screen.queryByRole('dialog', { name: 'Excluir etapa' })
      ).not.toBeInTheDocument();
    });

    it('abre modal de nova etapa e cancela fechando o modal', async () => {
      render(<AtividadesPage />);

      await waitFor(() => {
        expect(screen.getByText('Backlog')).toBeInTheDocument();
      });

      // Abre modal Nova Etapa
      fireEvent.click(
        screen.getAllByRole('button', { name: /Nova Etapa/i })[0]
      );
      expect(
        await screen.findByRole('heading', { name: 'Nova Etapa' })
      ).toBeInTheDocument();

      // Clica no botão Fechar (X)
      fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
      expect(
        screen.queryByRole('heading', { name: 'Nova Etapa' })
      ).not.toBeInTheDocument();

      // Abre novamente e fecha com Escape (cobrindo onClose do Modal de Etapa)
      fireEvent.click(
        screen.getAllByRole('button', { name: /Nova Etapa/i })[0]
      );
      expect(
        await screen.findByRole('heading', { name: 'Nova Etapa' })
      ).toBeInTheDocument();
      fireEvent.keyDown(screen.getByRole('dialog', { name: 'Nova Etapa' }), {
        key: 'Escape',
      });
      expect(
        screen.queryByRole('heading', { name: 'Nova Etapa' })
      ).not.toBeInTheDocument();

      // Abre novamente e clica em Cancelar
      fireEvent.click(
        screen.getAllByRole('button', { name: /Nova Etapa/i })[0]
      );
      expect(
        await screen.findByRole('heading', { name: 'Nova Etapa' })
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(
        screen.queryByRole('heading', { name: 'Nova Etapa' })
      ).not.toBeInTheDocument();

      // Testa criação de etapa inline com Enter
      fireEvent.click(
        screen.getByRole('button', { name: 'Adicionar nova etapa ao final' })
      );
      const inlineInput = screen.getByPlaceholderText('Nome da etapa...');
      fireEvent.change(inlineInput, {
        target: { value: 'Etapa Sucesso Inline' },
      });
      fireEvent.keyDown(inlineInput, { key: 'Enter' });
      await waitFor(() => {
        expect(screen.getByText('Etapa Sucesso Inline')).toBeInTheDocument();
      });
    });

    it('exibe detalhes da atividade com responsáveis e trata erro no avatar', async () => {
      dbAtividades.push({
        atividade_id: 13,
        titulo: 'Audiência com Foto',
        descricao: 'Audiência detalhada',
        data_inicio: '2026-10-01T09:00:00',
        data_prazo: '2026-10-28T18:00:00',
        etapa_id: 1,
        processo_id: 50,
        responsaveis: [
          {
            funcionario_id: 2,
            nome: 'Dra. Ana',
            foto_perfil_url: 'https://exemplo.com/ana.png',
          },
        ],
      });

      render(<AtividadesPage />);

      await waitFor(() => {
        expect(screen.getByText('Audiência com Foto')).toBeInTheDocument();
      });

      // Clica na atividade para abrir detalhes
      fireEvent.click(screen.getByText('Audiência com Foto'));

      expect(
        await screen.findByRole('dialog', { name: 'Detalhes da Atividade' })
      ).toBeInTheDocument();

      // Trata erro de imagem no avatar de responsáveis em detalhes
      const avatarImg = screen.queryByRole('img', { name: 'Foto de Dra. Ana' });
      if (avatarImg) {
        fireEvent.error(avatarImg);
      }

      // Fecha o modal de detalhes pelo botão Fechar do footer
      const fecharBtn = screen.getAllByRole('button', { name: 'Fechar' })[0];
      fireEvent.click(fecharBtn);

      // Reabre detalhes e fecha pelo botão Fechar (X)
      fireEvent.click(screen.getByText('Audiência com Foto'));
      expect(
        await screen.findByRole('dialog', { name: 'Detalhes da Atividade' })
      ).toBeInTheDocument();
      const fecharXBtn = screen.getAllByRole('button', { name: 'Fechar' })[0];
      fireEvent.click(fecharXBtn);

      // Reabre detalhes e fecha pressionando Escape (cobrindo onClose do Modal de detalhes)
      fireEvent.click(screen.getByText('Audiência com Foto'));
      expect(
        await screen.findByRole('dialog', { name: 'Detalhes da Atividade' })
      ).toBeInTheDocument();
      fireEvent.keyDown(
        screen.getByRole('dialog', { name: 'Detalhes da Atividade' }),
        { key: 'Escape' }
      );
      expect(
        screen.queryByRole('dialog', { name: 'Detalhes da Atividade' })
      ).not.toBeInTheDocument();
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
      'Buscar por título, descrição ou responsável...'
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
