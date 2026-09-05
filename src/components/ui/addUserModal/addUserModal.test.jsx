import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddUserModal from './addUserModal';

const renderModal = (props = {}) =>
  render(
    <AddUserModal
      isOpen
      onClose={vi.fn()}
      onCreated={vi.fn().mockResolvedValue({})}
      {...props}
    />
  );

describe('AddUserModal', () => {
  it('não renderiza quando está fechado', () => {
    renderModal({ isOpen: false });

    expect(
      screen.queryByRole('heading', { name: 'Adicionar Novo Usuário' })
    ).not.toBeInTheDocument();
  });

  it('renderiza título, campos obrigatórios e ações', () => {
    renderModal();

    expect(
      screen.getByRole('heading', { name: 'Adicionar Novo Usuário' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nome completo')).toBeRequired();
    expect(screen.getByLabelText('Email empresarial')).toBeRequired();
    expect(
      screen.getByRole('button', { name: 'Adicionar' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cancelar' })
    ).toBeInTheDocument();
  });

  it('atualiza os campos e envia os dados ao submeter o formulário', async () => {
    const onCreated = vi.fn().mockResolvedValue({ funcionario_id: 1 });
    renderModal({ onCreated });

    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'Maria Silva' },
    });
    fireEvent.change(screen.getByLabelText('Email empresarial'), {
      target: { value: 'maria@teste.local' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith({
        nome: 'Maria Silva',
        email: 'maria@teste.local',
      })
    );
  });

  it('executa o cadastro quando o formulário é submetido pelo teclado', async () => {
    const onCreated = vi.fn().mockResolvedValue({ funcionario_id: 1 });
    renderModal({ onCreated });
    const email = screen.getByLabelText('Email empresarial');

    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'João Santos' },
    });
    fireEvent.change(email, { target: { value: 'joao@teste.local' } });
    fireEvent.keyDown(email, { key: 'Enter', code: 'Enter' });
    fireEvent.submit(email.form);

    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
  });

  it('fecha após o cadastro e limpa os campos', async () => {
    const onClose = vi.fn();
    const onCreated = vi.fn().mockResolvedValue({ funcionario_id: 1 });
    const { rerender } = renderModal({ onClose, onCreated });

    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'Maria Silva' },
    });
    fireEvent.change(screen.getByLabelText('Email empresarial'), {
      target: { value: 'maria@teste.local' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    rerender(<AddUserModal isOpen onClose={onClose} onCreated={onCreated} />);
    expect(screen.getByLabelText('Nome completo')).toHaveValue('');
    expect(screen.getByLabelText('Email empresarial')).toHaveValue('');
  });

  it('exibe erro e mantém o modal aberto quando o cadastro falha', async () => {
    const onClose = vi.fn();
    const onCreated = vi
      .fn()
      .mockRejectedValue(new Error('E-mail já cadastrado'));
    renderModal({ onClose, onCreated });

    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'Maria Silva' },
    });
    fireEvent.change(screen.getByLabelText('Email empresarial'), {
      target: { value: 'maria@teste.local' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Adicionar' }));

    expect(await screen.findByText('E-mail já cadastrado')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('mostra estado de envio e desabilita o botão enquanto aguarda', async () => {
    let resolver;
    const onCreated = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      })
    );
    renderModal({ onCreated });

    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'Maria Silva' },
    });
    fireEvent.change(screen.getByLabelText('Email empresarial'), {
      target: { value: 'maria@teste.local' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Adicionar' }));

    const loadingIndicator = await screen.findByRole('status', {
      name: 'Carregando',
    });
    expect(loadingIndicator.closest('button')).toBeDisabled();
    resolver({ funcionario_id: 1 });
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
  });

  it('fecha ao clicar em cancelar, fechar ou fora do modal', () => {
    const onClose = vi.fn();
    const { container } = renderModal({ onClose });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    fireEvent.click(container.firstChild);

    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('fecha ao pressionar Escape', () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('não fecha ao pressionar Escape durante o envio', async () => {
    let resolver;
    const onClose = vi.fn();
    const onCreated = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      })
    );
    renderModal({ onClose, onCreated });

    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'Maria Silva' },
    });
    fireEvent.change(screen.getByLabelText('Email empresarial'), {
      target: { value: 'maria@teste.local' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Adicionar' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
    resolver({ funcionario_id: 1 });
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
  });
});
