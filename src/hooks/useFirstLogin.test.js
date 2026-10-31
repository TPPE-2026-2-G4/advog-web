import { createElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFirstLogin } from './useFirstLogin';

const { firstLoginMock, getTokenMock, pushMock } = vi.hoisted(() => ({
  firstLoginMock: vi.fn(),
  getTokenMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock('@/services/auth', () => ({
  firstLogin: firstLoginMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: getTokenMock }),
}));

function FirstLoginConsumer() {
  const firstLogin = useFirstLogin();
  const field = (label, value, setValue) =>
    createElement('input', {
      'aria-label': label,
      value,
      onChange: (event) => setValue(event.target.value),
    });

  return createElement(
    'form',
    { onSubmit: firstLogin.handleSubmit },
    field('nome', firstLogin.nome, firstLogin.setNome),
    field('senha', firstLogin.senha, firstLogin.setSenha),
    field(
      'confirmar senha',
      firstLogin.confirmarSenha,
      firstLogin.setConfirmarSenha
    ),
    field('uf', firstLogin.uf, firstLogin.setUf),
    field('numero OAB', firstLogin.numeroOab, firstLogin.setNumeroOab),
    createElement('input', {
      'aria-label': 'sem OAB',
      type: 'checkbox',
      checked: firstLogin.semOab,
      onChange: (event) => firstLogin.setSemOab(event.target.checked),
    }),
    createElement('output', { 'data-testid': 'erro' }, firstLogin.erro),
    createElement('button', { type: 'submit' }, 'Concluir')
  );
}

describe('useFirstLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTokenMock.mockReturnValue('token-de-acesso');
  });

  it.each([
    { label: 'nome', value: 'Maria Souza' },
    { label: 'senha', value: 'senha-segura' },
    { label: 'confirmar senha', value: 'senha-segura' },
    { label: 'uf', value: 'DF' },
    { label: 'numero OAB', value: '123456' },
  ])('inicia vazio e atualiza o campo "$label"', ({ label, value }) => {
    render(createElement(FirstLoginConsumer));

    const input = screen.getByLabelText(label);
    expect(input).toHaveValue('');

    fireEvent.change(input, { target: { value } });
    expect(input).toHaveValue(value);
  });

  it.each([
    {
      cenario: 'o token de primeiro acesso está ausente',
      token: null,
      senha: 'senha-1',
      confirmarSenha: 'senha-1',
      mensagemEsperada:
        'Token de primeiro acesso ausente ou inválido. Acesse através do link recebido por e-mail.',
    },
    {
      cenario: 'as senhas não conferem',
      token: 'token-de-acesso',
      senha: 'senha-1',
      confirmarSenha: 'senha-2',
      mensagemEsperada: 'As senhas não conferem.',
    },
  ])(
    'impede o envio quando $cenario',
    async ({ token, senha, confirmarSenha, mensagemEsperada }) => {
      getTokenMock.mockReturnValue(token);
      render(createElement(FirstLoginConsumer));

      fireEvent.change(screen.getByLabelText('senha'), {
        target: { value: senha },
      });
      fireEvent.change(screen.getByLabelText('confirmar senha'), {
        target: { value: confirmarSenha },
      });
      fireEvent.submit(screen.getByRole('button', { name: 'Concluir' }));

      expect(await screen.findByTestId('erro')).toHaveTextContent(
        mensagemEsperada
      );
      expect(firstLoginMock).not.toHaveBeenCalled();
    }
  );

  it.each([
    {
      cenario: 'com dados da OAB',
      semOab: false,
      payloadEsperado: {
        token: 'token-de-acesso',
        nome: 'Maria Souza',
        senha: 'senha-segura',
        uf: 'DF',
        numeroOab: '123456',
      },
    },
    {
      cenario: 'marcando a opção sem OAB',
      semOab: true,
      payloadEsperado: {
        token: 'token-de-acesso',
        nome: 'Maria Souza',
        senha: 'senha-segura',
      },
    },
  ])(
    'conclui o cadastro ($cenario) e redireciona para login',
    async ({ semOab, payloadEsperado }) => {
      firstLoginMock.mockResolvedValueOnce({ success: true });
      render(createElement(FirstLoginConsumer));

      fireEvent.change(screen.getByLabelText('nome'), {
        target: { value: 'Maria Souza' },
      });
      fireEvent.change(screen.getByLabelText('senha'), {
        target: { value: 'senha-segura' },
      });
      fireEvent.change(screen.getByLabelText('confirmar senha'), {
        target: { value: 'senha-segura' },
      });
      fireEvent.change(screen.getByLabelText('uf'), {
        target: { value: 'DF' },
      });
      fireEvent.change(screen.getByLabelText('numero OAB'), {
        target: { value: '123456' },
      });
      if (semOab) {
        fireEvent.click(screen.getByLabelText('sem OAB'));
      }
      fireEvent.submit(screen.getByRole('button', { name: 'Concluir' }));

      await waitFor(() => {
        expect(firstLoginMock).toHaveBeenCalledWith(payloadEsperado);
        expect(pushMock).toHaveBeenCalledWith('/login?cadastro=sucesso');
      });
    }
  );

  it('ignora uma segunda submissão enquanto o cadastro está em andamento', async () => {
    let resolveFirstLogin;
    firstLoginMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirstLogin = resolve;
      })
    );
    render(createElement(FirstLoginConsumer));

    fireEvent.change(screen.getByLabelText('senha'), {
      target: { value: 'senha' },
    });
    fireEvent.change(screen.getByLabelText('confirmar senha'), {
      target: { value: 'senha' },
    });
    const submitButton = screen.getByRole('button', { name: 'Concluir' });

    fireEvent.submit(submitButton);
    fireEvent.submit(submitButton);

    expect(firstLoginMock).toHaveBeenCalledTimes(1);
    resolveFirstLogin({ success: true });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login?cadastro=sucesso');
    });
  });

  it.each([
    {
      cenario: 'instância de Error retornada pelo serviço',
      rejeicao: new Error('Cadastro inválido'),
      mensagemEsperada: 'Cadastro inválido',
    },
    {
      cenario: 'rejeição que não é um Error',
      rejeicao: 'falha',
      mensagemEsperada: 'Não foi possível concluir o cadastro.',
    },
  ])(
    'exibe a mensagem adequada em caso de falha ($cenario)',
    async ({ rejeicao, mensagemEsperada }) => {
      firstLoginMock.mockRejectedValueOnce(rejeicao);
      render(createElement(FirstLoginConsumer));

      fireEvent.change(screen.getByLabelText('senha'), {
        target: { value: 'senha' },
      });
      fireEvent.change(screen.getByLabelText('confirmar senha'), {
        target: { value: 'senha' },
      });
      fireEvent.submit(screen.getByRole('button', { name: 'Concluir' }));

      expect(await screen.findByTestId('erro')).toHaveTextContent(
        mensagemEsperada
      );
    }
  );
});
