import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSearchParams } from 'next/navigation';
import ClientesClient from './clientesClient';
import * as clientesService from '@/services/clientes';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/services/clientes', () => ({
  criarCliente: vi.fn(),
  atualizarCliente: vi.fn(),
  excluirCliente: vi.fn(),
  listarClientesPaginado: vi.fn(),
  obterCliente: vi.fn(),
}));

const mockFuncionarios = [
  { funcionario_id: 1, nome: 'Dr. Roberto Silva' },
  { id: 2, nome: 'Dra. Amanda Souza' },
  { nome: 'Dr. Terceiro' },
];

const mockClientes = [
  {
    cliente_id: 1,
    nome: 'Carlos Drummond',
    cpf: '12345678901',
    telefone: '11987654321',
    email: 'carlos@teste.com',
    responsavel_id: 1,
    etapa_id: 1,
    ultima_interacao: '2026-09-10T14:30:00Z',
  },
  {
    cliente_id: 2,
    nome: 'Clarice Lispector',
    cpf: '98765432100',
    telefone: '21988887777',
    email: 'clarice@teste.com',
    responsavel_id: 2,
    etapa_id: 4,
    ultima_interacao: '2026-09-12T10:00:00Z',
  },
];

const paginaCom = (itens, extra = {}) => ({
  itens,
  total: itens.length,
  page: 1,
  pageSize: 10,
  totalPages: 1,
  ...extra,
});

