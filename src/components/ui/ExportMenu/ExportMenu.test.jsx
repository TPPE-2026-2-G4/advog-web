import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ExportMenu from './ExportMenu';

describe('ExportMenu', () => {
  it('renderiza o botão fechado com o rótulo informado', () => {
    render(<ExportMenu label="Relatório" />);

    const trigger = screen.getByRole('button', { name: /Relatório/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('usa o rótulo padrão "Exportar"', () => {
    render(<ExportMenu />);

    expect(
      screen.getByRole('button', { name: /Exportar/ })
    ).toBeInTheDocument();
  });

  it('abre o menu com os formatos PDF, Excel e CSV', () => {
    render(<ExportMenu />);

    fireEvent.click(screen.getByRole('button', { name: /Exportar/ }));

    expect(screen.getByRole('button', { name: /Exportar/ })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(
      screen.getAllByRole('menuitem').map((item) => item.textContent)
    ).toEqual(['PDF', 'Excel (.xlsx)', 'CSV']);
  });

  it('dispara onExport com o formato escolhido e fecha o menu', () => {
    const onExport = vi.fn();
    render(<ExportMenu onExport={onExport} />);

    fireEvent.click(screen.getByRole('button', { name: /Exportar/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Excel (.xlsx)' }));

    expect(onExport).toHaveBeenCalledWith('xlsx');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('não falha ao escolher um formato sem onExport', () => {
    render(<ExportMenu />);

    fireEvent.click(screen.getByRole('button', { name: /Exportar/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'CSV' }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('fecha o menu ao clicar no botão novamente, fora dele ou com Escape', () => {
    render(
      <>
        <ExportMenu />
        <p>Fora</p>
      </>
    );
    const trigger = screen.getByRole('button', { name: /Exportar/ });

    fireEvent.click(trigger);
    fireEvent.click(trigger);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.mouseDown(screen.getByText('Fora'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('mantém o menu aberto ao clicar dentro dele ou pressionar outras teclas', () => {
    render(<ExportMenu />);

    fireEvent.click(screen.getByRole('button', { name: /Exportar/ }));
    fireEvent.mouseDown(screen.getByRole('menu'));
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('desabilita o botão e informa o andamento durante a exportação', () => {
    render(<ExportMenu isExporting />);

    const trigger = screen.getByRole('button', { name: /Exportando…/ });
    expect(trigger).toBeDisabled();
  });

  it('desabilita o botão quando indicado', () => {
    render(<ExportMenu disabled />);

    expect(screen.getByRole('button', { name: /Exportar/ })).toBeDisabled();
  });
});
