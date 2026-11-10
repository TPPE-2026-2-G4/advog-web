import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AtividadesPage from './page';
import {
  atualizarAtividade,
  buscarAtividade,
  criarAtividade,
  excluirAtividade,
  obterKanbanAtividades,
} from '@/services/atividades';
import { listarFuncionarios } from '@/services/funcionarios';
import { listarProcessos } from '@/services/processos';
import { getCurrentUser } from '@/utils/authSession';

vi.mock('@/services/atividades', () => ({
  obterKanbanAtividades: vi.fn(),
  buscarAtividade: vi.fn(),
  criarAtividade: vi.fn(),
  atualizarAtividade: vi.fn(),
  excluirAtividade: vi.fn(),
}));

vi.mock('@/services/funcionarios', () => ({
  listarFuncionarios: vi.fn(),
}));

vi.mock('@/services/processos', () => ({
  listarProcessos: vi.fn(),
}));

vi.mock('@/utils/authSession', () => ({
  getCurrentUser: vi.fn(),
}));

const mockKanban = {
  escopo: 'escritorio',
  etapas: [
    {
      etapa_id: 1,
      nome: 'Backlog',
      ordem: 1,
      atividades: [
        {
          atividade_id: 10,
          titulo: 'Protocolar petição',
          data_prazo: '2020-01-10T15:00:00',
          processo_id: 5,
          responsaveis: [{ funcionario_id: 1, nome: 'Dr. Alexandre' }],
        },
      ],
    },
    {
      etapa_id: 2,
      nome: 'Finalizado',
      ordem: 2,
      atividades: [],
    },
  ],
};

describe('AtividadesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obterKanbanAtividades.mockResolvedValue({ escopo: 'usuario', etapas: [] });
    listarFuncionarios.mockResolvedValue([]);
    listarProcessos.mockResolvedValue({ itens: [] });
  });

  it('renderiza o título e o subtítulo do quadro de atividades', async () => {
    render(<AtividadesPage />);

    expect(
      screen.getByRole('heading', { name: 'Quadro de Atividades' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Gerencie as tarefas do escritório por status')
    ).toBeInTheDocument();

    await waitFor(() => expect(obterKanbanAtividades).toHaveBeenCalledOnce());
  });
});

