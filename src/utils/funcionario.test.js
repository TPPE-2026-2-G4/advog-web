import { describe, expect, it } from 'vitest';
import { getInitials, toTeamMember } from './funcionario';

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
});
