import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PerfilClient from './perfilClient';
import { AuthContext } from '@/contexts/AuthContext';
import {
  atualizarPerfilFuncionario,
  uploadFotoPerfilFuncionario,
} from '@/services/funcionarios';

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

const user = {
  funcionario_id: 8,
  nome: 'Ana Souza',
  email: 'ana@exemplo.com',
  cargo: { nome_cargo: 'Advogada' },
  status: 'Ativo',
  atuacao_id: 4,
  uf_oab: 'DF',
  numero_oab: '12345',
};

const atuacoes = [
  { atuacao_id: 4, nome: 'Direito Civil' },
  { atuacao_id: 5, nome: 'Direito Trabalhista' },
];

const updateUser = vi.fn();

const renderPerfil = (currentUser = user, areas = atuacoes) =>
  render(
    <AuthContext.Provider value={{ user: currentUser, updateUser }}>
      <PerfilClient atuacoes={areas} />
    </AuthContext.Provider>
  );

const submitForm = () =>
  fireEvent.submit(
    screen.getByRole('button', { name: 'Salvar alterações' }).closest('form')
  );

describe('PerfilClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:foto-selecionada'),
      revokeObjectURL: vi.fn(),
    });
    localStorage.clear();
    sessionStorage.clear();
    atualizarPerfilFuncionario.mockResolvedValue({
      ...user,
      nome: 'Ana Souza Atualizada',
    });
    uploadFotoPerfilFuncionario.mockResolvedValue({
      ...user,
      foto_perfil_url: 'https://storage.exemplo.com/perfil.png',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mostra os dados cadastrados e mantém somente o e-mail como somente leitura', async () => {
    renderPerfil();

    expect(await screen.findByDisplayValue('Ana Souza')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@exemplo.com');
    expect(screen.getByLabelText('E-mail')).toBeDisabled();
    expect(screen.getByLabelText('Área de atuação')).toHaveValue('4');
    expect(screen.getByLabelText('Área de atuação')).not.toBeDisabled();
    expect(screen.getAllByText('Direito Civil')).toHaveLength(2);
    expect(screen.queryByLabelText(/telefone/i)).not.toBeInTheDocument();
    expect(screen.getByText('Advogada')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('salva nome e OAB e atualiza os dados da sessão', async () => {
    renderPerfil();
    fireEvent.change(await screen.findByLabelText('Nome completo'), {
      target: { value: 'Ana Souza Atualizada' },
    });

    submitForm();

    await screen.findByRole('status');
    expect(atualizarPerfilFuncionario).toHaveBeenCalledWith({
      nome: 'Ana Souza Atualizada',
      uf_oab: 'DF',
      numero_oab: '12345',
      atuacao_id: 4,
    });
    expect(updateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Ana Souza Atualizada',
        atuacao_id: 4,
      })
    );
  });

  it('limpa o registro da OAB quando os dois campos ficam vazios', async () => {
    renderPerfil();
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

  it('inicia sem área definida quando não há área no cadastro', async () => {
    renderPerfil({ ...user, atuacao_id: null });

    expect(await screen.findByLabelText('Área de atuação')).toHaveValue('');
    expect(
      screen.getByRole('option', { name: 'Selecione uma área' })
    ).toBeInTheDocument();
  });

  it('salva uma área escolhida pelo funcionário', async () => {
    atualizarPerfilFuncionario.mockResolvedValueOnce({
      ...user,
      atuacao_id: 5,
    });
    renderPerfil({ ...user, atuacao_id: null });
    fireEvent.change(await screen.findByLabelText('Área de atuação'), {
      target: { value: '5' },
    });

    submitForm();

    await waitFor(() => {
      expect(atualizarPerfilFuncionario).toHaveBeenCalledWith(
        expect.objectContaining({ atuacao_id: 5 })
      );
    });
    expect(screen.getByLabelText('Área de atuação')).toHaveValue('5');
    expect(updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ atuacao_id: 5 })
    );
  });

  it('não envia um nome vazio', async () => {
    renderPerfil();
    fireEvent.change(await screen.findByLabelText('Nome completo'), {
      target: { value: '   ' },
    });

    submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Informe seu nome completo.'
    );
    expect(atualizarPerfilFuncionario).not.toHaveBeenCalled();
  });

  it('valida o formato da OAB antes de enviar', async () => {
    renderPerfil();
    fireEvent.change(await screen.findByLabelText('Número OAB'), {
      target: { value: '123' },
    });

    submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Informe a UF e os 5 dígitos da sua OAB.'
    );
    expect(atualizarPerfilFuncionario).not.toHaveBeenCalled();
  });

  it('não altera senha se os campos de confirmação não coincidirem', async () => {
    renderPerfil();
    fireEvent.change(await screen.findByLabelText('Senha atual'), {
      target: { value: 'senha-atual' },
    });
    fireEvent.change(screen.getByLabelText('Nova senha'), {
      target: { value: 'senha-nova-segura' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), {
      target: { value: 'senha-diferente' },
    });

    submitForm();

    expect(
      await screen.findByText('A nova senha e a confirmação não conferem.')
    ).toBeInTheDocument();
    expect(atualizarPerfilFuncionario).not.toHaveBeenCalled();
  });

  it('confirma a senha atual e envia a nova senha', async () => {
    renderPerfil();
    fireEvent.change(await screen.findByLabelText('Senha atual'), {
      target: { value: 'senha-atual-segura' },
    });
    fireEvent.change(screen.getByLabelText('Nova senha'), {
      target: { value: 'senha-nova-segura' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), {
      target: { value: 'senha-nova-segura' },
    });

    submitForm();

    await waitFor(() => {
      expect(atualizarPerfilFuncionario).toHaveBeenCalledWith({
        nome: 'Ana Souza',
        uf_oab: 'DF',
        numero_oab: '12345',
        atuacao_id: 4,
        senha_atual: 'senha-atual-segura',
        nova_senha: 'senha-nova-segura',
        confirmar_nova_senha: 'senha-nova-segura',
      });
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Suas informações foram atualizadas com sucesso!'
    );
  });

  it('mostra erros retornados pela API sem indicar sucesso', async () => {
    atualizarPerfilFuncionario.mockRejectedValueOnce(
      new Error('Não foi possível salvar.')
    );
    renderPerfil();
    submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível salvar.'
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('mantém a foto selecionada sem enviar até salvar as alterações', async () => {
    renderPerfil();
    const file = new File(['imagem'], 'perfil.png', { type: 'image/png' });
    fireEvent.change(
      await screen.findByLabelText('Selecionar foto de perfil'),
      {
        target: { files: [file] },
      }
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Foto selecionada/ })
    ).toBeVisible();
    expect(uploadFotoPerfilFuncionario).not.toHaveBeenCalled();

    submitForm();

    await screen.findByRole('status');
    expect(uploadFotoPerfilFuncionario).toHaveBeenCalledWith(file);
    expect(updateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        foto_perfil_url: 'https://storage.exemplo.com/perfil.png',
      })
    );
  });

  it('mostra a foto de perfil da API no card do perfil', async () => {
    renderPerfil({
      ...user,
      foto_perfil_url: 'https://storage.exemplo.com/perfil-existente.png',
    });

    expect(await screen.findByAltText('Foto de Ana Souza')).toHaveAttribute(
      'src',
      'https://storage.exemplo.com/perfil-existente.png'
    );
  });

  it('desabilita Salvar e mostra o indicador de carregamento durante o envio', async () => {
    let finishRequest;
    atualizarPerfilFuncionario.mockReturnValueOnce(
      new Promise((resolve) => {
        finishRequest = resolve;
      })
    );
    renderPerfil();

    submitForm();

    const saveButton = await screen.findByRole('button', { name: /Salvando/ });
    await waitFor(() => expect(saveButton).toBeDisabled());
    expect(
      screen.getByRole('status', { name: 'Carregando' })
    ).toBeInTheDocument();
    expect(saveButton).toHaveTextContent('Salvando');

    finishRequest({ ...user });
    await screen.findByText('Suas informações foram atualizadas com sucesso!');
  });

  it.each([
    [
      new File(['imagem'], 'perfil.gif', { type: 'image/gif' }),
      'Formato inválido. Selecione uma imagem JPG ou PNG.',
    ],
    [
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'perfil.png', {
        type: 'image/png',
      }),
      'A imagem excede o limite máximo de 5 MB.',
    ],
  ])('valida o arquivo de foto antes do envio', async (file, message) => {
    renderPerfil();
    fireEvent.change(
      await screen.findByLabelText('Selecionar foto de perfil'),
      {
        target: { files: [file] },
      }
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(uploadFotoPerfilFuncionario).not.toHaveBeenCalled();
  });

  it('permite cancelar e restaurar os dados não salvos', async () => {
    renderPerfil();
    fireEvent.change(await screen.findByLabelText('Nome completo'), {
      target: { value: 'Nome temporário' },
    });
    fireEvent.change(screen.getByLabelText('Selecionar foto de perfil'), {
      target: {
        files: [new File(['imagem'], 'perfil.png', { type: 'image/png' })],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByLabelText('Nome completo')).toHaveValue('Ana Souza');
    expect(atualizarPerfilFuncionario).not.toHaveBeenCalled();
    expect(uploadFotoPerfilFuncionario).not.toHaveBeenCalled();
  });

  it('informa quando não há dados de usuário na sessão', async () => {
    renderPerfil(null);

    await waitFor(() =>
      expect(routerReplaceMock).toHaveBeenCalledWith('/login')
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
