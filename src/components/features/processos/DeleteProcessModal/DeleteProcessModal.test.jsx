import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeleteProcessModal from './DeleteProcessModal';

const processData = {
  processo_id: 1,
  cnj: '0061234-56.2026.8.26.0100',
  titulo: 'Caso Teste',
};

const renderModal = (overrides = {}) => {
  const props = {
    process: processData,
    isDeleting: false,
    error: '',
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  };

  render(<DeleteProcessModal {...props} />);
  return props;
};

describe('DeleteProcessModal', () => {
  it('não renderiza sem processo', () => {
    renderModal({ process: null });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exibe dados do processo e mensagem de erro quando informada', () => {
    renderModal({ error: 'Processo não encontrado' });

    expect(screen.getByText(processData.titulo)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(processData.cnj))).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Processo não encontrado'
    );
  });

  it.each([
    { buttonName: 'Fechar', callbackKey: 'onClose' },
    { buttonName: 'Cancelar', callbackKey: 'onClose' },
    { buttonName: 'Excluir processo', callbackKey: 'onConfirm' },
  ])(
    'aciona $callbackKey ao clicar no botão "$buttonName"',
    ({ buttonName, callbackKey }) => {
      const props = renderModal();

      fireEvent.click(screen.getByRole('button', { name: buttonName }));
      expect(props[callbackKey]).toHaveBeenCalledOnce();
    }
  );

  it('bloqueia fechamento e confirmação durante a exclusão', () => {
    renderModal({ isDeleting: true });

    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(
      screen.getByRole('status', { name: 'Carregando' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button').at(-1)).toBeDisabled();
  });
});
