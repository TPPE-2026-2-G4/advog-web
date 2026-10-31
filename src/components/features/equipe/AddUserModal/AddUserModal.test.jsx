import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddUserModal from './AddUserModal';

const roles = [
  { cargo_id: 1, nome_cargo: 'Administrador' },
  { cargo_id: 2, nome_cargo: 'Advogado' },
];

const renderModal = (props = {}) =>
  render(
    <AddUserModal
      isOpen
      roles={roles}
      onClose={vi.fn()}
      onCreated={vi.fn().mockResolvedValue({})}
      {...props}
    />
  );

function fillUserForm({
  nome = 'Maria Silva',
  email = 'maria@teste.local',
  cargo = '2',
} = {}) {
  fireEvent.change(screen.getByLabelText('Nome completo'), {
    target: { value: nome },
  });
  fireEvent.change(screen.getByLabelText('Email empresarial'), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText('Cargo'), {
    target: { value: cargo },
  });
}

describe('AddUserModal', () => {
  it('não renderiza quando está fechado', () => {
    renderModal({ isOpen: false });

    expect(
      screen.queryByRole('heading', { name: 'Adicionar Novo Usuário' })
    ).not.toBeInTheDocument();
  });

  it('renderiza título e botões de ação principais', () => {
    renderModal();

    expect(
      screen.getByRole('heading', { name: 'Adicionar Novo Usuário' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Adicionar' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cancelar' })
    ).toBeInTheDocument();
  });

  it.each(['Nome completo', 'Email empresarial', 'Cargo'])(
    'renderiza o campo obrigatório "%s"',
    (label) => {
      renderModal();
      expect(screen.getByLabelText(label)).toBeRequired();
    }
  );

  it.each(roles)(
    'renderiza a opção de cargo "$nome_cargo" com valor $cargo_id',
    ({ cargo_id, nome_cargo }) => {
      renderModal();
      expect(screen.getByRole('option', { name: nome_cargo })).toHaveValue(
        String(cargo_id)
      );
    }
  );

  it('atualiza os campos e envia os dados ao submeter o formulário', async () => {
    const onCreated = vi.fn().mockResolvedValue({ funcionario_id: 1 });
    renderModal({ onCreated });

    fillUserForm();
    fireEvent.submit(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith({
        nome: 'Maria Silva',
        email: 'maria@teste.local',
        cargo_id: 2,
      })
    );
  });

  it('executa o cadastro quando o formulário é submetido pelo teclado', async () => {
    const onCreated = vi.fn().mockResolvedValue({ funcionario_id: 1 });
    renderModal({ onCreated });
    const email = screen.getByLabelText('Email empresarial');

    fillUserForm({
      nome: 'João Santos',
      email: 'joao@teste.local',
      cargo: '1',
    });
    fireEvent.keyDown(email, { key: 'Enter', code: 'Enter' });
    fireEvent.submit(email.form);

    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
  });

  it('fecha após o cadastro e limpa os campos', async () => {
    const onClose = vi.fn();
    const onCreated = vi.fn().mockResolvedValue({ funcionario_id: 1 });
    const { rerender } = renderModal({ onClose, onCreated });

    fillUserForm();
    fireEvent.submit(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    rerender(
      <AddUserModal
        isOpen
        roles={roles}
        onClose={onClose}
        onCreated={onCreated}
      />
    );
    expect(screen.getByLabelText('Nome completo')).toHaveValue('');
    expect(screen.getByLabelText('Email empresarial')).toHaveValue('');
    expect(screen.getByLabelText('Cargo')).toHaveValue('');
  });

  it('exibe erro e mantém o modal aberto quando o cadastro falha', async () => {
    const onClose = vi.fn();
    const onCreated = vi
      .fn()
      .mockRejectedValue(new Error('E-mail já cadastrado'));
    renderModal({ onClose, onCreated });

    fillUserForm();
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

    fillUserForm();
    fireEvent.submit(screen.getByRole('button', { name: 'Adicionar' }));

    const loadingIndicator = await screen.findByRole('status', {
      name: 'Carregando',
    });
    expect(loadingIndicator.closest('button')).toBeDisabled();
    resolver({ funcionario_id: 1 });
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
  });

  it.each([
    {
      acao: 'clicar no botão Cancelar',
      disparar: () =>
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' })),
    },
    {
      acao: 'clicar no botão Fechar',
      disparar: () =>
        fireEvent.click(screen.getByRole('button', { name: 'Fechar' })),
    },
    {
      acao: 'clicar no backdrop fora do modal',
      disparar: (container) => fireEvent.click(container.firstChild),
    },
    {
      acao: 'pressionar a tecla Escape',
      disparar: () => fireEvent.keyDown(document, { key: 'Escape' }),
    },
  ])('fecha o modal ao $acao', ({ disparar }) => {
    const onClose = vi.fn();
    const { container } = renderModal({ onClose });

    disparar(container);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('impede o cadastro quando não há cargos disponíveis', () => {
    renderModal({ roles: [] });

    expect(screen.getByLabelText('Cargo')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeDisabled();
    expect(
      screen.getByText('Crie um cargo antes de adicionar um usuário.')
    ).toBeInTheDocument();
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

    fillUserForm();
    fireEvent.submit(screen.getByRole('button', { name: 'Adicionar' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
    resolver({ funcionario_id: 1 });
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
  });
});
