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
  area_interesse: 'Trabalhista',
  descricao: 'Processo trabalhista referente a horas extras',
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

  it.each([
    'Tech Solutions LTDA',
    '55.666.777/0001-88',
    '(61) 3456-7890',
    'contato@techsolutions.com',
    'Trabalhista',
    'Processo trabalhista referente a horas extras',
  ])(
    'preenche o formulário com o valor existente "%s" do cliente',
    (displayValue) => {
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
      expect(screen.getByDisplayValue(displayValue)).toBeInTheDocument();
      expect(screen.getByText('Salvar Alterações')).toBeInTheDocument();
    }
  );

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

    const areaInput = screen.getByDisplayValue('Trabalhista');
    fireEvent.change(areaInput, { target: { value: 'Cível' } });

    const descInput = screen.getByDisplayValue(
      'Processo trabalhista referente a horas extras'
    );
    fireEvent.change(descInput, { target: { value: 'Demanda cível' } });

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
        area_interesse: 'Trabalhista',
        descricao: 'Processo trabalhista referente a horas extras',
      })
    );
  });

  it.each([
    {
      cenario: 'nome apagado',
      valorOriginal: 'Tech Solutions LTDA',
      novoValor: '',
      erroEsperado: 'O nome ou razão social é obrigatório.',
    },
    {
      cenario: 'e-mail inválido',
      valorOriginal: 'contato@techsolutions.com',
      novoValor: 'email_sem_arroba',
      erroEsperado: 'Informe um e-mail válido.',
    },
    {
      cenario: 'CPF/CNPJ com tamanho inválido',
      valorOriginal: '55.666.777/0001-88',
      novoValor: '1',
      erroEsperado: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.',
    },
    {
      cenario: 'telefone apagado',
      valorOriginal: '(61) 3456-7890',
      novoValor: '',
      erroEsperado: 'O telefone é obrigatório.',
    },
    {
      cenario: 'telefone incompleto',
      valorOriginal: '(61) 3456-7890',
      novoValor: '1',
      erroEsperado: 'Informe um telefone válido com DDD (10 ou 11 dígitos).',
    },
  ])(
    'exibe erro de validação quando há $cenario',
    ({ valorOriginal, novoValor, erroEsperado }) => {
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

      fireEvent.change(screen.getByDisplayValue(valorOriginal), {
        target: { value: novoValor },
      });
      fireEvent.click(screen.getByText('Salvar Alterações'));

      expect(screen.getByText(erroEsperado)).toBeInTheDocument();
      expect(handleSubmit).not.toHaveBeenCalled();
    }
  );

  it.each([
    {
      cenario: 'erro com mensagem customizada',
      erroRejeitado: new Error('Falha no banco'),
      mensagemEsperada: 'Falha no banco',
    },
    {
      cenario: 'erro sem mensagem usando texto padrão',
      erroRejeitado: {},
      mensagemEsperada: 'Erro ao atualizar cliente.',
    },
    {
      cenario: 'erro de conexão de rede',
      erroRejeitado: new Error(
        'NetworkError when attempting to fetch resource.'
      ),
      mensagemEsperada:
        'Erro de conexão com o servidor. Tente novamente em instantes.',
    },
  ])(
    'trata $cenario lançado por onSubmit',
    async ({ erroRejeitado, mensagemEsperada }) => {
      const handleSubmit = vi.fn().mockRejectedValue(erroRejeitado);
      render(
        <EditClientModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={handleSubmit}
          cliente={mockCliente}
          funcionarios={mockFuncionarios}
        />
      );

      fireEvent.click(screen.getByText('Salvar Alterações'));
      expect(await screen.findByText(mensagemEsperada)).toBeInTheDocument();
    }
  );

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
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('suporta cliente com id, cnpj, status_id e documento vazio ao salvar', async () => {
    const handleSubmit = vi.fn().mockResolvedValue({});
    const clienteAlternativo = {
      id: 99,
      nome: 'Empresa XPTO',
      cnpj: '12345678000199',
      telefone: '6133334444',
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
        telefone: '(61) 3333-4444',
        email: 'xpto@teste.com',
        etapa_id: 3,
      })
    );
  });
});
