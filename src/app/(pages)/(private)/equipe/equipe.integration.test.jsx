import { describe, expect, it, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import EquipeClient from './equipeClient';

const createMember = (overrides = {}) => ({
  funcionario_id: 1,
  initials: 'MS',
  nome_func: 'Maria Silva',
  email_func: 'maria@teste.local',
  cargo: 'Analista',
  status: 'Ativo',
  ...overrides,
});

const createApiResponse = (body, ok = true) => ({
  ok,
  json: vi.fn().mockResolvedValue(body),
});

describe('integração da página de equipe', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('cadastra um funcionário e atualiza a tabela e os indicadores', async () => {
    const initialMember = createMember();
    const createdFuncionario = {
      funcionario_id: 2,
      nome: 'João Santos',
      email: 'joao@teste.local',
      status: 'Pendente',
    };
    fetch.mockResolvedValue(createApiResponse(createdFuncionario));

    render(<EquipeClient initialData={[initialMember]} />);
    fireEvent.click(screen.getByRole('button', { name: /Adicionar Usuário/i }));
    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'João Santos' },
    });
    fireEvent.change(screen.getByLabelText('Email empresarial'), {
      target: { value: 'joao@teste.local' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => {
      expect(screen.getByText('João Santos')).toBeInTheDocument();
    });
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/funcionarios'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          nome: 'João Santos',
          email: 'joao@teste.local',
        }),
      })
    );
  });

  it('mantém o modal aberto e mostra erro quando o cadastro falha', async () => {
    fetch.mockResolvedValue(
      createApiResponse({ detail: 'E-mail já cadastrado' }, false)
    );

    render(<EquipeClient initialData={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Adicionar Usuário/i }));
    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'Maria Silva' },
    });
    fireEvent.change(screen.getByLabelText('Email empresarial'), {
      target: { value: 'maria@teste.local' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(await screen.findByText('E-mail já cadastrado')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Adicionar Novo Usuário' })
    ).toBeInTheDocument();
  });

  it('exclui o membro após confirmação no modal', async () => {
    const member = createMember();
    fetch.mockResolvedValue(createApiResponse(null));

    render(<EquipeClient initialData={[member]} />);
    fireEvent.click(screen.getByTitle('Excluir usuário'));
    expect(
      screen.getByRole('heading', { name: 'Excluir funcionário?' })
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Excluir funcionário' })
    );

    await waitFor(() => {
      expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument();
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/funcionarios/1'),
      { method: 'DELETE' }
    );
  });

  it('mantém o membro e mostra erro quando a exclusão falha', async () => {
    const member = createMember();
    fetch.mockResolvedValue(
      createApiResponse({ detail: 'Funcionário não encontrado' }, false)
    );

    render(<EquipeClient initialData={[member]} />);
    fireEvent.click(screen.getByTitle('Excluir usuário'));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Excluir funcionário',
      })
    );

    expect(
      await screen.findByText('Funcionário não encontrado')
    ).toBeInTheDocument();
    expect(screen.getAllByText('Maria Silva')).toHaveLength(2);
  });

  it.each([
    ['Ativo', 'Revogar acesso', 'Inativo'],
    ['Inativo', 'Permitir acesso', 'Ativo'],
  ])(
    'altera o acesso de %s para %s após confirmar no modal',
    async (status, actionLabel, nextStatus) => {
      const member = createMember({ status });
      const updatedFuncionario = {
        funcionario_id: member.funcionario_id,
        nome: member.nome_func,
        email: member.email_func,
        status: nextStatus,
      };
      fetch.mockResolvedValue(createApiResponse(updatedFuncionario));

      render(<EquipeClient initialData={[member]} />);
      fireEvent.click(screen.getByTitle(actionLabel));
      expect(
        screen.getByRole('heading', { name: `${actionLabel}?` })
      ).toBeInTheDocument();
      fireEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', {
          name: actionLabel,
        })
      );

      await waitFor(() => {
        expect(screen.getByText(nextStatus)).toBeInTheDocument();
      });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/funcionarios/1/mudar-acesso'),
        { method: 'PATCH' }
      );
      expect(
        screen.getByTitle(
          nextStatus === 'Ativo' ? 'Revogar acesso' : 'Permitir acesso'
        )
      ).toBeInTheDocument();
    }
  );

  it('mantém o status e mostra erro quando a alteração de acesso falha', async () => {
    const member = createMember({ status: 'Ativo' });
    fetch.mockResolvedValue(
      createApiResponse({ detail: 'Funcionário ainda está pendente' }, false)
    );

    render(<EquipeClient initialData={[member]} />);
    fireEvent.click(screen.getByTitle('Revogar acesso'));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Revogar acesso',
      })
    );

    expect(
      await screen.findByText('Funcionário ainda está pendente')
    ).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
    expect(screen.getByTitle('Revogar acesso')).toBeInTheDocument();
  });

  it('fecha os modais de confirmação com Escape', () => {
    const member = createMember();
    render(<EquipeClient initialData={[member]} />);

    fireEvent.click(screen.getByTitle('Excluir usuário'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('heading', { name: 'Excluir funcionário?' })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Revogar acesso'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('heading', { name: 'Revogar acesso?' })
    ).not.toBeInTheDocument();
  });
});
