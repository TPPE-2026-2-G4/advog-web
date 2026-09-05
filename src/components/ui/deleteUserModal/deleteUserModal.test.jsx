import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DeleteUserModal from './deleteUserModal';

const member = {
  funcionario_id: 8,
  nome_func: 'Maria Silva',
};

const renderModal = (props = {}) =>
  render(
    <DeleteUserModal
      member={member}
      isOpen
      isDeleting={false}
      error=""
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      {...props}
    />
  );

describe('DeleteUserModal', () => {
  it.each([
    [false, member],
    [true, null],
  ])(
    'não renderiza quando isOpen é %s ou não há membro',
    (isOpen, selectedMember) => {
      renderModal({ isOpen, member: selectedMember });

      expect(
        screen.queryByRole('heading', { name: 'Excluir funcionário?' })
      ).not.toBeInTheDocument();
    }
  );

  it('renderiza o funcionário e as ações de confirmação', () => {
    renderModal();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Excluir funcionário?' })
    ).toBeInTheDocument();
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cancelar' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Excluir funcionário' })
    ).toBeInTheDocument();
  });

  it('chama onConfirm ao confirmar a exclusão', () => {
    const onConfirm = vi.fn();
    renderModal({ onConfirm });

    fireEvent.click(
      screen.getByRole('button', { name: 'Excluir funcionário' })
    );

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('chama onClose ao cancelar, fechar, clicar fora ou pressionar Escape', () => {
    const onClose = vi.fn();
    const { container } = renderModal({ onClose });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    fireEvent.click(container.firstChild);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(4);
  });

  it('exibe o erro retornado pela operação', () => {
    renderModal({ error: 'Funcionário não encontrado' });

    expect(screen.getByText('Funcionário não encontrado')).toBeInTheDocument();
  });

  it('mostra estado de carregamento e desabilita as ações durante a exclusão', () => {
    renderModal({ isDeleting: true });

    expect(screen.getByRole('button', { name: 'Excluindo...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled();
  });

  it('não fecha ao clicar fora ou pressionar Escape durante a exclusão', () => {
    const onClose = vi.fn();
    const { container } = renderModal({ isDeleting: true, onClose });

    fireEvent.click(container.firstChild);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });
});
