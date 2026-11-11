import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import PerfilPage from './page';
import { AuthContext } from '@/contexts/AuthContext';
import {
  atualizarPerfilFuncionario,
  uploadFotoPerfilFuncionario,
} from '@/services/funcionarios';
import { listarAtuacoes } from '@/services/atuacoes';

const { routerReplaceMock } = vi.hoisted(() => ({
  routerReplaceMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: routerReplaceMock,
  }),
}));

vi.mock('@/services/funcionarios', () => ({
  atualizarPerfilFuncionario: vi.fn(),
  uploadFotoPerfilFuncionario: vi.fn(),
}));

vi.mock('@/services/atuacoes', () => ({
  listarAtuacoes: vi.fn(),
}));

const mockUser = {
  funcionario_id: 8,
  nome: 'Ana Souza',
  email: 'ana@exemplo.com',
  cargo: { nome_cargo: 'Advogada' },
  status: 'Ativo',
  atuacao_id: 4,
  uf_oab: 'DF',
  numero_oab: '12345',
};

const mockAtuacoes = [
  { atuacao_id: 4, nome: 'Direito Civil' },
  { atuacao_id: 5, nome: 'Direito Trabalhista' },
];

const updateUserMock = vi.fn();

const renderPerfilIntegration = async (currentUser = mockUser) => {
  const Page = await PerfilPage();
  return render(
    <AuthContext.Provider
      value={{ user: currentUser, updateUser: updateUserMock }}
    >
      {Page}
    </AuthContext.Provider>
  );
};

const submitForm = () =>
  fireEvent.submit(
    screen.getByRole('button', { name: 'Salvar alterações' }).closest('form')
  );

