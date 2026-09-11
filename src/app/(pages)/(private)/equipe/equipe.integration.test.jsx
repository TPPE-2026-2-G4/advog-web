import { describe, expect, it, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { createEmptyPermission } from '@/constants/permissions';
import EquipeClient from './equipeClient';

const withAllowedPermissions = (...permissionNames) => ({
  ...createEmptyPermission(),
  ...Object.fromEntries(permissionNames.map((name) => [name, true])),
});

const roles = [
  {
    cargo_id: 1,
    nome_cargo: 'Administrador',
    descricao: 'Acesso irrestrito ao sistema.',
    permissao: withAllowedPermissions(...Object.keys(createEmptyPermission())),
  },
  {
    cargo_id: 2,
    nome_cargo: 'Advogado',
    descricao: 'Pode criar e editar processos.',
    permissao: withAllowedPermissions(
      'visualizar_processos',
      'criar_processos',
      'editar_processos',
      'visualizar_financeiro',
      'visualizar_equipe',
      'gerenciar_equipe'
    ),
  },
  {
    cargo_id: 3,
    nome_cargo: 'Estagiário',
    descricao: 'Apenas visualização.',
    permissao: withAllowedPermissions(
      'visualizar_processos',
      'visualizar_financeiro',
      'visualizar_equipe'
    ),
  },
];

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

const renderEquipe = (members = []) =>
  render(<EquipeClient initialData={members} initialRoles={roles} />);

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
      cargo_id: 2,
      cargo: roles[1],
      status: 'Pendente',
    };
    fetch.mockResolvedValue(createApiResponse(createdFuncionario));

    renderEquipe([initialMember]);
    fireEvent.click(screen.getByRole('button', { name: /Adicionar Usuário/i }));
    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'João Santos' },
    });
    fireEvent.change(screen.getByLabelText('Email empresarial'), {
      target: { value: 'joao@teste.local' },
    });
    fireEvent.change(screen.getByLabelText('Cargo'), {
      target: { value: '2' },
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
          cargo_id: 2,
        }),
      })
    );
  });

  it('mantém o modal aberto e mostra erro quando o cadastro falha', async () => {
    fetch.mockResolvedValue(
      createApiResponse({ detail: 'E-mail já cadastrado' }, false)
    );

    renderEquipe();
    fireEvent.click(screen.getByRole('button', { name: /Adicionar Usuário/i }));
    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'Maria Silva' },
    });
    fireEvent.change(screen.getByLabelText('Email empresarial'), {
      target: { value: 'maria@teste.local' },
    });
    fireEvent.change(screen.getByLabelText('Cargo'), {
      target: { value: '1' },
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

    renderEquipe([member]);
    fireEvent.click(screen.getByTitle('Excluir usuário'));
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

    renderEquipe([member]);
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
      fetch.mockResolvedValue(
        createApiResponse({
          funcionario_id: member.funcionario_id,
          nome: member.nome_func,
          email: member.email_func,
          status: nextStatus,
        })
      );

      renderEquipe([member]);
      fireEvent.click(screen.getByTitle(actionLabel));
      fireEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', {
          name: actionLabel,
        })
      );

      await waitFor(() => {
        expect(screen.getByText(nextStatus)).toBeInTheDocument();
      });
      expect(screen.getByText('Analista')).toBeInTheDocument();
    }
  );

  it('mantém o status e mostra erro quando a alteração de acesso falha', async () => {
    const member = createMember({ status: 'Ativo' });
    fetch.mockResolvedValue(
      createApiResponse({ detail: 'Funcionário ainda está pendente' }, false)
    );

    renderEquipe([member]);
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
  });

  it('edita os dados e o nível de acesso sem oferecer telefone', async () => {
    const member = createMember({
      cargo_id: 3,
      cargo: 'Estagiário',
      telefone: '(61) 99999-9999',
    });
    renderEquipe([member]);

    fireEvent.click(screen.getByTitle('Editar usuário'));
    expect(screen.getByLabelText('Nível de Acesso')).toHaveValue('3');

    fireEvent.change(screen.getByLabelText('Nome Completo'), {
      target: { value: 'Maria Souza' },
    });
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'maria.souza@teste.local' },
    });
    expect(screen.queryByLabelText('Telefone')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nível de Acesso'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Editar Usuário' })
      ).not.toBeInTheDocument();
    });
    const memberRow = screen.getByText('Maria Souza').closest('tr');
    expect(within(memberRow).getByText('Advogado')).toBeInTheDocument();
    expect(within(memberRow).getByText('(61) 99999-9999')).toBeInTheDocument();
  });

  it('impede alterar o cargo do único administrador', () => {
    const admin = createMember({
      cargo_id: 1,
      cargo: 'Administrador',
    });
    renderEquipe([admin]);

    fireEvent.click(screen.getByTitle('Editar usuário'));

    expect(screen.getByLabelText('Nível de Acesso')).toBeDisabled();
    expect(
      screen.getByText(
        'Único administrador do sistema — cargo não pode ser alterado.'
      )
    ).toBeInTheDocument();
  });

  it('envia o objeto de permissões do cargo sem conversão', async () => {
    const advogado = roles[1];
    const updatedPermission = {
      ...advogado.permissao,
      configuracoes_sistema: true,
    };
    fetch.mockResolvedValue(
      createApiResponse({ ...advogado, permissao: updatedPermission })
    );
    renderEquipe();

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Editar permissões →' })[1]
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Configurações do sistema' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(screen.getByText('7 permissões')).toBeInTheDocument();
    });
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/cargos/2', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissao: updatedPermission }),
    });
  });

  it('cria um cargo com o objeto booleano e usa o ID da API', async () => {
    const member = createMember({ cargo_id: 2, cargo: 'Advogado' });
    const createdPermission = withAllowedPermissions(
      'visualizar_processos',
      'visualizar_equipe'
    );
    fetch.mockResolvedValue(
      createApiResponse({
        cargo_id: 4,
        nome_cargo: 'Paralegal',
        descricao: 'Cargo personalizado.',
        permissao: createdPermission,
      })
    );
    renderEquipe([member]);

    fireEvent.click(screen.getByRole('button', { name: 'Novo Cargo' }));
    fireEvent.change(screen.getByLabelText('Nome do Cargo'), {
      target: { value: 'Paralegal' },
    });
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Visualizar processos' })
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Visualizar equipe' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Criar Cargo' }));

    await waitFor(() => {
      expect(screen.getByText('Paralegal')).toBeInTheDocument();
    });
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/cargos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome_cargo: 'Paralegal',
        descricao: 'Cargo personalizado.',
        permissao: createdPermission,
      }),
    });

    fireEvent.click(screen.getByTitle('Editar usuário'));
    fireEvent.change(screen.getByLabelText('Nível de Acesso'), {
      target: { value: '4' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      const memberRow = screen.getByText('Maria Silva').closest('tr');
      expect(within(memberRow).getByText('Paralegal')).toBeInTheDocument();
    });
  });

  it('exclui um cargo pela API e o remove da referência RBAC', async () => {
    fetch.mockResolvedValue(createApiResponse(roles[2]));
    renderEquipe();

    fireEvent.click(
      screen.getByRole('button', { name: 'Excluir cargo Estagiário' })
    );
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Excluir cargo',
      })
    );

    await waitFor(() => {
      expect(screen.queryByText('Estagiário')).not.toBeInTheDocument();
    });
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/cargos/3', {
      method: 'DELETE',
    });
  });

  it('mantém o cargo e mostra a proteção do backend quando há funcionários vinculados', async () => {
    const message = 'Não é possível excluir um cargo associado a funcionários';
    fetch.mockResolvedValue(createApiResponse({ detail: message }, false));
    renderEquipe();

    fireEvent.click(
      screen.getByRole('button', { name: 'Excluir cargo Advogado' })
    );
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Excluir cargo',
      })
    );

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getAllByText('Advogado')).toHaveLength(2);
    expect(
      screen.getByRole('heading', { name: 'Excluir cargo?' })
    ).toBeInTheDocument();
  });

  it('fecha os modais de confirmação com Escape', () => {
    const member = createMember();
    renderEquipe([member]);

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

    fireEvent.click(
      screen.getByRole('button', { name: 'Excluir cargo Estagiário' })
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('heading', { name: 'Excluir cargo?' })
    ).not.toBeInTheDocument();
  });
});
