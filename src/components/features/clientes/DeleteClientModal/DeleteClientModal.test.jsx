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

  it.each([
    {
      cenario: 'propriedade cliente_id',
      cliente: mockCliente,
      idEsperado: 3,
    },
    {
      cenario: 'propriedade id alternativa',
      cliente: { id: 99, nome: 'Outro Cliente' },
      idEsperado: 99,
    },
  ])(
    'aciona onConfirm ao clicar em Excluir usando $cenario',
    async ({ cliente, idEsperado }) => {
      const handleConfirm = vi.fn().mockResolvedValue();
      render(
        <DeleteClientModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={handleConfirm}
          cliente={cliente}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /excluir/i }));
      expect(handleConfirm).toHaveBeenCalledWith(idEsperado);
    }
  );

  it.each([
    {
      cenario: 'erro com mensagem customizada',
      erroRejeitado: new Error('Erro no servidor'),
      mensagemEsperada: 'Erro no servidor',
    },
    {
      cenario: 'erro sem mensagem usando texto padrão',
      erroRejeitado: {},
      mensagemEsperada: 'Erro ao excluir cliente.',
    },
  ])(
    'exibe alerta quando a exclusão falha por $cenario',
    async ({ erroRejeitado, mensagemEsperada }) => {
      const handleConfirm = vi.fn().mockRejectedValue(erroRejeitado);
      render(
        <DeleteClientModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={handleConfirm}
          cliente={mockCliente}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /excluir/i }));
      expect(await screen.findByText(mensagemEsperada)).toBeInTheDocument();
    }
  );

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
