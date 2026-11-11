import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Toast from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('não renderiza nada sem mensagem', () => {
    render(<Toast message="" />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('exibe a mensagem como alerta, fora do fluxo da página', () => {
    const { container } = render(<Toast message="Processo já cadastrado" />);

    const alerta = screen.getByRole('alert');
    expect(alerta).toHaveTextContent('Processo já cadastrado');
    expect(container).not.toContainElement(alerta);
    expect(document.body).toContainElement(alerta);
  });

  it('traduz erros técnicos para uma mensagem amigável', () => {
    render(<Toast message="Failed to fetch" />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível conectar ao servidor'
    );
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
  });

  it('usa a mensagem de fallback quando o erro é técnico demais', () => {
    render(
      <Toast
        message="TypeError: x is undefined"
        fallback="Não foi possível salvar."
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível salvar.'
    );
  });

  it('fecha sozinho após o tempo e avisa quem o renderizou', () => {
    const onClose = vi.fn();
    render(<Toast message="Erro qualquer" onClose={onClose} />);

    act(() => {
      vi.advanceTimersByTime(6999);
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('fecha ao clicar no X', () => {
    const onClose = vi.fn();
    render(<Toast message="Erro qualquer" onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('não fecha enquanto o mouse estiver sobre o aviso', () => {
    render(<Toast message="Erro qualquer" />);
    const alerta = screen.getByRole('alert');

    fireEvent.mouseEnter(alerta);
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.mouseLeave(alerta);
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reaparece quando chega uma nova mensagem depois de fechado', () => {
    const { rerender } = render(<Toast message="Primeiro erro" />);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(<Toast message="Segundo erro" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Segundo erro');
  });

  it('volta a exibir a mesma mensagem depois que ela é limpa e repetida', () => {
    const { rerender } = render(<Toast message="Mesmo erro" />);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(<Toast message="" />);
    rerender(<Toast message="Mesmo erro" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Mesmo erro');
  });

  it('usa role status e não traduz mensagens de sucesso', () => {
    render(<Toast message="Salvo com sucesso" variant="success" />);

    expect(screen.getByRole('status')).toHaveTextContent('Salvo com sucesso');
  });

  it('empilha vários avisos no mesmo contêiner', () => {
    render(
      <>
        <Toast message="Erro A" />
        <Toast message="Erro B" />
      </>
    );

    const viewports = document.querySelectorAll('#toast-viewport');
    expect(viewports).toHaveLength(1);
    expect(viewports[0].children).toHaveLength(2);
  });
});
