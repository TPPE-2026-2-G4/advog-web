import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeleteLancamentoModal from './DeleteLancamentoModal';

const lancamentoMock = {
  id: 1,
  titulo: 'Honorários Consultoria',
};

const renderModal = (overrides = {}) => {
  const props = {
    lancamento: lancamentoMock,
    isOpen: true,
    isDeleting: false,
    error: '',
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  };

  render(<DeleteLancamentoModal {...props} />);
  return props;
};

describe('DeleteLancamentoModal', () => {
  it.each([
    {
      description: 'isOpen é falso',
      isOpen: false,
      lancamento: lancamentoMock,
    },
    { description: 'lancamento é nulo', isOpen: true, lancamento: null },
    {
      description: 'ambos são falsos/nulos',
      isOpen: false,
      lancamento: null,
    },
  ])('não renderiza quando $description', ({ isOpen, lancamento }) => {
    renderModal({ isOpen, lancamento });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza informações do lançamento e mensagem de erro quando presente', () => {
    renderModal({ error: 'Falha ao excluir lançamento' });

    expect(
      screen.getByRole('heading', { name: 'Excluir lançamento?' })
    ).toBeInTheDocument();
    expect(screen.getByText(lancamentoMock.titulo)).toBeInTheDocument();
    expect(screen.getByText('Falha ao excluir lançamento')).toBeInTheDocument();
  });

  it.each([
    { buttonName: 'Fechar', callbackKey: 'onClose' },
    { buttonName: 'Cancelar', callbackKey: 'onClose' },
    { buttonName: 'Excluir lançamento', callbackKey: 'onConfirm' },
  ])(
    'aciona $callbackKey ao clicar no botão "$buttonName"',
    ({ buttonName, callbackKey }) => {
      const props = renderModal();

      fireEvent.click(screen.getByRole('button', { name: buttonName }));
      expect(props[callbackKey]).toHaveBeenCalledOnce();
    }
  );

  it('desabilita ações e exibe indicador de carregamento durante a exclusão', () => {
    renderModal({ isDeleting: true });

    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(
      screen.getByRole('status', { name: 'Carregando' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button').at(-1)).toBeDisabled();
  });
});
