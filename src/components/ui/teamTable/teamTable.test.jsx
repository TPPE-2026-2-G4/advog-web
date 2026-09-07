import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import TeamTable from './teamTable';

const createMember = (overrides = {}) => ({
  funcionario_id: 1,
  initials: 'MS',
  nome_func: 'Maria Silva',
  email_func: 'maria@teste.local',
  cargo: 'Analista',
  status: 'Ativo',
  ...overrides,
});

describe('TeamTable', () => {
  it('renderiza uma tabela vazia quando não há membros', () => {
    render(<TeamTable />);

    expect(
      screen.getByRole('heading', { name: 'Membros da Equipe' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Excluir usuário')).not.toBeInTheDocument();
  });

  it('renderiza os dados do membro e os cabeçalhos da tabela', () => {
    render(<TeamTable members={[createMember()]} />);

    expect(
      screen.getByRole('heading', { name: 'Membros da Equipe' })
    ).toBeInTheDocument();
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('maria@teste.local')).toBeInTheDocument();
    expect(screen.getByText('Analista')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('renderiza cada membro fornecido em uma linha separada', () => {
    render(
      <TeamTable
        members={[
          createMember(),
          createMember({
            funcionario_id: 2,
            nome_func: 'João Santos',
            email_func: 'joao@teste.local',
            status: 'Inativo',
          }),
        ]}
      />
    );

    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('João Santos')).toBeInTheDocument();
    expect(screen.getAllByTitle('Excluir usuário')).toHaveLength(2);
  });

  it.each([
    ['Ativo', 'Revogar acesso', 'badgeGreen'],
    ['Inativo', 'Permitir acesso', 'badgeRed'],
  ])(
    'renderiza a ação e o badge corretos para membros %s',
    (status, expectedActionTitle, expectedBadgeClass) => {
      render(<TeamTable members={[createMember({ status })]} />);

      expect(screen.getByTitle(expectedActionTitle)).toBeInTheDocument();
      expect(screen.getByText(status).className).toContain(expectedBadgeClass);
    }
  );

  it('não renderiza ação de acesso para membros pendentes', () => {
    render(<TeamTable members={[createMember({ status: 'Pendente' })]} />);

    expect(screen.queryByTitle('Revogar acesso')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Permitir acesso')).not.toBeInTheDocument();
    expect(screen.getByText('Pendente').className).toContain('badgeYellow');
  });

  it('sempre renderiza as ações de editar e excluir', () => {
    render(<TeamTable members={[createMember({ status: 'Pendente' })]} />);

    expect(screen.getByTitle('Editar usuário')).toBeInTheDocument();
    expect(screen.getByTitle('Excluir usuário')).toBeInTheDocument();
  });

  it('chama onDelete com o membro selecionado', () => {
    const onDelete = vi.fn();
    const member = createMember();

    render(<TeamTable members={[member]} onDelete={onDelete} />);
    fireEvent.click(screen.getByTitle('Excluir usuário'));

    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith(member);
  });

  it('chama onDelete somente com o membro correspondente ao botão clicado', () => {
    const onDelete = vi.fn();
    const firstMember = createMember();
    const secondMember = createMember({
      funcionario_id: 2,
      nome_func: 'João Santos',
    });

    render(
      <TeamTable members={[firstMember, secondMember]} onDelete={onDelete} />
    );
    const deleteButtons = screen.getAllByTitle('Excluir usuário');
    fireEvent.click(deleteButtons[1]);

    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith(secondMember);
  });

  it.each([
    ['Ativo', 'Revogar acesso'],
    ['Inativo', 'Permitir acesso'],
  ])('chama onChangeAccess para membros %s', (status, actionTitle) => {
    const onChangeAccess = vi.fn();
    const member = createMember({ status });

    render(<TeamTable members={[member]} onChangeAccess={onChangeAccess} />);
    fireEvent.click(screen.getByTitle(actionTitle));

    expect(onChangeAccess).toHaveBeenCalledOnce();
    expect(onChangeAccess).toHaveBeenCalledWith(member);
  });

  it('chama onChangeAccess somente com o membro correspondente ao botão clicado', () => {
    const onChangeAccess = vi.fn();
    const firstMember = createMember();
    const secondMember = createMember({
      funcionario_id: 2,
      nome_func: 'João Santos',
      status: 'Inativo',
    });

    render(
      <TeamTable
        members={[firstMember, secondMember]}
        onChangeAccess={onChangeAccess}
      />
    );
    fireEvent.click(screen.getByTitle('Permitir acesso'));

    expect(onChangeAccess).toHaveBeenCalledOnce();
    expect(onChangeAccess).toHaveBeenCalledWith(secondMember);
  });

  it('usa uma classe de badge para um cargo desconhecido', () => {
    render(<TeamTable members={[createMember({ cargo: 'Consultor' })]} />);

    const roleBadge = screen.getByText('Consultor');
    expect(roleBadge.className).toMatch(/badge/);
  });

  it.each(['Admin', 'Advogado', 'Estagiário', 'Consultor', 'Não informado'])(
    'atribui uma classe de badge ao cargo %s',
    (cargo) => {
      render(<TeamTable members={[createMember({ cargo })]} />);

      expect(screen.getByText(cargo).className).toMatch(/badge/);
    }
  );

  it('usa a cor padrão para um cargo ausente', () => {
    const { container } = render(
      <TeamTable members={[createMember({ cargo: undefined })]} />
    );

    const badges = container.querySelectorAll('[class*="badge"]');
    expect(badges[0].className).toMatch(/badge/);
  });

  it('usa uma classe de badge estável para o mesmo cargo', () => {
    render(
      <TeamTable
        members={[
          createMember(),
          createMember({ funcionario_id: 2, nome_func: 'João Santos' }),
        ]}
      />
    );

    const roleBadges = screen.getAllByText('Analista');
    expect(roleBadges[0].className).toBe(roleBadges[1].className);
  });
});