describe('Integração: Perfil do Funcionário (PerfilPage + PerfilClient)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:foto-selecionada'),
      revokeObjectURL: vi.fn(),
    });
    localStorage.clear();
    sessionStorage.clear();
    listarAtuacoes.mockResolvedValue(mockAtuacoes);
    atualizarPerfilFuncionario.mockResolvedValue({
      ...mockUser,
      nome: 'Ana Souza Atualizada',
    });
    uploadFotoPerfilFuncionario.mockResolvedValue({
      ...mockUser,
      foto_perfil_url: 'https://storage.exemplo.com/perfil.png',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renderiza PerfilPage com lista de atuações e dados do usuário logado', async () => {
    await renderPerfilIntegration();

    expect(listarAtuacoes).toHaveBeenCalledOnce();
    expect(await screen.findByDisplayValue('Ana Souza')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@exemplo.com');
    expect(screen.getByLabelText('E-mail')).toBeDisabled();
    expect(screen.getByLabelText('Área de atuação')).toHaveValue('4');
    expect(screen.getAllByText('Direito Civil')).toHaveLength(2);
    expect(screen.getByText('Advogada')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
    expect(screen.getByText('AS')).toBeInTheDocument();
  });

  it('salva dados pessoais alterados e atualiza contexto de autenticação', async () => {
    atualizarPerfilFuncionario.mockResolvedValueOnce({
      ...mockUser,
      nome: 'Ana Souza Atualizada',
      atuacao_id: 5,
    });
    await renderPerfilIntegration();

    fireEvent.change(await screen.findByLabelText('Nome completo'), {
      target: { value: 'Ana Souza Atualizada' },
    });
    fireEvent.change(screen.getByLabelText('Área de atuação'), {
      target: { value: '5' },
    });

    submitForm();

    await screen.findByRole('status');
    expect(atualizarPerfilFuncionario).toHaveBeenCalledWith({
      nome: 'Ana Souza Atualizada',
      uf_oab: 'DF',
      numero_oab: '12345',
      atuacao_id: 5,
    });
    expect(updateUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Ana Souza Atualizada',
        atuacao_id: 5,
      })
    );
  });

  it('limpa campos de OAB ao apagar ambos', async () => {
    await renderPerfilIntegration();

    fireEvent.change(await screen.findByLabelText('UF da OAB'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Número OAB'), {
      target: { value: '' },
    });

    submitForm();

    await waitFor(() => {
      expect(atualizarPerfilFuncionario).toHaveBeenCalledWith({
        nome: 'Ana Souza',
        uf_oab: null,
        numero_oab: null,
        atuacao_id: 4,
      });
    });
  });

  it('valida campos de formulário e impede submissão com erro', async () => {
    await renderPerfilIntegration();

    fireEvent.change(await screen.findByLabelText('Nome completo'), {
      target: { value: '   ' },
    });
    submitForm();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Informe seu nome completo.'
    );

    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'Ana Souza' },
    });
    fireEvent.change(screen.getByLabelText('Número OAB'), {
      target: { value: '12' },
    });
    submitForm();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Informe a UF e os 5 dígitos da sua OAB.'
    );
  });

  it('valida alteração de senha e confirma com a API', async () => {
    await renderPerfilIntegration();

    fireEvent.change(await screen.findByLabelText('Senha atual'), {
      target: { value: 'senha-antiga' },
    });
    fireEvent.change(screen.getByLabelText('Nova senha'), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), {
      target: { value: '123' },
    });
    submitForm();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Para alterar a senha, informe a senha atual e uma nova senha com no mínimo 8 caracteres.'
    );

    fireEvent.change(screen.getByLabelText('Nova senha'), {
      target: { value: 'nova-senha-123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), {
      target: { value: 'outra-senha' },
    });
    submitForm();
    expect(
      await screen.findByText('A nova senha e a confirmação não conferem.')
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), {
      target: { value: 'nova-senha-123' },
    });
    submitForm();

    await waitFor(() => {
      expect(atualizarPerfilFuncionario).toHaveBeenCalledWith({
        nome: 'Ana Souza',
        uf_oab: 'DF',
        numero_oab: '12345',
        atuacao_id: 4,
        senha_atual: 'senha-antiga',
        nova_senha: 'nova-senha-123',
        confirmar_nova_senha: 'nova-senha-123',
      });
    });
  });

  it('permite selecionar foto de perfil, clica nos botões de foto, valida arquivo e envia upload', async () => {
    await renderPerfilIntegration();

    fireEvent.click(screen.getByLabelText('Alterar foto de perfil'));
    fireEvent.click(
      screen.getByRole('button', { name: /Clique para alterar sua foto/ })
    );

    const gifFile = new File(['teste'], 'perfil.gif', { type: 'image/gif' });
    fireEvent.change(
      await screen.findByLabelText('Selecionar foto de perfil'),
      {
        target: { files: [gifFile] },
      }
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Formato inválido. Selecione uma imagem JPG ou PNG.'
    );

    const validFile = new File(['foto'], 'minha-foto.png', {
      type: 'image/png',
    });
    fireEvent.change(screen.getByLabelText('Selecionar foto de perfil'), {
      target: { files: [validFile] },
    });
    expect(
      screen.getByRole('button', { name: /Foto selecionada/ })
    ).toBeInTheDocument();

    const bigFile = new File(
      [new Uint8Array(6 * 1024 * 1024)],
      'foto-grande.png',
      {
        type: 'image/png',
      }
    );
    fireEvent.change(screen.getByLabelText('Selecionar foto de perfil'), {
      target: { files: [bigFile] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A imagem excede o limite máximo de 5 MB.'
    );

    fireEvent.change(screen.getByLabelText('Selecionar foto de perfil'), {
      target: { files: [validFile] },
    });
    submitForm();

    await screen.findByRole('status');
    expect(uploadFotoPerfilFuncionario).toHaveBeenCalledWith(validFile);
    expect(updateUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        foto_perfil_url: 'https://storage.exemplo.com/perfil.png',
      })
    );

    // Submete novamente para cobrir limpeza do timeout anterior
    submitForm();
    await screen.findByRole('status');
  });

  it('suporta usuário com dados legados e cargo em formato string', async () => {
    const legacyUser = {
      id: 99,
      nome_func: 'Carlos Legado',
      email_func: 'carlos@legado.com',
      cargo: 'Consultor Jurídico',
      status: 'Ativo',
    };
    await renderPerfilIntegration(legacyUser);

    expect(
      await screen.findByDisplayValue('Carlos Legado')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveValue('carlos@legado.com');
    expect(screen.getByText('Consultor Jurídico')).toBeInTheDocument();
  });

  it('suporta usuário com dados mínimos e status inativo', async () => {
    const minimalUser = {
      funcionario_id: 101,
      nome: 'X',
      email: '',
      status: 'Inativo',
      cargo: null,
      uf_oab: null,
      numero_oab: null,
      atuacao_id: null,
    };
    await renderPerfilIntegration(minimalUser);
    expect(screen.getByText('Inativo')).toBeInTheDocument();
    expect(screen.getByText('E-mail não informado')).toBeInTheDocument();
    expect(screen.getByText('OAB não informada')).toBeInTheDocument();
    expect(screen.getByText('Área não informada')).toBeInTheDocument();
  });

  it('exibe foto de perfil existente na tela', async () => {
    await renderPerfilIntegration({
      ...mockUser,
      foto_perfil_url: 'https://storage.exemplo.com/perfil-existente.png',
    });

    expect(await screen.findByAltText('Foto de Ana Souza')).toHaveAttribute(
      'src',
      'https://storage.exemplo.com/perfil-existente.png'
    );
  });

  it('cancela alterações e restaura os valores originais', async () => {
    await renderPerfilIntegration();

    fireEvent.change(await screen.findByLabelText('Nome completo'), {
      target: { value: 'Nome Temporário' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByLabelText('Nome completo')).toHaveValue('Ana Souza');
    expect(atualizarPerfilFuncionario).not.toHaveBeenCalled();
  });

  it('redireciona para o login quando não há usuário autenticado', async () => {
    await renderPerfilIntegration(null);

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith('/login');
    });
  });

  it('bloqueia inputs de informações pessoais para conta de administrador', async () => {
    const adminUser = {
      funcionario_id: 1,
      nome: 'Administrador',
      email: 'admin@admin.com',
      cargo: { nome_cargo: 'Administrador' },
      status: 'Ativo',
      atuacao_id: null,
      uf_oab: null,
      numero_oab: null,
    };

    await renderPerfilIntegration(adminUser);

    expect(await screen.findByDisplayValue('Administrador')).toBeDisabled();
    expect(screen.getByLabelText('E-mail')).toBeDisabled();
    expect(screen.getByLabelText('Área de atuação')).toBeDisabled();
    expect(screen.getByLabelText('UF da OAB')).toBeDisabled();
    expect(screen.getByLabelText('Número OAB')).toBeDisabled();

    expect(screen.getByLabelText('Senha atual')).not.toBeDisabled();
    expect(screen.getByLabelText('Nova senha')).not.toBeDisabled();
    expect(screen.getByLabelText('Confirmar nova senha')).not.toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Alterar foto de perfil' })
    ).not.toBeDisabled();
  });

  it('exibe erro retornado pela API na atualização de perfil', async () => {
    atualizarPerfilFuncionario.mockRejectedValueOnce(
      new Error('Erro interno ao atualizar')
    );
    await renderPerfilIntegration();

    submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Erro interno ao atualizar'
    );
  });

  it('renderiza PerfilPage no servidor via SSR cobrindo o fallback de montagem', async () => {
    const Page = await PerfilPage();
    const html = renderToString(
      <AuthContext.Provider
        value={{ user: mockUser, updateUser: updateUserMock }}
      >
        {Page}
      </AuthContext.Provider>
    );
    expect(html).toBe('');
  });
});
