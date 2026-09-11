import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  createEmptyPermission,
  PERMISSION_LABELS,
} from '@/constants/permissions';
import NewRoleModal from './newRoleModal';

const permissionEntries = Object.entries(PERMISSION_LABELS);
const roles = [
  {
    cargo_id: 1,
    nome_cargo: 'Admin',
    permissao: Object.fromEntries(
      permissionEntries.map(([permissionName]) => [permissionName, true])
    ),
  },
];

const renderModal = (props = {}) =>
  render(
    <NewRoleModal
      isOpen
      roles={roles}
      onClose={vi.fn()}
      onCreate={vi.fn().mockResolvedValue(undefined)}
      {...props}
    />
  );

describe('NewRoleModal', () => {
  it('não renderiza quando está fechado', () => {
    renderModal({ isOpen: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza os campos, as permissões e o contador inicial', () => {
    renderModal();

    expect(
      screen.getByRole('dialog', { name: 'Criar Novo Cargo' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nome do Cargo')).toBeRequired();
    expect(screen.getByLabelText('Descrição (opcional)')).not.toBeRequired();
    expect(screen.getByLabelText('Descrição (opcional)')).toHaveAttribute(
      'maxlength',
      '255'
    );
    expect(
      screen.getByRole('group', { name: 'Permissões do cargo' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(
      permissionEntries.length
    );
    expect(
      screen.getByText(
        `0 de ${permissionEntries.length} permissões selecionadas`
      )
    ).toBeInTheDocument();
  });

  it('valida o nome vazio antes de criar', () => {
    const onCreate = vi.fn();
    renderModal({ onCreate });

    fireEvent.change(screen.getByLabelText('Nome do Cargo'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Cargo' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Informe o nome do cargo.'
    );
    expect(onCreate).not.toHaveBeenCalled();
  });

  it.each(['admin', 'ADMIN', '  aDmIn  '])(
    'valida cargo duplicado ignorando maiúsculas e espaços: %s',
    (duplicateName) => {
      const onCreate = vi.fn();
      renderModal({ onCreate });

      fireEvent.change(screen.getByLabelText('Nome do Cargo'), {
        target: { value: duplicateName },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Criar Cargo' }));

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Já existe um cargo com esse nome.'
      );
      expect(onCreate).not.toHaveBeenCalled();
    }
  );

  it('envia nome normalizado e permissões e reseta após o sucesso', async () => {
    const onCreate = vi.fn().mockResolvedValue({ cargo_id: 'paralegal' });
    const onClose = vi.fn();
    renderModal({ roles: undefined, onCreate, onClose });

    fireEvent.change(screen.getByLabelText('Nome do Cargo'), {
      target: { value: '  Paralegal  ' },
    });
    fireEvent.change(screen.getByLabelText('Descrição (opcional)'), {
      target: { value: '  Apoio à equipe jurídica.  ' },
    });
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: permissionEntries[0][1],
      })
    );
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: permissionEntries[4][1],
      })
    );

    expect(
      screen.getByText(
        `2 de ${permissionEntries.length} permissões selecionadas`
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Criar Cargo' }));

    const expectedPermission = createEmptyPermission();
    expectedPermission[permissionEntries[0][0]] = true;
    expectedPermission[permissionEntries[4][0]] = true;
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({
        nome_cargo: 'Paralegal',
        descricao: 'Apoio à equipe jurídica.',
        permissao: expectedPermission,
      })
    );
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Nome do Cargo')).toHaveValue('');
    expect(screen.getByLabelText('Descrição (opcional)')).toHaveValue('');
    screen
      .getAllByRole('checkbox')
      .forEach((checkbox) => expect(checkbox).not.toBeChecked());
    expect(
      screen.getByText(
        `0 de ${permissionEntries.length} permissões selecionadas`
      )
    ).toBeInTheDocument();
  });

  it('remove uma permissão que já estava selecionada', () => {
    renderModal();
    const checkbox = screen.getByRole('checkbox', {
      name: permissionEntries[0][1],
    });

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(
      screen.getByText(
        `0 de ${permissionEntries.length} permissões selecionadas`
      )
    ).toBeInTheDocument();
  });

  it('fecha ao cancelar, clicar no X, clicar fora ou pressionar Escape', () => {
    const onClose = vi.fn();
    const { container } = renderModal({ onClose });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    fireEvent.click(container.firstChild);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(4);
  });

  it('mostra carregamento e impede o fechamento durante a criação', async () => {
    let resolveCreation;
    const onCreate = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveCreation = resolve;
      })
    );
    const onClose = vi.fn();
    const { container } = renderModal({ onCreate, onClose });

    fireEvent.change(screen.getByLabelText('Nome do Cargo'), {
      target: { value: 'Paralegal' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Cargo' }));

    const loadingIndicator = await screen.findByRole('status', {
      name: 'Carregando',
    });
    expect(loadingIndicator.closest('button')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled();
    expect(screen.getByLabelText('Nome do Cargo')).toBeDisabled();
    expect(screen.getByLabelText('Descrição (opcional)')).toBeDisabled();
    screen
      .getAllByRole('checkbox')
      .forEach((checkbox) => expect(checkbox).toBeDisabled());

    fireEvent.click(container.firstChild);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    resolveCreation();
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('exibe o erro e preserva os dados quando a criação falha', async () => {
    const onClose = vi.fn();
    const onCreate = vi.fn().mockRejectedValue(new Error('Falha ao criar'));
    renderModal({ onCreate, onClose });

    fireEvent.change(screen.getByLabelText('Nome do Cargo'), {
      target: { value: 'Paralegal' },
    });
    fireEvent.change(screen.getByLabelText('Descrição (opcional)'), {
      target: { value: 'Descrição preservada' },
    });
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: permissionEntries[0][1],
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Criar Cargo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falha ao criar'
    );
    expect(screen.getByLabelText('Nome do Cargo')).toHaveValue('Paralegal');
    expect(screen.getByLabelText('Descrição (opcional)')).toHaveValue(
      'Descrição preservada'
    );
    expect(
      screen.getByRole('checkbox', {
        name: permissionEntries[0][1],
      })
    ).toBeChecked();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('exibe uma mensagem padrão para falhas sem Error', async () => {
    renderModal({ onCreate: vi.fn().mockRejectedValue('falha') });

    fireEvent.change(screen.getByLabelText('Nome do Cargo'), {
      target: { value: 'Paralegal' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Cargo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível criar o cargo.'
    );
  });

  it('ignora registros sem nome ao verificar duplicidade', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    renderModal({ roles: [{}], onCreate });

    fireEvent.change(screen.getByLabelText('Nome do Cargo'), {
      target: { value: 'Paralegal' },
    });
    fireEvent.submit(screen.getByLabelText('Nome do Cargo').form);

    await waitFor(() => expect(onCreate).toHaveBeenCalledOnce());
  });
});
