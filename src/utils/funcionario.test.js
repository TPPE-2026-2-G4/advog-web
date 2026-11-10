import { describe, expect, it } from 'vitest';
import {
  formatOab,
  getInitials,
  getLawyerInitials,
  isAdministratorAccount,
  isAdministratorRole,
  filterNonAdministratorMembers,
  normalizeRoleName,
  toTeamMember,
} from './funcionario';

describe('getInitials', () => {
  it.each([
    ['Maria Silva', 'MS'],
    ['João', 'J'],
    ['  Ana Paula Ribeiro  ', 'AP'],
    ['Maria   Clara', 'MC'],
    ['Ana\tPaula', 'AP'],
    ['José\nCarlos', 'JC'],
    ['Érica de Souza', 'ÉD'],
    ['   ', ''],
    ['', ''],
  ])('retorna as iniciais de %s como %s', (name, expectedInitials) => {
    expect(getInitials(name)).toBe(expectedInitials);
  });
});

describe('toTeamMember', () => {
  it.each(['Ativo', 'Inativo', 'Pendente'])(
    'converte um funcionário com status %s para um membro da equipe',
    (status) => {
      const funcionario = {
        funcionario_id: 8,
        nome: 'Usuário de Demonstração',
        email: 'usuario.demonstracao@teste.local',
        status,
      };

      expect(toTeamMember(funcionario)).toEqual({
        funcionario_id: 8,
        initials: 'UD',
        nome_func: 'Usuário de Demonstração',
        email_func: 'usuario.demonstracao@teste.local',
        foto_perfil_url: null,
        cargo: 'Não informado',
        status,
      });
      expect(funcionario).toEqual({
        funcionario_id: 8,
        nome: 'Usuário de Demonstração',
        email: 'usuario.demonstracao@teste.local',
        status,
      });
    }
  );

  it('mantém o identificador, nome, e-mail e status do funcionário', () => {
    const funcionario = {
      funcionario_id: 42,
      nome: 'Ana Paula Ribeiro',
      email: 'ana.ribeiro@teste.local',
      status: 'Ativo',
    };

    const teamMember = toTeamMember(funcionario);

    expect(teamMember.funcionario_id).toBe(funcionario.funcionario_id);
    expect(teamMember.nome_func).toBe(funcionario.nome);
    expect(teamMember.email_func).toBe(funcionario.email);
    expect(teamMember.status).toBe(funcionario.status);
    expect(teamMember.cargo).toBe('Não informado');
  });

  it('preserva a URL da foto de perfil fornecida pela API', () => {
    const teamMember = toTeamMember({
      funcionario_id: 1,
      nome: 'Maria Silva',
      email: 'maria@teste.local',
      foto_perfil_url: 'https://storage.example.com/maria.png',
      status: 'Ativo',
    });

    expect(teamMember.foto_perfil_url).toBe(
      'https://storage.example.com/maria.png'
    );
  });

  it.each([
    [{ cargo: 'Admin' }, 'Admin'],
    [{ nome_cargo: 'Advogado' }, 'Advogado'],
    [{ cargo: { nome_cargo: 'Estagiário' } }, 'Estagiário'],
    [{ cargo: { nome: 'Paralegal' } }, 'Paralegal'],
  ])('converte diferentes formatos de cargo da API', (cargoData, cargo) => {
    const teamMember = toTeamMember({
      funcionario_id: 1,
      nome: 'Maria Silva',
      email: 'maria@teste.local',
      status: 'Ativo',
      ...cargoData,
    });

    expect(teamMember.cargo).toBe(cargo);
  });

  it('inclui telefone e identificador do cargo quando informados', () => {
    const teamMember = toTeamMember({
      funcionario_id: 1,
      nome: 'Maria Silva',
      email: 'maria@teste.local',
      telefone: '(61) 99999-0000',
      status: 'Ativo',
      cargo: { cargo_id: 'admin', nome_cargo: 'Admin' },
    });

    expect(teamMember).toMatchObject({
      telefone: '(61) 99999-0000',
      cargo_id: 'admin',
      cargo: 'Admin',
    });
  });

  it('mantém os booleanos do cargo aninhado retornado pela API', () => {
    const permissao = {
      visualizar_processos: true,
      criar_processos: true,
      editar_processos: false,
      excluir_processos: false,
      visualizar_financeiro: false,
      gerenciar_financeiro: false,
      visualizar_equipe: true,
      gerenciar_equipe: false,
      configuracoes_sistema: false,
    };
    const teamMember = toTeamMember({
      funcionario_id: 1,
      nome: 'Maria Silva',
      email: 'maria@teste.local',
      status: 'Ativo',
      cargo_id: 2,
      cargo: {
        cargo_id: 2,
        nome_cargo: 'Advogado',
        permissao,
      },
    });

    expect(teamMember.permissao).toEqual(permissao);
    expect(teamMember.permissao).not.toBe(permissao);
  });
});

describe('getLawyerInitials', () => {
  it.each([
    ['Dr. Alexandre Carreiro', 'AC'],
    ['Dra. Ana Paula Ribeiro', 'AP'],
    ['Dr. Pedro Lima', 'PL'],
    ['Dra. Mariana Costa', 'MC'],
    ['Adv. Carlos Eduardo', 'CE'],
    ['João', 'JO'],
    ['  ', ''],
    ['', ''],
    [null, ''],
    [undefined, ''],
  ])('retorna as iniciais corretas para %s como %s', (name, expected) => {
    expect(getLawyerInitials(name)).toBe(expected);
  });
});

