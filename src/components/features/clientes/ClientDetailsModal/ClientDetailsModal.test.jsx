import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClientDetailsModal from './ClientDetailsModal';
import { formatarDataInteracao } from '@/utils/cliente';

const mockCliente = {
  cliente_id: 4,
  nome: 'Tech Solutions LTDA',
  cnpj: '55666777000188',
  telefone: '6134567890',
  email: 'contato@techsolutions.com',
  responsavel_nome: 'Pedro',
  ultima_interacao: '2026-08-18T00:00:00Z',
  etapa_id: 2,
  area_interesse: 'Direito do Consumidor',
  descricao: 'Contestação de cobrança indevida',
};

describe('ClientDetailsModal', () => {
  it('não renderiza nada quando cliente for nulo', () => {
    const { container } = render(
      <ClientDetailsModal isOpen={true} onClose={vi.fn()} cliente={null} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza os dados completos do cliente', () => {
    render(
      <ClientDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        cliente={mockCliente}
      />
    );

    expect(screen.getByText('Detalhes do Cliente')).toBeInTheDocument();
    expect(screen.getByText('Tech Solutions LTDA')).toBeInTheDocument();
    expect(screen.getAllByText('55.666.777/0001-88')).toHaveLength(2);
    expect(screen.getByText('CPF / CNPJ')).toBeInTheDocument();
    expect(screen.getByText('Atendimento iniciado')).toBeInTheDocument();
    expect(screen.getByText('(61) 3456-7890')).toBeInTheDocument();
    expect(screen.getByText('contato@techsolutions.com')).toBeInTheDocument();
    expect(screen.getByText('Pedro')).toBeInTheDocument();
    expect(screen.getByText('Direito do Consumidor')).toBeInTheDocument();
    expect(
      screen.getByText('Contestação de cobrança indevida')
    ).toBeInTheDocument();
    expect(
      screen.getByText(formatarDataInteracao(mockCliente.ultima_interacao))
    ).toBeInTheDocument();
  });

  it('renderiza responsável quando for string direta', () => {
    render(
      <ClientDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        cliente={{
          ...mockCliente,
          responsavel_nome: null,
          responsavel: 'Dra. Ana',
        }}
      />
    );
    expect(screen.getByText('Dra. Ana')).toBeInTheDocument();
  });

  it('renderiza responsável quando for objeto', () => {
    render(
      <ClientDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        cliente={{
          ...mockCliente,
          responsavel_nome: null,
          responsavel: { nome: 'Dr. Lucas' },
        }}
      />
    );
    expect(screen.getByText('Dr. Lucas')).toBeInTheDocument();
  });

  it('busca responsável na lista de funcionários quando houver apenas responsavel_id', () => {
    render(
      <ClientDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        cliente={{
          ...mockCliente,
          responsavel_nome: null,
          responsavel: null,
          responsavel_id: 10,
        }}
        funcionarios={[{ funcionario_id: 10, nome: 'Dr. Fernando' }]}
      />
    );
    expect(screen.getByText('Dr. Fernando')).toBeInTheDocument();
  });

  it('exibe Não atribuído e traço quando nenhum responsável nem documento forem encontrados', () => {
    render(
      <ClientDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        cliente={{
          ...mockCliente,
          responsavel_nome: null,
          responsavel: null,
          responsavel_id: null,
          cpf: null,
          cnpj: null,
          documento: null,
        }}
      />
    );
    expect(screen.getByText('Não atribuído')).toBeInTheDocument();
  });

  it('aciona onEdit e fecha o modal ao clicar em Editar', () => {
    const handleClose = vi.fn();
    const handleEdit = vi.fn();
    render(
      <ClientDetailsModal
        isOpen={true}
        onClose={handleClose}
        onEdit={handleEdit}
        cliente={mockCliente}
      />
    );

    const editBtn = screen.getByRole('button', { name: /editar/i });
    fireEvent.click(editBtn);

    expect(handleClose).toHaveBeenCalled();
    expect(handleEdit).toHaveBeenCalledWith(mockCliente);
  });

  it('exibe traço quando telefone ou email estão vazios e encontra funcionario por f.id', () => {
    render(
      <ClientDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        cliente={{
          ...mockCliente,
          telefone: null,
          email: null,
          responsavel_nome: null,
          responsavel: null,
          responsavel_id: 20,
        }}
        funcionarios={[{ id: 20, nome: 'Dr. ID Funcionario' }]}
      />
    );
    expect(screen.getByText('Dr. ID Funcionario')).toBeInTheDocument();
    expect(screen.getAllByText('-')).toHaveLength(2);
  });

  it('renderiza documento quando informado via campo cpf_cnpj', () => {
    render(
      <ClientDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        cliente={{
          ...mockCliente,
          cnpj: null,
          cpf: null,
          documento: null,
          cpf_cnpj: '01234567890',
        }}
      />
    );
    expect(screen.getAllByText('012.345.678-90')).toHaveLength(2);
  });
});
