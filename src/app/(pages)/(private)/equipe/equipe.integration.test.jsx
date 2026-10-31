import { describe, expect, it, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  createEmptyPermission,
  getPermissionLabel,
} from '@/constants/permissions';
import {
  atualizarCargo,
  criarCargo,
  excluirCargo,
  listarCargos,
} from '@/services/cargos';
import {
  criarFuncionario,
  excluirFuncionario,
  listarFuncionarios,
  mudarAcessoFuncionario,
  mudarCargoFuncionario,
  mudarExibicaoInstitucional,
} from '@/services/funcionarios';
import {
  formatOab,
  getInitials,
  getLawyerInitials,
  toTeamMember,
} from '@/utils/funcionario';
import EquipeClient from './equipeClient';
import EquipePage from './page';

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
    sessionStorage.setItem('access_token', 'token-jwt');
    sessionStorage.setItem(
      'current_user',
      JSON.stringify({ cargo: { permissao: { gerenciar_equipe: true } } })
    );
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
      expect.objectContaining({
        method: 'DELETE',
      })
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

  it('edita somente o cargo enviando autenticação', async () => {
    const member = createMember({
      cargo_id: 3,
      cargo: 'Estagiário',
      telefone: '(61) 99999-9999',
    });
    fetch.mockResolvedValue(
      createApiResponse({
        funcionario_id: 1,
        nome: 'Maria Silva',
        email: 'maria@teste.local',
        cargo_id: 2,
        cargo: roles[1],
        status: 'Ativo',
      })
    );
    renderEquipe([member]);

    fireEvent.click(screen.getByTitle('Editar usuário'));
    expect(screen.getByLabelText('Nível de Acesso')).toHaveValue('3');

    expect(screen.queryByLabelText('Nome Completo')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
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
    const memberRow = screen.getByText('Maria Silva').closest('tr');
    expect(within(memberRow).getByText('Advogado')).toBeInTheDocument();
    expect(within(memberRow).getByText('(61) 99999-9999')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/funcionarios/1/mudar-cargo'),
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-jwt',
        }),
        body: JSON.stringify({ cargo_id: 2 }),
      })
    );
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
    fetch
      .mockResolvedValueOnce(
        createApiResponse({
          cargo_id: 4,
          nome_cargo: 'Paralegal',
          descricao: 'Cargo personalizado.',
          permissao: createdPermission,
        })
      )
      .mockResolvedValueOnce(
        createApiResponse({
          funcionario_id: 1,
          nome: 'Maria Silva',
          email: 'maria@teste.local',
          cargo_id: 4,
          cargo: {
            cargo_id: 4,
            nome_cargo: 'Paralegal',
            permissao: createdPermission,
          },
          status: 'Ativo',
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

  it('carrega EquipePage buscando GET /funcionarios e GET /cargos e trata falhas de rede/HTTP', async () => {
    fetch.mockImplementation((url) => {
      if (String(url).endsWith('/funcionarios')) {
        return Promise.resolve(
          createApiResponse([
            {
              funcionario_id: 10,
              nome: 'Roberto Alves',
              email: 'roberto@teste.local',
              cargo_id: 2,
              cargo: roles[1],
              status: 'Ativo',
              telefone: '(61) 98888-7777',
            },
          ])
        );
      }
      if (String(url).endsWith('/cargos')) {
        return Promise.resolve(createApiResponse(roles));
      }
      return Promise.resolve(createApiResponse([], false));
    });

    const pageElement = await EquipePage();
    render(pageElement);

    expect(screen.getByText('Roberto Alves')).toBeInTheDocument();
    expect(screen.getByText('roberto@teste.local')).toBeInTheDocument();

    fetch.mockResolvedValueOnce(createApiResponse(null, false));
    expect(await listarFuncionarios()).toEqual([]);

    fetch.mockRejectedValueOnce(new Error('Network error'));
    expect(await listarFuncionarios()).toEqual([]);

    fetch.mockResolvedValueOnce(createApiResponse(null, false));
    expect(await listarCargos()).toEqual([]);

    fetch.mockRejectedValueOnce(new Error('Network error'));
    expect(await listarCargos()).toEqual([]);
  });

  it('valida e fecha EditUserModal (Escape, overlay, cancelar) e exibe erros ao falhar atualização de cargo', async () => {
    const memberByRoleName = createMember({
      funcionario_id: 11,
      nome_func: 'Camila Rocha',
      cargo: 'Advogado',
    });
    const memberWithoutRole = createMember({
      funcionario_id: 12,
      nome_func: 'Lucas Dias',
      cargo: '',
    });

    renderEquipe([memberByRoleName, memberWithoutRole]);

    const editButtons = screen.getAllByTitle('Editar usuário');
    fireEvent.click(editButtons[0]);

    const dialog = screen.getByRole('dialog', { name: 'Editar Usuário' });
    expect(within(dialog).getByLabelText('Nível de Acesso')).toHaveValue('2');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('dialog', { name: 'Editar Usuário' })
    ).not.toBeInTheDocument();

    fireEvent.click(editButtons[1]);
    const dialog2 = screen.getByRole('dialog', { name: 'Editar Usuário' });
    expect(within(dialog2).getByLabelText('Nível de Acesso')).toHaveValue('');

    fireEvent.click(dialog2.parentElement);
    expect(
      screen.queryByRole('dialog', { name: 'Editar Usuário' })
    ).not.toBeInTheDocument();

    fireEvent.click(editButtons[0]);
    const dialog3 = screen.getByRole('dialog', { name: 'Editar Usuário' });
    fireEvent.change(within(dialog3).getByLabelText('Nível de Acesso'), {
      target: { value: '3' },
    });

    fetch.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
    });
    fireEvent.click(within(dialog3).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialog3).findByRole('alert')).toHaveTextContent(
      'Não foi possível alterar o cargo.'
    );

    fireEvent.click(within(dialog3).getByRole('button', { name: 'Cancelar' }));
    expect(
      screen.queryByRole('dialog', { name: 'Editar Usuário' })
    ).not.toBeInTheDocument();
  });

  it('valida NewRoleModal, trata erros na criação/edição de cargos e fecha modais via Escape e overlay', async () => {
    renderEquipe();

    fireEvent.click(screen.getByRole('button', { name: 'Novo Cargo' }));
    const newRoleDialog = screen.getByRole('dialog', {
      name: 'Criar Novo Cargo',
    });

    fireEvent.click(
      within(newRoleDialog).getByRole('button', { name: 'Criar Cargo' })
    );
    expect(within(newRoleDialog).getByRole('alert')).toHaveTextContent(
      'Informe o nome do cargo.'
    );

    fireEvent.change(within(newRoleDialog).getByLabelText('Nome do Cargo'), {
      target: { value: '  advogado  ' },
    });
    fireEvent.click(
      within(newRoleDialog).getByRole('button', { name: 'Criar Cargo' })
    );
    expect(within(newRoleDialog).getByRole('alert')).toHaveTextContent(
      'Já existe um cargo com esse nome.'
    );

    fireEvent.change(within(newRoleDialog).getByLabelText('Nome do Cargo'), {
      target: { value: 'Sócio' },
    });
    fireEvent.change(
      within(newRoleDialog).getByLabelText('Descrição (opcional)'),
      {
        target: { value: 'Gestão societária' },
      }
    );

    fetch.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
    });
    fireEvent.click(
      within(newRoleDialog).getByRole('button', { name: 'Criar Cargo' })
    );

    expect(await within(newRoleDialog).findByRole('alert')).toHaveTextContent(
      'Não foi possível criar o cargo.'
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('dialog', { name: 'Criar Novo Cargo' })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Novo Cargo' }));
    const reopenedNewRole = screen.getByRole('dialog', {
      name: 'Criar Novo Cargo',
    });
    fireEvent.click(reopenedNewRole.parentElement);
    expect(
      screen.queryByRole('dialog', { name: 'Criar Novo Cargo' })
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Editar permissões →' })[0]
    );
    const permDialog = screen.getByRole('dialog');
    fetch.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
    });
    fireEvent.click(within(permDialog).getByRole('button', { name: 'Salvar' }));

    expect(await within(permDialog).findByRole('alert')).toHaveTextContent(
      'Não foi possível atualizar o cargo.'
    );
    await waitFor(() => {
      expect(permDialog).toHaveAttribute('aria-busy', 'false');
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Editar permissões →' })[0]
    );
    const reopenedPermDialog = screen.getByRole('dialog');
    fireEvent.click(reopenedPermDialog.parentElement);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cobre funções utilitárias de funcionario.js, permissões e ramos de erro dos serviços de funcionários e cargos', async () => {
    expect(getInitials('  Ana   Beatriz   Costa ')).toBe('AB');
    expect(getLawyerInitials('')).toBe('');
    expect(getLawyerInitials('Dr.   ')).toBe('');
    expect(getLawyerInitials('Dr. Carlos')).toBe('CA');
    expect(getLawyerInitials('Dra. Fernanda Lima')).toBe('FL');
    expect(getLawyerInitials('Adv. Marcos Vinícius')).toBe('MV');

    expect(formatOab(null)).toBe('');
    expect(formatOab({ uf_oab: 'df', numero_oab: '' })).toBe('');
    expect(formatOab({ ufOab: 'sp', numeroOab: 'OAB/SP 99.888' })).toBe(
      'OAB/SP 99.888'
    );
    expect(formatOab({ uf: 'rj', oab_numero: '12345' })).toBe('OAB/RJ 12.345');
    expect(formatOab({ estado_oab: '', numero: '12345' })).toBe('OAB 12.345');
    expect(formatOab({ oab: '987' })).toBe('OAB 987');
    expect(formatOab('mg', '54321')).toBe('OAB/MG 54.321');
    expect(formatOab('', '')).toBe('');

    expect(
      toTeamMember({
        funcionario_id: 99,
        nome: 'Pedro Costa',
        email: 'pedro@teste.local',
        cargo: { nome: 'Consultor' },
        status: 'Ativo',
      }).cargo
    ).toBe('Consultor');
    expect(
      toTeamMember({
        funcionario_id: 100,
        nome: 'Julia Souza',
        email: 'julia@teste.local',
        status: 'Inativo',
      }).cargo
    ).toBe('Não informado');

    expect(getPermissionLabel('gerenciar_documentos_extras')).toBe(
      'Gerenciar documentos extras'
    );

    fetch.mockResolvedValueOnce(
      createApiResponse({ funcionario_id: 1, exibicaoInstitucional: true })
    );
    expect(await mudarExibicaoInstitucional(1, true)).toEqual({
      funcionario_id: 1,
      exibicaoInstitucional: true,
    });

    fetch.mockResolvedValueOnce(
      createApiResponse(
        {
          detail: [
            { loc: ['body', 'nome'], msg: 'Field required', type: 'missing' },
            { loc: ['body', 'email'], msg: 'inválido', type: 'value_error' },
            { loc: [], msg: '' },
          ],
        },
        false
      )
    );
    await expect(mudarExibicaoInstitucional(1, false)).rejects.toThrow(
      'Nome: campo obrigatório. E-mail: inválido'
    );

    fetch.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error('bad json')),
    });
    await expect(excluirCargo(99)).rejects.toThrow(
      'Não foi possível excluir o cargo.'
    );

    sessionStorage.removeItem('access_token');
    await expect(criarFuncionario({})).rejects.toThrow(
      'Sessão expirada. Faça login novamente.'
    );
    await expect(mudarCargoFuncionario(1, 2)).rejects.toThrow(
      'Sessão expirada. Faça login novamente.'
    );
    fetch.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error('bad json')),
    });
    await expect(excluirFuncionario(1)).rejects.toThrow(
      'Não foi possível excluir o usuário.'
    );
    fetch.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error('bad json')),
    });
    await expect(mudarAcessoFuncionario(1)).rejects.toThrow(
      'Não foi possível atualizar o acesso.'
    );
  });
});
