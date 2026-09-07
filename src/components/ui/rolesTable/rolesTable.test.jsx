import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RolesTable from './rolesTable';
import styles from './rolesTable.module.css';

const roles = [
  {
    nome: 'Admin',
    permissoes: '9 permissões',
    descricao:
      'Acesso irrestrito a todas as funcionalidades e configurações do sistema.',
    classeCard: 'cardAdmin',
    classeBadge: 'badgeBlue',
  },
  {
    nome: 'Advogado',
    permissoes: '6 permissões',
    descricao:
      'Pode criar e editar processos. Sem acesso a exclusão ou painel admin.',
    classeCard: 'cardAdvogado',
    classeBadge: 'badgeGreen',
  },
  {
    nome: 'Estagiário',
    permissoes: '3 permissões',
    descricao: 'Apenas visualização. Não pode criar, editar nem excluir dados.',
    classeCard: 'cardEstagiario',
    classeBadge: 'badgeYellow',
  },
];

describe('RolesTable', () => {
  it('renderiza o título da seção e a referência RBAC', () => {
    render(<RolesTable />);

    expect(
      screen.getByRole('heading', {
        name: 'Referência de Cargos de Acesso (RBAC)',
      })
    ).toBeInTheDocument();
  });

  it.each(roles)(
    'renderiza os dados e estilos do cargo $nome',
    ({ nome, permissoes, descricao, classeCard, classeBadge }) => {
      const { container } = render(<RolesTable />);
      const badge = screen.getByText(nome);
      const card = container.querySelector(`.${styles[classeCard]}`);

      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain(styles[classeBadge]);
      expect(screen.getByText(permissoes)).toBeInTheDocument();
      expect(screen.getByText(descricao)).toBeInTheDocument();
      expect(card).not.toBeNull();
      expect(card.className).toContain(styles[classeCard]);
      expect(container.querySelectorAll(`.${styles.card}`)).toHaveLength(3);
    }
  );

  it('renderiza exatamente três cards de cargos', () => {
    const { container } = render(<RolesTable />);

    expect(container.querySelectorAll(`.${styles.card}`)).toHaveLength(3);
  });

  it('renderiza um botão para criar um novo cargo', () => {
    render(<RolesTable />);

    expect(
      screen.getByRole('button', { name: /Novo Cargo/i })
    ).toBeInTheDocument();
  });

  it('renderiza uma ação de edição para cada cargo', () => {
    render(<RolesTable />);

    expect(
      screen.getAllByRole('button', { name: 'Editar permissões →' })
    ).toHaveLength(3);
  });

  it('mantém a ordem de cargos definida pela referência RBAC', () => {
    render(<RolesTable />);

    const badges = screen.getAllByText(/^(Admin|Advogado|Estagiário)$/);
    expect(badges.map((badge) => badge.textContent)).toEqual([
      'Admin',
      'Advogado',
      'Estagiário',
    ]);
  });
});
