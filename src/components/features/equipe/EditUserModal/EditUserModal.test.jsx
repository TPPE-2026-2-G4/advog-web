import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EditUserModal from './EditUserModal';

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

  it('renderiza um diálogo acessível permitindo editar apenas o cargo', () => {
    renderModal();

    expect(
      screen.getByRole('dialog', { name: 'Editar Usuário' })
    ).toHaveAttribute('aria-modal', 'true');
    expect(screen.queryByLabelText('Nome Completo')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
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

  it('usa valor vazio quando não encontra o cargo pelo nome', () => {
    renderModal({
      member: { ...member, cargo_id: undefined, cargo: 'CargoInexistente' },
    });

    expect(screen.getByLabelText('Nível de Acesso')).toHaveValue('');
  });

  describe('Testes de fallback de chave do membro (memberKey)', () => {
    it.each([
      ['com funcionario_id', { funcionario_id: 1 }],
      ['com id', { id: 2 }],
      ['com email_func', { email_func: 'a@b.com' }],
      ['com email', { email: 'c@d.com' }],
      ['completamente sem ID', {}],
    ])('renderiza a chave correta %s', (desc, memberData) => {
      renderModal({ member: memberData });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('envia o cargo contido em formData caso selectedRole seja nulo', async () => {
    const onSave = vi.fn().mockResolvedValue({});
    // Member starts without cargo, formData.cargo starts as ""
    renderModal({ member: { funcionario_id: 9, nome_func: 'Teste' }, onSave });

    // Try to submit with "" directly to bypass required attribute check in jsdom
    fireEvent.submit(screen.getByRole('dialog'));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ cargo: '' }));
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

  it('envia somente o cargo_id e fecha após salvar', async () => {
    const onSave = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();
    renderModal({ onSave, onClose });

    fireEvent.change(screen.getByLabelText('Nível de Acesso'), {
      target: { value: '3' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        cargo: 3,
      })
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  describe('Tratamento de rejeição (getErrorMessage)', () => {
    it.each([
      ['string', 'E-mail já está em uso', 'E-mail já está em uso'],
      ['objeto com message', new Error('Falha de rede'), 'Falha de rede'],
      ['objeto vazio', {}, 'Não foi possível atualizar o usuário.'],
      ['falsy', undefined, 'Não foi possível atualizar o usuário.'],
    ])(
      'exibe a mensagem para erro tipo %s e mantém aberto',
      async (descricao, errorObject, expectedMessage) => {
        const onClose = vi.fn();
        const onSave = vi.fn().mockRejectedValue(errorObject);
        renderModal({ onClose, onSave });

        fireEvent.submit(screen.getByRole('button', { name: 'Salvar' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
          expectedMessage
        );
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
      }
    );
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
    expect(screen.getByLabelText('Nível de Acesso')).toBeDisabled();

    fireEvent.click(container.firstChild);
    fireEvent.keyDown(document, { key: 'Escape' });

    // Tenta submeter de novo para cobrir o if (isSubmitting) return;
    fireEvent.submit(screen.getByRole('dialog'));

    expect(onClose).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledTimes(1);

    resolveSave({});
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
});
