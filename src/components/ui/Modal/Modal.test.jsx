import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Modal, { ModalCloseButton } from './Modal';

describe('Modal', () => {
  it('não renderiza nada quando isOpen é falso', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()}>
        <div>Conteúdo do Modal</div>
      </Modal>
    );

    expect(screen.queryByText('Conteúdo do Modal')).not.toBeInTheDocument();
  });

  it('renderiza o conteúdo e atributos de diálogo quando isOpen é verdadeiro', () => {
    render(
      <Modal isOpen onClose={vi.fn()} ariaLabel="Diálogo de Teste">
        <div>Conteúdo do Modal</div>
      </Modal>
    );

    const dialog = screen.getByRole('dialog', { name: 'Diálogo de Teste' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Conteúdo do Modal')).toBeInTheDocument();
  });

  it('fecha ao clicar fora (no overlay)', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal isOpen onClose={onClose}>
        <div>Conteúdo do Modal</div>
      </Modal>
    );

    fireEvent.click(container.firstChild);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não fecha ao clicar no conteúdo interno do modal', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose}>
        <div data-testid="inner">Conteúdo do Modal</div>
      </Modal>
    );

    fireEvent.click(screen.getByTestId('inner'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('fecha ao pressionar a tecla Escape', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose}>
        <div>Conteúdo do Modal</div>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não fecha ao pressionar Escape quando preventClose é verdadeiro', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} preventClose>
        <div>Conteúdo do Modal</div>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('não fecha ao clicar no overlay quando preventClose é verdadeiro', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal isOpen onClose={onClose} preventClose>
        <div>Conteúdo do Modal</div>
      </Modal>
    );

    fireEvent.click(container.firstChild);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('suporta renderização como form com disparo de onSubmit', () => {
    const handleSubmit = vi.fn((e) => e.preventDefault());
    render(
      <Modal isOpen onClose={vi.fn()} as="form" onSubmit={handleSubmit}>
        <button type="submit">Enviar</button>
      </Modal>
    );

    fireEvent.submit(screen.getByRole('button', { name: 'Enviar' }));
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('remove o event listener ao desmontar', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(
      <Modal isOpen onClose={vi.fn()}>
        <div>Conteúdo</div>
      </Modal>
    );

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );
    removeEventListenerSpy.mockRestore();
  });
  it('não possui aria-modal quando ariaModal é falso', () => {
    render(
      <Modal isOpen onClose={vi.fn()} ariaModal={false}>
        <div>Modal sem aria-modal</div>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toHaveAttribute('aria-modal');
  });
});

describe('ModalCloseButton', () => {
  it('renderiza o botão com atributos acessíveis e dispara onClose ao clicar', () => {
    const onClose = vi.fn();
    render(<ModalCloseButton onClose={onClose} />);

    const button = screen.getByRole('button', { name: 'Fechar' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Fechar');

    fireEvent.click(button);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fica desabilitado quando disabled é verdadeiro', () => {
    render(<ModalCloseButton onClose={vi.fn()} disabled />);

    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled();
  });
});
