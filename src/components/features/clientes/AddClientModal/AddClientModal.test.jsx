import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AddClientModal from './AddClientModal';

const mockFuncionarios = [
  { funcionario_id: 1, nome: 'Dr. Alexandre Carreiro' },
  { funcionario_id: 2, nome: 'Dra. Ana Paula' },
];

const validBaseFields = {
  'Nome do cliente': 'Cliente Teste',
  '000.000.000-00': '',
  '(00) 00000-0000': '61988887777',
  'email@exemplo.com': 'teste@email.com',
};

function fillFormFields(overrides = {}) {
  const data = { ...validBaseFields, ...overrides };
  for (const [placeholder, value] of Object.entries(data)) {
    fireEvent.change(screen.getByPlaceholderText(placeholder), {
      target: { value },
    });
  }
}

describe('AddClientModal', () => {
  it.each([
    'Nome do cliente',
    '000.000.000-00',
    '(00) 00000-0000',
    'email@exemplo.com',
    'Ex: Cível, Trabalhista...',
    'Descreva a demanda ou necessidade do cliente...',
  ])('renderiza o campo com placeholder "%s" quando aberto', (placeholder) => {
    render(
      <AddClientModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        funcionarios={mockFuncionarios}
      />
    );

    expect(screen.getByText('Cadastrar Novo Cliente')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument();
    expect(screen.getByText('Salvar Cadastro')).toBeInTheDocument();
  });

  it.each([
    {
      cenario: 'nome em branco',
      overrides: { 'Nome do cliente': '' },
      erroEsperado: 'O nome ou razão social é obrigatório.',
    },
    {
      cenario: 'telefone em branco',
      overrides: { '(00) 00000-0000': '' },
      erroEsperado: 'O telefone é obrigatório.',
    },
    {
      cenario: 'telefone com menos de 10 dígitos',
      overrides: { '(00) 00000-0000': '1' },
      erroEsperado: 'Informe um telefone válido com DDD (10 ou 11 dígitos).',
    },
    {
      cenario: 'CPF/CNPJ com quantidade inválida de dígitos',
      overrides: { '000.000.000-00': '1' },
      erroEsperado: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.',
    },
    {
      cenario: 'e-mail em branco',
      overrides: { 'email@exemplo.com': '' },
      erroEsperado: 'O e-mail é obrigatório.',
    },
    {
      cenario: 'e-mail sem formato válido',
      overrides: { 'email@exemplo.com': 'email_sem_arroba' },
      erroEsperado: 'Informe um e-mail válido.',
    },
  ])(
    'bloqueia o envio e exibe erro quando há $cenario',
    ({ overrides, erroEsperado }) => {
      const handleSubmit = vi.fn();
      render(
        <AddClientModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={handleSubmit}
          funcionarios={mockFuncionarios}
        />
      );

      fillFormFields(overrides);
      fireEvent.click(screen.getByText('Salvar Cadastro'));

      expect(screen.getByText(erroEsperado)).toBeInTheDocument();
      expect(handleSubmit).not.toHaveBeenCalled();
    }
  );

  it('submete dados formatados com sucesso', async () => {
    const handleSubmit = vi.fn().mockResolvedValue({});
    render(
      <AddClientModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
        funcionarios={mockFuncionarios}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Nome do cliente'), {
      target: { value: 'Tech Solutions LTDA' },
    });
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), {
      target: { value: '55666777000188' },
    });
    fireEvent.change(screen.getByPlaceholderText('(00) 00000-0000'), {
      target: { value: '6134567890' },
    });
    fireEvent.change(screen.getByPlaceholderText('email@exemplo.com'), {
      target: { value: 'contato@techsolutions.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Ex: Cível, Trabalhista...'), {
      target: { value: 'Direito Empresarial' },
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        'Descreva a demanda ou necessidade do cliente...'
      ),
      {
        target: { value: 'Contrato social e assessoria jurídica contínua' },
      }
    );
    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: '2' },
    });

    const respInput = screen.getByPlaceholderText('Selecione o responsável');
    fireEvent.focus(respInput);
    fireEvent.change(respInput, { target: { value: 'Alexandre' } });
    fireEvent.click(
      within(screen.getByRole('listbox')).getByText('Dr. Alexandre Carreiro')
    );

    fireEvent.click(screen.getByText('Salvar Cadastro'));

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Tech Solutions LTDA',
        cpf: '55666777000188',
        telefone: '(61) 3456-7890',
        email: 'contato@techsolutions.com',
        responsavel_id: 1,
        etapa_id: 2,
        area_interesse: 'Direito Empresarial',
        descricao: 'Contrato social e assessoria jurídica contínua',
      })
    );
  });

  it.each([
    {
      cenario: 'erro com mensagem customizada da API',
      erroRejeitado: new Error('Email duplicado'),
      mensagemEsperada: 'Email duplicado',
    },
    {
      cenario: 'erro sem propriedade message (fallback)',
      erroRejeitado: {},
      mensagemEsperada: 'Erro ao salvar cliente.',
    },
    {
      cenario: 'erro de falha de rede',
      erroRejeitado: new Error(
        'NetworkError when attempting to fetch resource.'
      ),
      mensagemEsperada:
        'Erro de conexão com o servidor. Tente novamente em instantes.',
    },
  ])(
    'trata $cenario ao submeter o formulário',
    async ({ erroRejeitado, mensagemEsperada }) => {
      const handleSubmit = vi.fn().mockRejectedValue(erroRejeitado);
      render(
        <AddClientModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={handleSubmit}
          funcionarios={mockFuncionarios}
        />
      );

      fillFormFields();
      fireEvent.click(screen.getByText('Salvar Cadastro'));

      expect(await screen.findByText(mensagemEsperada)).toBeInTheDocument();
    }
  );

  it('fecha o modal ao clicar em Cancelar e respeita isSaving', () => {
    const handleClose = vi.fn();
    const { rerender } = render(
      <AddClientModal
        isOpen={true}
        onClose={handleClose}
        onSubmit={vi.fn()}
        funcionarios={mockFuncionarios}
        isSaving={false}
      />
    );

    fireEvent.click(screen.getByText('Cancelar'));
    expect(handleClose).toHaveBeenCalledOnce();

    rerender(
      <AddClientModal
        isOpen={true}
        onClose={handleClose}
        onSubmit={vi.fn()}
        funcionarios={mockFuncionarios}
        isSaving={true}
      />
    );
    fireEvent.click(screen.getByRole('dialog').parentElement);
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('submete com etapa padrão 1 e sem responsável quando não informados', async () => {
    const handleSubmit = vi.fn().mockResolvedValue({});
    render(
      <AddClientModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
        funcionarios={mockFuncionarios}
      />
    );

    fillFormFields({
      'Nome do cliente': 'Cliente Sem Responsável',
      'email@exemplo.com': 'semresp@email.com',
    });

    fireEvent.click(screen.getByText('Salvar Cadastro'));

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Cliente Sem Responsável',
        email: 'semresp@email.com',
        responsavel_id: null,
        etapa_id: 1,
      })
    );
  });
});