describe('formatOab', () => {
  it('retorna string vazia quando o objeto é nulo, indefinido ou vazio', () => {
    expect(formatOab(null)).toBe('');
    expect(formatOab(undefined)).toBe('');
    expect(formatOab({})).toBe('');
    expect(formatOab({ uf_oab: 'DF' })).toBe('');
    expect(formatOab({ uf_oab: null, numero_oab: null })).toBe('');
  });

  it('formata corretamente OAB com uf_oab e numero_oab', () => {
    expect(formatOab({ uf_oab: 'DF', numero_oab: '12345' })).toBe(
      'OAB/DF 12.345'
    );
    expect(formatOab({ uf_oab: 'sp', numero_oab: '123456' })).toBe(
      'OAB/SP 123.456'
    );
    expect(formatOab({ uf_oab: 'DF', numero_oab: '34.567' })).toBe(
      'OAB/DF 34.567'
    );
  });

  it('suporta formatos alternativos de chaves (camelCase)', () => {
    expect(formatOab({ ufOab: 'df', numeroOab: '12345' })).toBe(
      'OAB/DF 12.345'
    );
    expect(formatOab({ uf: 'RJ', numero: '99999' })).toBe('OAB/RJ 99.999');
  });

  it('retorna apenas OAB e número quando não possui UF', () => {
    expect(formatOab({ numero_oab: '12345' })).toBe('OAB 12.345');
  });

  it.each([
    ['chamada com apenas UF como string', 'DF', undefined, ''],
    ['chamada com UF e número vazio', 'DF', '', ''],
    ['chamada com UF e número com prefixo OAB', 'DF', 'OAB 54321', 'OAB 54321'],
    ['chamada com parâmetros separados', 'RJ', '65432', 'OAB/RJ 65.432'],
    ['chamada com uf vazio', '', '12345', ''],
  ])(
    'avalia formatOab com argumentos posicionais: %s',
    (_desc, uf, num, expected) => {
      expect(formatOab(uf, num)).toBe(expected);
    }
  );

  it('preserva strings que já começam com OAB', () => {
    expect(formatOab({ oab: 'OAB/DF 12.345' })).toBe('OAB/DF 12.345');
  });
});

describe('normalizeRoleName', () => {
  it.each([
    ['Administrador', 'administrador'],
    ['  ADMIN  ', 'admin'],
    ['Estagiário', 'estagiario'],
    ['', ''],
    [null, ''],
    [undefined, ''],
  ])('normaliza "%s" para "%s"', (input, expected) => {
    expect(normalizeRoleName(input)).toBe(expected);
  });
});

describe('isAdministratorRole', () => {
  it.each([
    ['Administrador', true],
    ['ADMIN', true],
    ['  administrador  ', true],
    [{ nome_cargo: 'Administrador' }, true],
    [{ cargo: 'Admin' }, true],
    [{ nome: 'Administrador' }, true],
    ['Advogado', false],
    ['Estagiário', false],
    [{ nome_cargo: 'Advogado' }, false],
    [null, false],
    [undefined, false],
    ['', false],
  ])('retorna %s para %j', (input, expected) => {
    expect(isAdministratorRole(input)).toBe(expected);
  });
});

describe('isAdministratorAccount', () => {
  const roles = [
    { cargo_id: 1, nome_cargo: 'Administrador' },
    { cargo_id: 2, nome_cargo: 'Advogado' },
  ];

  it('identifica a conta administradora pelo cargo', () => {
    expect(isAdministratorAccount({ cargo: 'Administrador' })).toBe(true);
    expect(isAdministratorAccount({ cargo: 'Admin' })).toBe(true);
  });

  it('identifica a conta administradora pelo cargo_id', () => {
    expect(isAdministratorAccount({ cargo_id: 1 }, roles)).toBe(true);
    expect(isAdministratorAccount({ cargo_id: 2 }, roles)).toBe(false);
  });

  it('identifica a conta administradora pelo nome', () => {
    expect(isAdministratorAccount({ nome_func: 'Administrador' })).toBe(true);
    expect(isAdministratorAccount({ nome: 'Admin' })).toBe(true);
  });

  it('identifica a conta administradora pelo email', () => {
    expect(isAdministratorAccount({ email_func: 'advog@advog.com' })).toBe(
      true
    );
    expect(isAdministratorAccount({ email: 'admin@carreiro.adv.br' })).toBe(
      true
    );
  });

  it('retorna false para contas normais', () => {
    expect(
      isAdministratorAccount({
        funcionario_id: 2,
        nome_func: 'Maria Silva',
        email_func: 'maria@teste.local',
        cargo: 'Advogado',
        cargo_id: 2,
      })
    ).toBe(false);
  });

  it('retorna false para valores nulos ou vazios', () => {
    expect(isAdministratorAccount(null)).toBe(false);
    expect(isAdministratorAccount(undefined)).toBe(false);
  });
});

describe('filterNonAdministratorMembers', () => {
  it('filtra contas administradoras e mantém membros normais', () => {
    const members = [
      { funcionario_id: 1, nome: 'Administrador', cargo: 'Administrador' },
      { funcionario_id: 2, nome: 'Ana Paula', cargo: 'Advogada' },
      { funcionario_id: 3, nome: 'Admin', email: 'admin@advog.com' },
      { funcionario_id: 4, nome: 'Carlos Silva', cargo: 'Estagiário' },
    ];
    const filtered = filterNonAdministratorMembers(members);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((m) => m.nome)).toEqual(['Ana Paula', 'Carlos Silva']);
  });

  it('retorna array vazio quando entrada é nula ou vazia', () => {
    expect(filterNonAdministratorMembers(null)).toEqual([]);
    expect(filterNonAdministratorMembers(undefined)).toEqual([]);
    expect(filterNonAdministratorMembers([])).toEqual([]);
  });
});
