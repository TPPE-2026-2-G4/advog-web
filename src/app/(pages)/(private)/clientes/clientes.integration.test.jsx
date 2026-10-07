import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClientesClient from './clientesClient';
import * as clientesService from '@/services/clientes';

vi.mock('@/services/clientes', () => ({
  criarCliente: vi.fn(),
  atualizarCliente: vi.fn(),
  excluirCliente: vi.fn(),
  listarClientes: vi.fn(),
  obterCliente: vi.fn(),
}));

const mockFuncionarios = [
  { funcionario_id: 1, id: 1, nome: 'Dr. Lucas Mendes' },
  { funcionario_id: 2, id: 2, nome: 'Dra. Beatriz Santos' },
];

const mockClientesIniciais = [
  {
    cliente_id: 101,
    nome: 'Empresa Alpha Ltda',
    documento: '12.345.678/0001-90',
    cnpj: '12345678000190',
    telefone: '11988881111',
    email: 'contato@alpha.com',
    responsavel_id: 1,
    responsavel_nome: 'Dr. Lucas Mendes',
    etapa_id: 1, // Novo contato
    ultima_interacao: '2026-10-01T10:00:00Z',
  },
  {
    cliente_id: 102,
    nome: 'Beatriz Pereira',
    documento: '123.456.789-00',
    cpf: '12345678900',
    telefone: '21977772222',
    email: 'beatriz@gmail.com',
    responsavel_id: 2,
    responsavel_nome: 'Dra. Beatriz Santos',
    etapa_id: 4, // Cliente ativo
    ultima_interacao: '2026-10-02T15:30:00Z',
  },
];

describe('US22 - Visualizar e Gerenciar Clientes (Integração)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o fluxo completo: visualização, filtros, cadastro, edição e exclusão', async () => {
    render(
      <ClientesClient
        initialClientes={mockClientesIniciais}
        initialFuncionarios={mockFuncionarios}
      />
    );

    // 1. Verificação da listagem inicial
    expect(
      screen.getByRole('heading', { name: 'Clientes' })
    ).toBeInTheDocument();
    expect(screen.getByText(/2 clientes cadastrados/)).toBeInTheDocument();
    expect(screen.getByText('Empresa Alpha Ltda')).toBeInTheDocument();
    expect(screen.getByText('Beatriz Pereira')).toBeInTheDocument();

    // 2. Filtro por busca
    const searchInput = screen.getByLabelText('Buscar clientes');
    fireEvent.change(searchInput, { target: { value: 'alpha' } });
    expect(screen.getByText('Empresa Alpha Ltda')).toBeInTheDocument();
    expect(screen.queryByText('Beatriz Pereira')).not.toBeInTheDocument();

    // Limpar busca
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Beatriz Pereira')).toBeInTheDocument();

    // 3. Abrir Detalhes do Cliente
    const viewButtons = screen.getAllByLabelText(/visualizar detalhes/i);
    fireEvent.click(viewButtons[0]);

    expect(screen.getByText('Detalhes do Cliente')).toBeInTheDocument();
    expect(
      screen.getAllByText('contato@alpha.com').length
    ).toBeGreaterThanOrEqual(1);

    // Fechar Detalhes
    const closeBtns = screen.getAllByRole('button', { name: /fechar/i });
    fireEvent.click(closeBtns[0]);
    expect(screen.queryByText('Detalhes do Cliente')).not.toBeInTheDocument();

    // 4. Cadastrar Novo Cliente com autocomplete de responsável
    clientesService.criarCliente.mockResolvedValueOnce({
      cliente_id: 103,
      nome: 'Carlos Eduardo',
      cpf: '33344455566',
      telefone: '31966663333',
      email: 'carlos@teste.com',
      responsavel_id: 1,
      etapa_id: 2, // Atendimento iniciado
      ultima_interacao: new Date().toISOString(),
    });

    fireEvent.click(screen.getByRole('button', { name: /novo cliente/i }));
    expect(screen.getByText('Cadastrar Novo Cliente')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: 'Carlos Eduardo' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'carlos@teste.com' },
    });
    fireEvent.change(screen.getByLabelText(/telefone/i), {
      target: { value: '31966663333' },
    });
    fireEvent.change(screen.getByLabelText(/cpf \/ cnpj/i), {
      target: { value: '33344455566' },
    });

    // Selecionar responsável no autocomplete
    const respCombobox = screen.getByPlaceholderText('Selecione o responsável');
    fireEvent.focus(respCombobox);
    fireEvent.change(respCombobox, { target: { value: 'Lucas' } });
    const listbox = screen.getByRole('listbox');
    const optionLucas = within(listbox).getByText(/dr\. lucas mendes/i);
    fireEvent.click(optionLucas);

    // Salvar cadastro
    fireEvent.click(screen.getByRole('button', { name: /salvar cadastro/i }));

    await waitFor(() => {
      expect(clientesService.criarCliente).toHaveBeenCalled();
      expect(screen.getByText('Carlos Eduardo')).toBeInTheDocument();
      expect(
        screen.getByText('Cliente cadastrado com sucesso!')
      ).toBeInTheDocument();
    });

    // 5. Editar o cliente recém-cadastrado
    clientesService.atualizarCliente.mockResolvedValueOnce({
      cliente_id: 103,
      nome: 'Carlos Eduardo Santos',
      telefone: '31966663333',
      email: 'carlos@teste.com',
      responsavel_id: 1,
      etapa_id: 3, // Em negociação
    });

    const editButtons = screen.getAllByLabelText(/editar cliente/i);
    // O mais recente está no topo
    fireEvent.click(editButtons[0]);

    expect(screen.getByText('Editar Cliente')).toBeInTheDocument();
    const editNome = screen.getByLabelText(/nome completo/i);
    fireEvent.change(editNome, { target: { value: 'Carlos Eduardo Santos' } });

    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(clientesService.atualizarCliente).toHaveBeenCalled();
      expect(screen.getByText('Carlos Eduardo Santos')).toBeInTheDocument();
      expect(
        screen.getByText('Cliente atualizado com sucesso!')
      ).toBeInTheDocument();
    });

    // 6. Excluir cliente
    clientesService.excluirCliente.mockResolvedValueOnce({ ok: true });

    const deleteButtons = screen.getAllByLabelText(/excluir cliente/i);
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Excluir cliente')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^excluir$/i }));

    await waitFor(() => {
      expect(clientesService.excluirCliente).toHaveBeenCalledWith(103);
      expect(
        screen.queryByText('Carlos Eduardo Santos')
      ).not.toBeInTheDocument();
      expect(
        screen.getByText('Cliente excluído com sucesso!')
      ).toBeInTheDocument();
    });
  }, 15000);
});