describe('AtividadesPage e AtividadesClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockReturnValue({
      cargo: {
        permissao: {
          criar_atividades: true,
          editar_atividades: true,
          excluir_atividades: true,
        },
      },
    });
    obterKanbanAtividades.mockResolvedValue(mockKanban);
    listarFuncionarios.mockResolvedValue([
      { funcionario_id: 1, nome: 'Dr. Alexandre' },
      { funcionario_id: 2, nome: 'Dra. Ana' },
    ]);
    listarProcessos.mockResolvedValue({
      itens: [{ processo_id: 5, titulo: 'Ação Trabalhista' }],
    });
    buscarAtividade.mockResolvedValue({
      atividade_id: 10,
      titulo: 'Protocolar petição',
      descricao: 'Protocolar inicial no PJe',
      data_inicio: '2020-01-01T09:00:00',
      data_prazo: '2020-01-10T15:00:00',
      etapa_id: 1,
      processo_id: 5,
      responsaveis: [{ funcionario_id: 1, nome: 'Dr. Alexandre' }],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza kanban, visualiza detalhes, edita, move etapa e exclui atividade', async () => {
    const realSetTimeout = global.setTimeout;
    let dismissFeedback;
    vi.spyOn(global, 'setTimeout').mockImplementation((fn, delay, ...args) => {
      if (delay === 15000) dismissFeedback = fn;
      return realSetTimeout(fn, delay, ...args);
    });
    atualizarAtividade.mockResolvedValue({});
    excluirAtividade.mockResolvedValue(undefined);

    render(<AtividadesPage />);

    await waitFor(() => {
      expect(screen.getByText('Protocolar petição')).toBeInTheDocument();
    });
    expect(screen.getByText(/Vencida/)).toBeInTheDocument();
    expect(screen.getByText('Ação Trabalhista')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma atividade')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Protocolar petição'));
    await waitFor(() => {
      expect(screen.getByText('Protocolar inicial no PJe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Editar Atividade' })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Dra. Ana'));
    fireEvent.click(screen.getByLabelText('Dr. Alexandre'));
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Protocolar petição revisada' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Salvar Alterações' }));

    await waitFor(() => {
      expect(atualizarAtividade).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          titulo: 'Protocolar petição revisada',
          responsaveis_ids: [2],
        })
      );
      expect(
        screen.getByText('Atividade atualizada com sucesso.')
      ).toBeInTheDocument();
    });

    const card = screen.getByText('Protocolar petição').closest('[draggable]');
    const col2 = screen.getByTestId('coluna-2');
    fireEvent.dragStart(card);
    fireEvent.dragOver(col2);
    fireEvent.drop(col2);

    await waitFor(() => {
      expect(atualizarAtividade).toHaveBeenCalledWith(10, { etapa_id: 2 });
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Excluir Protocolar petição' })
    );
    await waitFor(() => {
      expect(excluirAtividade).toHaveBeenCalledWith(10);
      expect(screen.getByText('Atividade excluída.')).toBeInTheDocument();
    });

    act(() => {
      dismissFeedback();
    });
    expect(screen.queryByText('Atividade excluída.')).not.toBeInTheDocument();
  });

  it('valida formulário e cria nova atividade', async () => {
    criarAtividade.mockResolvedValue({ atividade_id: 11 });

    render(<AtividadesPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Nova Atividade/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Nova Atividade/i }));
    fireEvent.submit(screen.getByRole('button', { name: 'Criar Atividade' }));
    expect(
      screen.getByText('Preencha todos os campos obrigatórios.')
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Nova tarefa' },
    });
    fireEvent.change(screen.getByLabelText('Descrição'), {
      target: { value: 'Descrição da tarefa' },
    });
    fireEvent.change(screen.getByLabelText('Data de início'), {
      target: { value: '2026-10-10' },
    });
    fireEvent.change(screen.getByLabelText('Prazo'), {
      target: { value: '2026-10-05' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Criar Atividade' }));
    expect(
      screen.getByText('O prazo não pode ser anterior à data de início.')
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Prazo'), {
      target: { value: '2026-10-15' },
    });
    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('Processo associado'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByLabelText('Dr. Alexandre'));
    fireEvent.submit(screen.getByRole('button', { name: 'Criar Atividade' }));

    await waitFor(() => {
      expect(criarAtividade).toHaveBeenCalledWith({
        titulo: 'Nova tarefa',
        descricao: 'Descrição da tarefa',
        data_inicio: '2026-10-10T00:00:00',
        data_prazo: '2026-10-15T23:59:59',
        etapa_id: 2,
        processo_id: 5,
        responsaveis_ids: [1],
      });
      expect(
        screen.getByText('Atividade criada com sucesso.')
      ).toBeInTheDocument();
    });
  });

  it('trata permissões restritas e erros de API', async () => {
    buscarAtividade.mockRejectedValueOnce(new Error('Erro ao abrir detalhes'));
    atualizarAtividade.mockRejectedValueOnce(new Error('Erro ao mover'));
    excluirAtividade.mockRejectedValueOnce(new Error('Erro ao excluir'));
    criarAtividade.mockRejectedValueOnce(new Error('Erro ao salvar'));
    listarProcessos.mockRejectedValueOnce(new Error('Falha processos'));

    render(<AtividadesPage />);
    await waitFor(() => {
      expect(screen.getByText('Protocolar petição')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Protocolar petição'));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Erro ao abrir detalhes'
      );
    });

    const card = screen.getByText('Protocolar petição').closest('[draggable]');
    const col2 = screen.getByTestId('coluna-2');
    fireEvent.dragStart(card);
    fireEvent.drop(col2);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Erro ao mover');
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Excluir Protocolar petição' })
    );
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Erro ao excluir');
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Editar Protocolar petição' })
    );
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Editar Atividade' })
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    fireEvent.click(screen.getByRole('button', { name: /Nova Atividade/i }));
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'T' },
    });
    fireEvent.change(screen.getByLabelText('Descrição'), {
      target: { value: 'D' },
    });
    fireEvent.change(screen.getByLabelText('Data de início'), {
      target: { value: '2026-10-10' },
    });
    fireEvent.change(screen.getByLabelText('Prazo'), {
      target: { value: '2026-10-15' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Criar Atividade' }));
    await waitFor(() => {
      expect(screen.getByText('Erro ao salvar')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Fechar' })[0]);

    getCurrentUser.mockReturnValue({
      cargo: {
        permissao: {
          criar_atividades: false,
          editar_atividades: false,
          excluir_atividades: false,
        },
      },
    });
    obterKanbanAtividades.mockRejectedValueOnce(
      new Error('Falha ao carregar kanban')
    );

    render(<AtividadesPage />);
    await waitFor(() => {
      expect(screen.getAllByRole('alert')[0]).toBeInTheDocument();
    });
  });

  it('não exibe conta administradora na lista de responsáveis nem nos filtros', async () => {
    listarFuncionarios.mockResolvedValueOnce([
      {
        funcionario_id: 1,
        nome: 'Administrador',
        cargo: 'Administrador',
        email: 'advog@advog.com',
      },
      { funcionario_id: 2, nome: 'Dra. Ana Paula', cargo: 'Advogada' },
    ]);
    render(<AtividadesPage />);

    const filtroSelect = screen.getByLabelText('Filtrar por responsável');
    await waitFor(() => {
      const options = Array.from(filtroSelect.querySelectorAll('option')).map(
        (o) => o.textContent
      );
      expect(options).toContain('Dra. Ana Paula');
      expect(options).not.toContain('Administrador');
    });

    fireEvent.click(screen.getByRole('button', { name: /Nova Atividade/i }));
    expect(screen.getAllByText('Dra. Ana Paula')).toHaveLength(2);
    expect(screen.queryByText('Administrador')).not.toBeInTheDocument();
  });
});
