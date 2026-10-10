import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeleteClientModal from './DeleteClientModal';

const mockCliente = {
  cliente_id: 3,
  nome: 'Fernanda Almeida',
};

describe('DeleteClientModal', () => {
  it('não renderiza nada quando cliente é nulo', () => {
    const { container } = render(
      <DeleteClientModal isOpen={true} onClose={vi.fn()} cliente={null} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza o nome do cliente na mensagem de confirmação', () => {
    render(
      <DeleteClientModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        cliente={mockCliente}
      />
    );

    expect(screen.getByText('Excluir cliente')).toBeInTheDocument();
    expect(screen.getByText('Fernanda Almeida')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /excluir/i })
    ).toBeInTheDocument();
  });

  it('aciona onConfirm ao clicar no botão Excluir usando cliente_id ou id', async () => {
    const handleConfirm = vi.fn().mockResolvedValue();
    const { rerender } = render(
      <DeleteClientModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
        cliente={mockCliente}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /excluir/i }));
    expect(handleConfirm).toHaveBeenCalledWith(3);

    // Testar com cliente apenas com .id
    rerender(
      <DeleteClientModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
        cliente={{ id: 99, nome: 'Outro Cliente' }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /excluir/i }));
    expect(handleConfirm).toHaveBeenCalledWith(99);
  });

  it('exibe erro caso a exclusão falhe com mensagem customizada ou padrão', async () => {
    const handleConfirm = vi
      .fn()
      .mockRejectedValue(new Error('Erro no servidor'));
    const { rerender } = render(
      <DeleteClientModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
        cliente={mockCliente}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /excluir/i }));
    expect(await screen.findByText('Erro no servidor')).toBeInTheDocument();

    const handleConfirmSemMsg = vi.fn().mockRejectedValue({});
    rerender(
      <DeleteClientModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={handleConfirmSemMsg}
        cliente={mockCliente}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /excluir/i }));
    expect(
      await screen.findByText('Erro ao excluir cliente.')
    ).toBeInTheDocument();
  });

  it('aciona onClose ao clicar em Cancelar e respeita isDeleting', () => {
    const handleClose = vi.fn();
    const { rerender } = render(
      <DeleteClientModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={vi.fn()}
        cliente={mockCliente}
        isDeleting={false}
      />
    );

    fireEvent.click(screen.getByText('Cancelar'));
    expect(handleClose).toHaveBeenCalledOnce();

    rerender(
      <DeleteClientModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={vi.fn()}
        cliente={mockCliente}
        isDeleting={true}
      />
    );
    fireEvent.click(screen.getByRole('dialog').parentElement);
    expect(handleClose).toHaveBeenCalledOnce();
  });
});
