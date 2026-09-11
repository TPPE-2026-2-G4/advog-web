import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  createEmptyPermission,
  PERMISSION_LABELS,
} from '@/constants/permissions';
import RolePermissionsModal from './rolePermissionsModal';

const permissionEntries = Object.entries(PERMISSION_LABELS);
const initialPermission = createEmptyPermission();
initialPermission[permissionEntries[0][0]] = true;
initialPermission[permissionEntries[1][0]] = true;

const role = {
  cargo_id: 2,
  nome_cargo: 'Advogado',
  permissao: initialPermission,
};

const renderModal = (props = {}) =>
  render(
    <RolePermissionsModal
      role={role}
      isOpen
      onClose={vi.fn()}
      onSave={vi.fn().mockResolvedValue(undefined)}
      {...props}
    />
  );

describe('RolePermissionsModal', () => {
  it.each([
    [false, role],
    [true, null],
  ])(
    'não renderiza quando isOpen é %s ou não há cargo',
    (isOpen, selectedRole) => {
      renderModal({ isOpen, role: selectedRole });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }
  );

  it('renderiza o cargo, o objeto recebido e o contador', () => {
    renderModal();

    expect(
      screen.getByRole('dialog', {
        name: 'Permissões — Perfil "Advogado"',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Alterações se aplicam a todos os usuários com este cargo.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: permissionEntries[0][1] })
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: permissionEntries[2][1] })
    ).not.toBeChecked();
    expect(
      screen.getByText(
        `2 de ${permissionEntries.length} permissões selecionadas`
      )
    ).toBeInTheDocument();
  });

  it('alterna uma cópia do objeto e o envia sem converter', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderModal({ onSave, onClose });

    fireEvent.click(
      screen.getByRole('checkbox', { name: permissionEntries[0][1] })
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: permissionEntries[2][1] })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    const expectedPermission = {
      ...initialPermission,
      [permissionEntries[0][0]]: false,
      [permissionEntries[2][0]]: true,
    };
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        cargo_id: role.cargo_id,
        permissao: expectedPermission,
      })
    );
    expect(role.permissao).toEqual(initialPermission);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('atualiza o preenchimento quando o cargo aberto muda', () => {
    const { rerender } = renderModal();
    const adminRole = {
      cargo_id: 1,
      nome_cargo: 'Administrador',
      permissao: Object.fromEntries(
        permissionEntries.map(([permissionName]) => [permissionName, true])
      ),
    };

    fireEvent.click(
      screen.getByRole('checkbox', { name: permissionEntries[0][1] })
    );
    rerender(
      <RolePermissionsModal
        role={adminRole}
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getAllByRole('checkbox')).toHaveLength(
      permissionEntries.length
    );
    screen
      .getAllByRole('checkbox')
      .forEach((checkbox) => expect(checkbox).toBeChecked());
  });

  it('aceita um cargo sem permissões', () => {
    renderModal({ role: { cargo_id: 4, nome_cargo: 'Personalizado' } });

    screen
      .getAllByRole('checkbox')
      .forEach((checkbox) => expect(checkbox).not.toBeChecked());
  });

  it('fecha ao cancelar, clicar no X, clicar fora ou pressionar Escape', () => {
    const onClose = vi.fn();
    const { container } = renderModal({ onClose });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    fireEvent.click(container.firstChild);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(4);
  });

  it('mostra carregamento e impede o fechamento durante o salvamento', async () => {
    let resolveSave;
    const onSave = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );
    const onClose = vi.fn();
    const { container } = renderModal({ onSave, onClose });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    const loadingIndicator = await screen.findByRole('status', {
      name: 'Carregando',
    });
    expect(loadingIndicator.closest('button')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled();
    screen
      .getAllByRole('checkbox')
      .forEach((checkbox) => expect(checkbox).toBeDisabled());

    fireEvent.click(container.firstChild);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    resolveSave();
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('exibe o erro e mantém a seleção quando não consegue salvar', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockRejectedValue(new Error('Falha ao atualizar'));
    renderModal({ onClose, onSave });

    fireEvent.click(
      screen.getByRole('checkbox', { name: permissionEntries[2][1] })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falha ao atualizar'
    );
    expect(
      screen.getByRole('checkbox', { name: permissionEntries[2][1] })
    ).toBeChecked();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('exibe uma mensagem padrão para falhas sem Error', async () => {
    renderModal({ onSave: vi.fn().mockRejectedValue('falha') });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível salvar as permissões.'
    );
  });
});
