import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeleteProcessModal from './DeleteProcessModal';

const processData = {
  processo_id: 1,
  cnj: '0061234-56.2026.8.26.0100',
  titulo: 'Caso Teste',
};

describe('DeleteProcessModal', () => {
  it('não renderiza sem processo', () => {
    render(
      <DeleteProcessModal
        process={null}
        isDeleting={false}
        error=""
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('confirma, cancela e apresenta erros', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <DeleteProcessModal
        process={processData}
        isDeleting={false}
        error="Processo não encontrado"
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText(processData.titulo)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Processo não encontrado'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir processo' }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('bloqueia fechamento e confirmação durante a exclusão', () => {
    render(
      <DeleteProcessModal
        process={processData}
        isDeleting
        error=""
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getAllByRole('button').at(-1)).toBeDisabled();
  });
});
