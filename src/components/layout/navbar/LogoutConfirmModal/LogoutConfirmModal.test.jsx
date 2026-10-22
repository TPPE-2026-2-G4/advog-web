import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LogoutConfirmModal from './LogoutConfirmModal';

describe('LogoutConfirmModal', () => {
  it('não renderiza o modal quando isOpen é false', () => {
    render(
      <LogoutConfirmModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(
      screen.queryByText('Deseja sair da sua conta?')
    ).not.toBeInTheDocument();
  });

  it('renderiza os textos e botões de confirmação quando isOpen é true', () => {
    render(
      <LogoutConfirmModal isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} />
    );

    expect(screen.getByText('Deseja sair da sua conta?')).toBeInTheDocument();
    expect(
      screen.getByText(/Tem certeza que deseja encerrar sua sessão\?/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cancelar' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Confirmar e sair' })
    ).toBeInTheDocument();
  });

  it.each([
    ['botão Cancelar', 'Cancelar'],
    ['botão Fechar', 'Fechar'],
  ])('chama onClose ao clicar em %s', (_desc, buttonName) => {
    const handleClose = vi.fn();
    render(
      <LogoutConfirmModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: buttonName }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('chama onConfirm ao clicar em Confirmar e sair', () => {
    const handleConfirm = vi.fn();
    render(
      <LogoutConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e sair' }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['Cancelar', 'Cancelar'],
    ['Fechar', 'Fechar'],
  ])(
    'desabilita o botão %s quando isLoggingOut é true',
    (_desc, buttonName) => {
      render(
        <LogoutConfirmModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          isLoggingOut={true}
        />
      );

      expect(screen.getByRole('button', { name: buttonName })).toBeDisabled();
    }
  );
});
