import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProcessDetailsModal from './ProcessDetailsModal';

const processData = {
  id: '0061234-56.2026.8.26.0100',
  titulo: 'Caso Teste',
  cliente: 'Maria Silva',
  status: 'Ativo',
  tribunal: 'TJDFT',
  area: 'Civil',
  responsavel: 'Ana Paula',
  prazo: '2026-10-05',
};

describe('ProcessDetailsModal', () => {
  it('não renderiza sem processo', () => {
    render(<ProcessDetailsModal process={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mostra o resumo completo e fecha pelo botão', () => {
    const onClose = vi.fn();
    render(<ProcessDetailsModal process={processData} onClose={onClose} />);

    expect(
      screen.getByRole('heading', { name: processData.titulo })
    ).toBeInTheDocument();
    expect(screen.getByText(processData.id)).toBeInTheDocument();
    expect(screen.getByText(processData.cliente)).toBeInTheDocument();
    expect(screen.getByText(processData.tribunal)).toBeInTheDocument();
    expect(screen.getByText(processData.responsavel)).toBeInTheDocument();
    expect(screen.getByText('05/10/2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
