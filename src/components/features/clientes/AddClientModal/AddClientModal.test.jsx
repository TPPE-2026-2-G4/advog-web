import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AddClientModal from './AddClientModal';

const mockFuncionarios = [
  { funcionario_id: 1, nome: 'Dr. Alexandre Carreiro' },
  { funcionario_id: 2, nome: 'Dra. Ana Paula' },
];

describe('AddClientModal', () => {
  it('renderiza os campos obrigatórios quando o modal está aberto', () => {
    render(
      <AddClientModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        funcionarios={mockFuncionarios}
      />
    );

    expect(screen.getByText('Cadastrar Novo Cliente')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nome do cliente')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('000.000.000-00')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('(00) 00000-0000')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('email@exemplo.com')
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Ex: Cível, Trabalhista...')
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        'Descreva a demanda ou necessidade do cliente...'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Salvar Cadastro')).toBeInTheDocument();
  });

  it('valida campos obrigatórios ao submeter formulário em branco', () => {
    const handleSubmit = vi.fn();
    render(
      <AddClientModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
        funcionarios={mockFuncionarios}
      />
    );

    fireEvent.click(screen.getByText('Salvar Cadastro'));
    expect(
      screen.getByText('O nome ou razão social é obrigatório.')
    ).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('Nome do cliente'), {
      target: { value: 'Cliente Teste' },
    });
    fireEvent.click(screen.getByText('Salvar Cadastro'));
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
  });

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

  it('trata erro retornado por onSubmit com mensagem customizada', async () => {
    const handleSubmit = vi
      .fn()
      .mockRejectedValue(new Error('Email duplicado'));
    render(
      <AddClientModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
        funcionarios={mockFuncionarios}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Nome do cliente'), {
      target: { value: 'Cliente Teste' },
    });
    fireEvent.change(screen.getByPlaceholderText('email@exemplo.com'), {
      target: { value: 'teste@email.com' },
    });

    fireEvent.click(screen.getByText('Salvar Cadastro'));
    expect(await screen.findByText('Email duplicado')).toBeInTheDocument();
  });

  it('trata erro retornado por onSubmit usando mensagem de fallback quando o erro não tem message', async () => {
    const handleSubmitSemMsg = vi.fn().mockRejectedValue({});
    render(
      <AddClientModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={handleSubmitSemMsg}
        funcionarios={mockFuncionarios}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Nome do cliente'), {
      target: { value: 'Cliente Teste' },
    });
    fireEvent.change(screen.getByPlaceholderText('email@exemplo.com'), {
      target: { value: 'teste@email.com' },
    });

    fireEvent.click(screen.getByText('Salvar Cadastro'));
    expect(
      await screen.findByText('Erro ao salvar cliente.')
    ).toBeInTheDocument();
  });

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

    fireEvent.change(screen.getByPlaceholderText('Nome do cliente'), {
      target: { value: 'Cliente Sem Responsável' },
    });
    fireEvent.change(screen.getByPlaceholderText('email@exemplo.com'), {
      target: { value: 'semresp@email.com' },
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