describe('ClientesClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSearchParams.mockReturnValue(new URLSearchParams());
    // A recarga após buscar/alterar nunca conclui por padrão (estado otimista).
    clientesService.listarClientesPaginado.mockReturnValue(
      new Promise(() => {})
    );
  });

  it.each([
    {
      descricao: 'no plural quando há 2 clientes',
      clientes: mockClientes,
      textoEsperado: /2 clientes cadastrados/,
    },
    {
      descricao: 'no singular quando há apenas 1 cliente',
      clientes: [mockClientes[0]],
      textoEsperado: /1 cliente cadastrado/,
    },
    {
      descricao: 'no plural quando há 3 clientes',
      clientes: [
        ...mockClientes,
        { ...mockClientes[0], cliente_id: 3, nome: 'Machado de Assis' },
      ],
      textoEsperado: /3 clientes cadastrados/,
    },
  ])(
    'renderiza o cabeçalho e a contagem $descricao',
    ({ clientes, textoEsperado }) => {
      render(
        <ClientesClient
          initialPage={paginaCom(clientes)}
          initialFuncionarios={mockFuncionarios}
        />
      );

      expect(
        screen.getByRole('heading', { name: 'Clientes' })
      ).toBeInTheDocument();
      expect(screen.getByText(textoEsperado)).toBeInTheDocument();
    }
  );

  it.each([
    {
      cenario: 'busca de texto pelo nome',
      acao: () =>
        fireEvent.change(screen.getByLabelText('Buscar clientes'), {
          target: { value: 'Clarice' },
        }),
      filtros: { busca: 'Clarice', responsavel_id: '', etapa_id: '' },
    },
    {
      cenario: 'responsável selecionado no autocomplete',
      acao: () => {
        const inputResponsavel = screen.getByLabelText(
          'Filtrar por responsável'
        );
        fireEvent.focus(inputResponsavel);
        fireEvent.click(
          screen.getByRole('option', { name: /dr\. roberto silva/i })
        );
      },
      filtros: { busca: '', responsavel_id: '1', etapa_id: '' },
    },
    {
      cenario: 'status / etapa selecionado',
      acao: () =>
        fireEvent.change(screen.getByLabelText('Filtrar por status'), {
          target: { value: '4' },
        }),
      filtros: { busca: '', responsavel_id: '', etapa_id: '4' },
    },
  ])('filtra clientes no servidor por $cenario', async ({ acao, filtros }) => {
    clientesService.listarClientesPaginado.mockResolvedValue(
      paginaCom([mockClientes[1]])
    );
    render(
      <ClientesClient
        initialPage={paginaCom(mockClientes)}
        initialFuncionarios={mockFuncionarios}
      />
    );

    acao();

    await waitFor(() => {
      expect(clientesService.listarClientesPaginado).toHaveBeenCalledWith({
        ...filtros,
        page: 1,
        pageSize: 10,
      });
      expect(screen.getByText('Clarice Lispector')).toBeInTheDocument();
      expect(screen.queryByText('Carlos Drummond')).not.toBeInTheDocument();
    });
  });

  describe('paginação', () => {
    const paginaDoMeio = paginaCom(mockClientes, {
      total: 25,
      page: 1,
      totalPages: 3,
    });

    it('mostra o resumo e os controles quando há clientes', () => {
      render(
        <ClientesClient
          initialPage={paginaDoMeio}
          initialFuncionarios={mockFuncionarios}
        />
      );

      expect(screen.getByText(/25 clientes cadastrados/)).toBeInTheDocument();
      expect(
        screen.getByText('Mostrando 1–10 de 25 clientes')
      ).toBeInTheDocument();
      expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Página anterior' })
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: 'Próxima página' })
      ).toBeEnabled();
    });

    it('carrega a próxima página ao clicar em "Próxima página"', async () => {
      const segunda = [
        { ...mockClientes[0], cliente_id: 30, nome: 'Machado de Assis' },
      ];
      clientesService.listarClientesPaginado.mockResolvedValue(
        paginaCom(segunda, { total: 25, page: 2, totalPages: 3 })
      );
      render(
        <ClientesClient
          initialPage={paginaDoMeio}
          initialFuncionarios={mockFuncionarios}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));

      await waitFor(() => {
        expect(clientesService.listarClientesPaginado).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 })
        );
        expect(screen.getByText('Machado de Assis')).toBeInTheDocument();
      });
      expect(screen.queryByText('Carlos Drummond')).not.toBeInTheDocument();
      expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
      expect(
        screen.getByText('Mostrando 11–20 de 25 clientes')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Página anterior' })
      ).toBeEnabled();
    });

    it('oculta os controles quando não há clientes', () => {
      render(
        <ClientesClient
          initialPage={paginaCom([])}
          initialFuncionarios={mockFuncionarios}
        />
      );

      expect(
        screen.queryByRole('navigation', { name: 'Paginação' })
      ).not.toBeInTheDocument();
    });
  });

  it('abre e fecha o modal de cadastro de novo cliente', () => {
    render(
      <ClientesClient
        initialPage={paginaCom(mockClientes)}
        initialFuncionarios={mockFuncionarios}
      />
    );

    expect(
      screen.queryByText('Cadastrar Novo Cliente')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /novo cliente/i }));
    expect(screen.getByText('Cadastrar Novo Cliente')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(
      screen.queryByText('Cadastrar Novo Cliente')
    ).not.toBeInTheDocument();
  });

  it('cadastra um novo cliente com sucesso e exibe mensagem de feedback', async () => {
    const novoCliente = {
      cliente_id: 3,
      nome: 'Machado de Assis',
      email: 'machado@teste.com',
      telefone: '21999998888',
      cpf: '11122233344',
      etapa_id: 1,
      responsavel_id: 1,
    };
    clientesService.criarCliente.mockResolvedValueOnce(novoCliente);

    render(
      <ClientesClient
        initialPage={paginaCom(mockClientes)}
        initialFuncionarios={mockFuncionarios}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /novo cliente/i }));

    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: 'Machado de Assis' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'machado@teste.com' },
    });
    fireEvent.change(screen.getByLabelText(/telefone/i), {
      target: { value: '21999998888' },
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar cadastro/i }));

    await waitFor(() => {
      expect(clientesService.criarCliente).toHaveBeenCalled();
      expect(
        screen.getByText('Cliente cadastrado com sucesso!')
      ).toBeInTheDocument();
      expect(screen.getByText('Machado de Assis')).toBeInTheDocument();
    });
  });

  it('exibe mensagem de erro quando o cadastro falha', async () => {
    clientesService.criarCliente.mockRejectedValueOnce(
      new Error('Erro de validação no servidor')
    );

    render(
      <ClientesClient
        initialPage={paginaCom(mockClientes)}
        initialFuncionarios={mockFuncionarios}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /novo cliente/i }));

    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: 'Nome Inválido' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'email@valido.com' },
    });
    fireEvent.change(screen.getByLabelText(/telefone/i), {
      target: { value: '21999998888' },
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar cadastro/i }));

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByText('Erro de validação no servidor').length
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it('abre o modal de detalhes e permite transitar para edição', () => {
    render(
      <ClientesClient
        initialPage={paginaCom(mockClientes)}
        initialFuncionarios={mockFuncionarios}
      />
    );

    const viewButtons = screen.getAllByLabelText(/visualizar detalhes/i);
    fireEvent.click(viewButtons[0]);

    expect(screen.getByText('Detalhes do Cliente')).toBeInTheDocument();
    expect(
      screen.getAllByText('Carlos Drummond').length
    ).toBeGreaterThanOrEqual(1);

    // Clica no botão Editar dentro dos detalhes
    const editModalBtn = screen.getByRole('button', { name: /^editar$/i });
    fireEvent.click(editModalBtn);

    expect(screen.queryByText('Detalhes do Cliente')).not.toBeInTheDocument();
    expect(screen.getByText('Editar Cliente')).toBeInTheDocument();
  });

  it('abre o modal de edição diretamente e atualiza o cliente', async () => {
    const atualizado = {
      ...mockClientes[0],
      nome: 'Carlos Drummond de Andrade',
    };
    clientesService.atualizarCliente.mockResolvedValueOnce(atualizado);

    render(
      <ClientesClient
        initialPage={paginaCom(mockClientes)}
        initialFuncionarios={mockFuncionarios}
      />
    );

    const editButtons = screen.getAllByLabelText(/editar cliente/i);
    fireEvent.click(editButtons[0]);

    expect(screen.getByText('Editar Cliente')).toBeInTheDocument();

    const nomeInput = screen.getByLabelText(/nome completo/i);
    fireEvent.change(nomeInput, {
      target: { value: 'Carlos Drummond de Andrade' },
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(clientesService.atualizarCliente).toHaveBeenCalled();
      expect(
        screen.getByText('Cliente atualizado com sucesso!')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Carlos Drummond de Andrade')
      ).toBeInTheDocument();
    });
  });

  it('abre o modal de exclusão e exclui o cliente com sucesso', async () => {
    clientesService.excluirCliente.mockResolvedValueOnce({ ok: true });

    render(
      <ClientesClient
        initialPage={paginaCom(mockClientes)}
        initialFuncionarios={mockFuncionarios}
      />
    );

    const deleteButtons = screen.getAllByLabelText(/excluir cliente/i);
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Excluir cliente')).toBeInTheDocument();
    expect(
      screen.getAllByText('Carlos Drummond').length
    ).toBeGreaterThanOrEqual(1);

    const confirmBtn = screen.getByRole('button', { name: /^excluir$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(clientesService.excluirCliente).toHaveBeenCalledWith(1);
      expect(
        screen.getByText('Cliente excluído com sucesso!')
      ).toBeInTheDocument();
      expect(screen.queryByText('Carlos Drummond')).not.toBeInTheDocument();
    });
  });

  it('exibe o botão Limpar quando há filtros e limpa todos os filtros ao clicar', async () => {
    clientesService.listarClientesPaginado.mockResolvedValue(
      paginaCom([mockClientes[1]])
    );
    render(
      <ClientesClient
        initialPage={paginaCom(mockClientes)}
        initialFuncionarios={mockFuncionarios}
      />
    );

    expect(
      screen.queryByRole('button', { name: /limpar filtros/i })
    ).not.toBeInTheDocument();

    const searchInput = screen.getByLabelText('Buscar clientes');
    fireEvent.change(searchInput, { target: { value: 'Clarice' } });

    await waitFor(() => {
      expect(screen.queryByText('Carlos Drummond')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Clarice Lispector')).toBeInTheDocument();

    clientesService.listarClientesPaginado.mockResolvedValue(
      paginaCom(mockClientes)
    );
    fireEvent.click(screen.getByRole('button', { name: /limpar filtros/i }));

    expect(searchInput).toHaveValue('');
    await waitFor(() => {
      expect(screen.getByText('Carlos Drummond')).toBeInTheDocument();
    });
    expect(screen.getByText('Clarice Lispector')).toBeInTheDocument();
    expect(clientesService.listarClientesPaginado).toHaveBeenLastCalledWith({
      busca: '',
      responsavel_id: '',
      etapa_id: '',
      page: 1,
      pageSize: 10,
    });
    expect(
      screen.queryByRole('button', { name: /limpar filtros/i })
    ).not.toBeInTheDocument();
  });

  it('exibe tela de acesso negado quando usuário não possui permissão de visualizar clientes', () => {
    sessionStorage.setItem(
      'current_user',
      JSON.stringify({
        funcionario_id: 10,
        nome: 'Sem Permissao',
        cargo: {
          nome_cargo: 'Sem Permissao',
          permissao: {
            visualizar_clientes: false,
            gerenciar_clientes: false,
          },
        },
      })
    );

    render(
      <ClientesClient
        initialPage={paginaCom(mockClientes)}
        initialFuncionarios={mockFuncionarios}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Acesso negado' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Você não possui permissão para visualizar clientes.')
    ).toBeInTheDocument();
  });

  it('permite visualizar mas oculta criação, edição e exclusão quando não tem permissão de gerenciar clientes', () => {
    sessionStorage.setItem(
      'current_user',
      JSON.stringify({
        funcionario_id: 11,
        nome: 'Apenas Leitura',
        cargo: {
          nome_cargo: 'Leitor',
          permissao: {
            visualizar_clientes: true,
            gerenciar_clientes: false,
          },
        },
      })
    );

    render(
      <ClientesClient
        initialPage={paginaCom(mockClientes)}
        initialFuncionarios={mockFuncionarios}
      />
    );

    // Pode visualizar a lista
    expect(
      screen.getByRole('heading', { name: 'Clientes' })
    ).toBeInTheDocument();
    expect(screen.getByText('Carlos Drummond')).toBeInTheDocument();

    // Não pode criar novo cliente
    expect(
      screen.queryByRole('button', { name: /novo cliente/i })
    ).not.toBeInTheDocument();

    // Pode ver o olho (visualizar detalhes), mas não lápis (editar) nem lixeira (excluir)
    expect(screen.getAllByLabelText(/visualizar detalhes/i)).toHaveLength(2);
    expect(screen.queryByLabelText(/editar cliente/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/excluir cliente/i)).not.toBeInTheDocument();

    // Ao abrir detalhes, não pode ver o botão de editar
    fireEvent.click(screen.getAllByLabelText(/visualizar detalhes/i)[0]);
    expect(screen.getByText('Detalhes do Cliente')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^editar$/i })
    ).not.toBeInTheDocument();
  });

  it('abre automaticamente o modal de detalhes quando clienteId está na URL', async () => {
    useSearchParams.mockReturnValue(new URLSearchParams('clienteId=2'));

    render(
      <ClientesClient
        initialPage={paginaCom(mockClientes)}
        initialFuncionarios={mockFuncionarios}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Detalhes do Cliente' })
      ).toBeInTheDocument();
      expect(
        screen.getAllByText('Clarice Lispector').length
      ).toBeGreaterThanOrEqual(2);
    });
  });
});
