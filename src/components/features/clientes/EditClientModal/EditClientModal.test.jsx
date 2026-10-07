import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EditClientModal from './EditClientModal';

const mockFuncionarios = [
  { funcionario_id: 1, nome: 'Dr. Alexandre Carreiro' },
  { funcionario_id: 2, nome: 'Dra. Ana Paula' },
];

const mockCliente = {
  cliente_id: 5,
  nome: 'Tech Solutions LTDA',
  cpf: '55666777000188',
  telefone: '6134567890',
  email: 'contato@techsolutions.com',
  responsavel_id: 1,
  etapa_id: 2,
};

describe('EditClientModal', () => {
  it('não quebra quando cliente for nulo', () => {
    const { container } = render(
      <EditClientModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        cliente={null}
        funcionarios={mockFuncionarios}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('preenche os campos com os dados existentes do cliente', () => {
    render(
      <EditClientModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        cliente={mockCliente}
        funcionarios={mockFuncionarios}
      />
    );

    expect(screen.getByText('Editar Cliente')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Tech Solutions LTDA')).toBeInTheDocument();
    expect(screen.getByDisplayValue('55.666.777/0001-88')).toBeInTheDocument();
    expect(screen.getByDisplayValue('(61) 3456-7890')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('contato@techsolutions.com')
    ).toBeInTheDocument();
    expect(screen.getByText('Salvar Alterações')).toBeInTheDocument();
  });

  it('permite alterar todos os campos do formulário incluindo responsável', () => {
    render(
      <EditClientModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        cliente={mockCliente}
        funcionarios={mockFuncionarios}
      />
    );

    const cpfInput = screen.getByDisplayValue('55.666.777/0001-88');
    fireEvent.change(cpfInput, { target: { value: '11122233344' } });

    const telInput = screen.getByDisplayValue('(61) 3456-7890');
    fireEvent.change(telInput, { target: { value: '11999998888' } });

    const emailInput = screen.getByDisplayValue('contato@techsolutions.com');
    fireEvent.change(emailInput, { target: { value: 'novo@tech.com' } });

    const statusSelect = screen.getByLabelText(/status/i);
    fireEvent.change(statusSelect, { target: { value: '4' } });

    const respInput = screen.getByPlaceholderText('Selecione o responsável');
    fireEvent.focus(respInput);
    fireEvent.change(respInput, { target: { value: 'Ana' } });
    fireEvent.click(
      within(screen.getByRole('listbox')).getByText('Dra. Ana Paula')
    );

    expect(statusSelect.value).toBe('4');
  });

  it('valida campos e submete alterações com sucesso', async () => {
    const handleSubmit = vi.fn().mockResolvedValue({});
    render(
      <EditClientModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
        cliente={mockCliente}
        funcionarios={mockFuncionarios}
      />
    );

    const nomeInput = screen.getByDisplayValue('Tech Solutions LTDA');
    fireEvent.change(nomeInput, { target: { value: 'Tech Solutions S.A.' } });

    fireEvent.click(screen.getByText('Salvar Alterações'));

    expect(handleSubmit).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        nome: 'Tech Solutions S.A.',
        email: 'contato@techsolutions.com',
      })
    );
  });

  it('exibe erro de validação caso nome seja apagado', () => {
    const handleSubmit = vi.fn();
    render(
      <EditClientModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
        cliente={mockCliente}
        funcionarios={mockFuncionarios}
      />
    );

    const nomeInput = screen.getByDisplayValue('Tech Solutions LTDA');
    fireEvent.change(nomeInput, { target: { value: '' } });

    fireEvent.click(screen.getByText('Salvar Alterações'));
    expect(
      screen.getByText('O nome ou razão social é obrigatório.')
    ).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('exibe erro de validação caso e-mail seja inválido', () => {
    const handleSubmit = vi.fn();
    render(
      <EditClientModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
        cliente={mockCliente}
        funcionarios={mockFuncionarios}
      />
    );

    const emailInput = screen.getByDisplayValue('contato@techsolutions.com');
    fireEvent.change(emailInput, { target: { value: 'email_sem_arroba' } });

    fireEvent.click(screen.getByText('Salvar Alterações'));
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
  });

  it('trata erro lançado por onSubmit com mensagem customizada ou padrão', async () => {
    const handleSubmit = vi.fn().mockRejectedValue(new Error('Falha no banco'));
    const { rerender } = render(
      <EditClientModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
        cliente={mockCliente}
        funcionarios={mockFuncionarios}
      />
    );

    fireEvent.click(screen.getByText('Salvar Alterações'));
    expect(await screen.findByText('Falha no banco')).toBeInTheDocument();

    const handleSubmitSemMsg = vi.fn().mockRejectedValue({});
    rerender(
      <EditClientModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={handleSubmitSemMsg}
        cliente={mockCliente}
        funcionarios={mockFuncionarios}
      />
    );
    fireEvent.click(screen.getByText('Salvar Alterações'));
    expect(
      await screen.findByText('Erro ao atualizar cliente.')
    ).toBeInTheDocument();
  });

  it('fecha o modal ao clicar em Cancelar e respeita isSaving', () => {
    const handleClose = vi.fn();
    const { rerender } = render(
      <EditClientModal
        isOpen={true}
        onClose={handleClose}
        onSubmit={vi.fn()}
        cliente={mockCliente}
        funcionarios={mockFuncionarios}
        isSaving={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(handleClose).toHaveBeenCalledOnce();

    rerender(
      <EditClientModal
        isOpen={true}
        onClose={handleClose}
        onSubmit={vi.fn()}
        cliente={mockCliente}
        funcionarios={mockFuncionarios}
        isSaving={true}
      />
    );
    fireEvent.click(screen.getByRole('dialog').parentElement);
    // Não deve chamar novamente quando isSaving for true
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('suporta cliente com id, cnpj, status_id e campos vazios de documento/telefone', async () => {
    const handleSubmit = vi.fn().mockResolvedValue({});
    const clienteAlternativo = {
      id: 99,
      nome: 'Empresa XPTO',
      cnpj: '12345678000199',
      status_id: 3,
    };
    render(
      <EditClientModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
        cliente={clienteAlternativo}
        funcionarios={mockFuncionarios}
      />
    );

    fireEvent.change(screen.getByDisplayValue('12.345.678/0001-99'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByPlaceholderText('email@exemplo.com'), {
      target: { value: 'xpto@teste.com' },
    });

    fireEvent.click(screen.getByText('Salvar Alterações'));

    expect(handleSubmit).toHaveBeenCalledWith(
      99,
      expect.objectContaining({
        nome: 'Empresa XPTO',
        cpf: null,
        telefone: null,
        email: 'xpto@teste.com',
        etapa_id: 3,
      })
    );
  });
});
