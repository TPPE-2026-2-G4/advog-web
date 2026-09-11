import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EditUserModal from './editUserModal';

const roles = [
  { cargo_id: 1, nome_cargo: 'Admin' },
  { cargo_id: 2, nome_cargo: 'Advogado' },
  { cargo_id: 3, nome_cargo: 'Estagiário' },
];

const member = {
  funcionario_id: 8,
  nome_func: 'Maria Silva',
  email_func: 'maria@teste.local',
  telefone: '(61) 99999-9999',
  cargo_id: 2,
  cargo: 'Advogado',
};

const renderModal = (props = {}) =>
  render(
    <EditUserModal
      member={member}
      isOpen
      roles={roles}
      isRoleLocked={false}
      onClose={vi.fn()}
      onSave={vi.fn().mockResolvedValue({})}
      {...props}
    />
  );

describe('EditUserModal', () => {
  it.each([
    [false, member],
    [true, null],
  ])(
    'não renderiza quando isOpen é %s ou não há membro',
    (isOpen, selectedMember) => {
      renderModal({ isOpen, member: selectedMember });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }
  );

  it('renderiza um diálogo acessível sem permitir editar o telefone', () => {
    renderModal();

    expect(
      screen.getByRole('dialog', { name: 'Editar Usuário' })
    ).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('Nome Completo')).toHaveValue('Maria Silva');
    expect(screen.getByLabelText('E-mail')).toHaveValue('maria@teste.local');
    expect(screen.queryByLabelText('Telefone')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nível de Acesso')).toHaveValue('2');

    roles.forEach((role) => {
      expect(
        screen.getByRole('option', { name: role.nome_cargo })
      ).toBeInTheDocument();
    });
  });

  it('encontra o cargo pelo nome quando o membro não possui cargo_id', () => {
    renderModal({
      member: { ...member, cargo_id: undefined, cargo: 'Estagiário' },
    });

    expect(screen.getByLabelText('Nível de Acesso')).toHaveValue('3');
  });

  it('repopula o formulário com o membro atual sempre que o modal é aberto', () => {
    const { rerender } = renderModal({ isOpen: false });
    const anotherMember = {
      ...member,
      nome_func: 'João Santos',
      email_func: 'joao@teste.local',
      telefone: '(61) 98888-7777',
      cargo_id: 3,
      cargo: 'Estagiário',
    };

    rerender(
      <EditUserModal
        member={anotherMember}
        isOpen
        roles={roles}
        isRoleLocked={false}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue({})}
      />
    );

    expect(screen.getByLabelText('Nome Completo')).toHaveValue('João Santos');
    expect(screen.getByLabelText('E-mail')).toHaveValue('joao@teste.local');
    expect(screen.queryByLabelText('Telefone')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nível de Acesso')).toHaveValue('3');
  });

  it('desabilita a alteração do único administrador e explica o motivo', () => {
    renderModal({ isRoleLocked: true });

    expect(screen.getByLabelText('Nível de Acesso')).toBeDisabled();
    expect(
      screen.getByText(
        'Único administrador do sistema — cargo não pode ser alterado.'
      )
    ).toBeInTheDocument();
  });

  it('envia os campos editados com o cargo_id e fecha após salvar', async () => {
    const onSave = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();
    renderModal({ onSave, onClose });

    fireEvent.change(screen.getByLabelText('Nome Completo'), {
      target: { value: 'Maria Souza' },
    });
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'maria.souza@teste.local' },
    });
    fireEvent.change(screen.getByLabelText('Nível de Acesso'), {
      target: { value: '3' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        nome: 'Maria Souza',
        email: 'maria.souza@teste.local',
        cargo: 3,
      })
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('exibe a mensagem da rejeição e mantém o diálogo aberto', async () => {
    const onClose = vi.fn();
    const onSave = vi
      .fn()
      .mockRejectedValue(new Error('E-mail já está em uso'));
    renderModal({ onClose, onSave });

    fireEvent.submit(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'E-mail já está em uso'
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
  });

  it('fecha por Cancelar, X, overlay ou Escape fora do carregamento', () => {
    const onClose = vi.fn();
    const { container } = renderModal({ onClose });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    fireEvent.click(container.firstChild);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(4);
  });

  it('mostra loading e bloqueia todas as formas de fechamento ao salvar', async () => {
    let resolveSave;
    const onClose = vi.fn();
    const onSave = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );
    const { container } = renderModal({ onClose, onSave });

    fireEvent.submit(screen.getByRole('button', { name: 'Salvar' }));

    const loadingIndicator = await screen.findByRole('status', {
      name: 'Carregando',
    });
    expect(loadingIndicator.closest('button')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled();
    expect(screen.getByLabelText('Nome Completo')).toBeDisabled();

    fireEvent.click(container.firstChild);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    resolveSave({});
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
});
