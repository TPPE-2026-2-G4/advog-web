import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DeleteRoleModal from './deleteRoleModal';

const role = {
  cargo_id: 4,
  nome_cargo: 'Paralegal',
};

const renderModal = (props = {}) =>
  render(
    <DeleteRoleModal
      role={role}
      isOpen
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      {...props}
    />
  );

describe('DeleteRoleModal', () => {
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

  it('identifica o cargo e explica a proteção de vínculo', () => {
    renderModal();

    expect(
      screen.getByRole('dialog', { name: 'Excluir cargo?' })
    ).toBeInTheDocument();
    expect(screen.getByText('Paralegal')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Cargos associados a funcionários não podem ser excluídos.'
      )
    ).toBeInTheDocument();
  });

  it('confirma a exclusão', () => {
    const onConfirm = vi.fn();
    renderModal({ onConfirm });

    fireEvent.click(screen.getByRole('button', { name: 'Excluir cargo' }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('fecha ao cancelar, clicar no X, no overlay ou pressionar Escape', () => {
    const onClose = vi.fn();
    const { container } = renderModal({ onClose });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    fireEvent.click(container.firstChild);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(4);
  });

  it('mostra o erro retornado pelo backend', () => {
    renderModal({
      error: 'Não é possível excluir um cargo associado a funcionários',
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não é possível excluir um cargo associado a funcionários'
    );
  });

  it('bloqueia as ações e o fechamento durante a exclusão', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const { container } = renderModal({
      isDeleting: true,
      onClose,
      onConfirm,
    });

    expect(screen.getByRole('status', { name: 'Carregando' })).toBeVisible();
    screen
      .getAllByRole('button')
      .forEach((button) => expect(button).toBeDisabled());

    fireEvent.click(container.firstChild);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
