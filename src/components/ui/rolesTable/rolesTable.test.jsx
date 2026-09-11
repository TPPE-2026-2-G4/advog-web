import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createEmptyPermission } from '@/constants/permissions';
import RolesTable from './rolesTable';
import styles from './rolesTable.module.css';

const withAllowedPermissions = (...permissionNames) => ({
  ...createEmptyPermission(),
  ...Object.fromEntries(permissionNames.map((name) => [name, true])),
});

const roles = [
  {
    cargo_id: 1,
    nome_cargo: 'Administrador',
    permissao: Object.fromEntries(
      Object.keys(createEmptyPermission()).map((name) => [name, true])
    ),
    descricao: 'Acesso irrestrito ao sistema.',
  },
  {
    cargo_id: 2,
    nome_cargo: 'Advogado',
    permissao: withAllowedPermissions(
      'visualizar_processos',
      'criar_processos',
      'editar_processos',
      'visualizar_financeiro',
      'visualizar_equipe',
      'gerenciar_equipe'
    ),
    descricao: 'Pode criar e editar processos.',
  },
  {
    cargo_id: 3,
    nome_cargo: 'Estagiário',
    permissao: withAllowedPermissions(
      'visualizar_processos',
      'visualizar_financeiro',
      'visualizar_equipe'
    ),
    descricao: 'Apenas visualização.',
  },
];

describe('RolesTable', () => {
  it('renderiza o título e aceita uma lista vazia da API', () => {
    const { container } = render(<RolesTable />);

    expect(
      screen.getByRole('heading', {
        name: 'Referência de Cargos de Acesso (RBAC)',
      })
    ).toBeInTheDocument();
    expect(container.querySelectorAll(`.${styles.card}`)).toHaveLength(0);
  });

  it.each([
    ['Administrador', '9 permissões', 'cardAdmin', 'badgeBlue'],
    ['Advogado', '6 permissões', 'cardAdvogado', 'badgeGreen'],
    ['Estagiário', '3 permissões', 'cardEstagiario', 'badgeYellow'],
  ])(
    'renderiza os dados e estilos de %s usando o nome do backend',
    (nome, permissionCount, cardClass, badgeClass) => {
      const { container } = render(<RolesTable roles={roles} />);
      const badge = screen.getByText(nome);

      expect(badge).toHaveClass(styles[badgeClass]);
      expect(screen.getByText(permissionCount)).toBeInTheDocument();
      expect(container.querySelector(`.${styles[cardClass]}`)).not.toBeNull();
    }
  );

  it('renderiza um botão para criar um novo cargo', () => {
    render(<RolesTable roles={roles} />);

    expect(
      screen.getByRole('button', { name: /Novo Cargo/i })
    ).toBeInTheDocument();
  });

  it('abre a criação de cargo ao clicar em Novo Cargo', () => {
    const onCreateRole = vi.fn();
    render(<RolesTable roles={roles} onCreateRole={onCreateRole} />);

    fireEvent.click(screen.getByRole('button', { name: /Novo Cargo/i }));

    expect(onCreateRole).toHaveBeenCalledOnce();
  });

  it('informa o objeto completo do cargo ao editar permissões', () => {
    const onEditPermissions = vi.fn();
    render(<RolesTable roles={roles} onEditPermissions={onEditPermissions} />);

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Editar permissões →' })[1]
    );

    expect(onEditPermissions).toHaveBeenCalledWith(roles[1]);
  });

  it('informa o objeto completo do cargo ao solicitar exclusão', () => {
    const onDeleteRole = vi.fn();
    render(<RolesTable roles={roles} onDeleteRole={onDeleteRole} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Excluir cargo Advogado' })
    );

    expect(onDeleteRole).toHaveBeenCalledOnce();
    expect(onDeleteRole).toHaveBeenCalledWith(roles[1]);
  });

  it('usa estilo neutro para um cargo personalizado', () => {
    const customRole = {
      cargo_id: 4,
      nome_cargo: 'Paralegal',
      descricao: 'Cargo personalizado.',
      permissao: withAllowedPermissions('visualizar_processos'),
    };
    const { container } = render(<RolesTable roles={[customRole]} />);

    expect(screen.getByText('Paralegal')).toHaveClass(styles.badgeDefault);
    expect(screen.getByText('1 permissões')).toBeInTheDocument();
    expect(container.querySelector(`.${styles.cardDefault}`)).not.toBeNull();
  });
});
