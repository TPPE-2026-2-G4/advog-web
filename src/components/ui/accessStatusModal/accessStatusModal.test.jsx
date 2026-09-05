import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AccessStatusModal from './accessStatusModal';

const createMember = (status) => ({
  funcionario_id: 8,
  nome_func: 'Maria Silva',
  status,
});

const renderModal = (status, props = {}) =>
  render(
    <AccessStatusModal
      member={createMember(status)}
      isOpen
      isUpdating={false}
      error=""
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      {...props}
    />
  );

describe('AccessStatusModal', () => {
  it.each([
    ['Ativo', 'Revogar acesso', 'revogar'],
    ['Inativo', 'Permitir acesso', 'permitir'],
  ])(
    'renderiza a confirmação correta para o status %s',
    (status, actionLabel, actionText) => {
      renderModal(status);

      expect(
        screen.getByRole('heading', { name: `${actionLabel}?` })
      ).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(`deseja ${actionText}`))
      ).toBeInTheDocument();
      expect(screen.getByText('Maria Silva')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: actionLabel })
      ).toBeInTheDocument();
    }
  );

  it.each([
    [false, 'Ativo'],
    [true, null],
  ])(
    'não renderiza quando isOpen é %s ou não há membro',
    (isOpen, memberStatus) => {
      renderModal(memberStatus || 'Ativo', {
        isOpen,
        member: memberStatus ? createMember(memberStatus) : null,
      });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }
  );

  it.each(['Ativo', 'Inativo'])(
    'chama onConfirm para o status %s',
    (status) => {
      const onConfirm = vi.fn();
      renderModal(status, { onConfirm });

      const actionLabel =
        status === 'Ativo' ? 'Revogar acesso' : 'Permitir acesso';
      fireEvent.click(screen.getByRole('button', { name: actionLabel }));

      expect(onConfirm).toHaveBeenCalledOnce();
    }
  );

  it('chama onClose ao cancelar, fechar, clicar fora ou pressionar Escape', () => {
    const onClose = vi.fn();
    const { container } = renderModal('Ativo', { onClose });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    fireEvent.click(container.firstChild);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(4);
  });

  it('exibe o erro retornado pela alteração de acesso', () => {
    renderModal('Ativo', { error: 'Funcionário ainda está pendente' });

    expect(
      screen.getByText('Funcionário ainda está pendente')
    ).toBeInTheDocument();
  });

  it('mostra estado de carregamento e desabilita as ações', () => {
    renderModal('Ativo', { isUpdating: true });

    const loadingIndicator = screen.getByRole('status', {
      name: 'Carregando',
    });
    expect(loadingIndicator.closest('button')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled();
  });

  it('não fecha ao clicar fora ou pressionar Escape durante a atualização', () => {
    const onClose = vi.fn();
    const { container } = renderModal('Ativo', { isUpdating: true, onClose });

    fireEvent.click(container.firstChild);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });
});
