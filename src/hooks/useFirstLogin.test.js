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
    createElement('output', { 'data-testid': 'erro' }, firstLogin.erro),
    createElement('button', { type: 'submit' }, 'Concluir')
  );
}

describe('useFirstLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTokenMock.mockReturnValue('token-de-acesso');
  });

  it('inicia vazio e atualiza todos os campos', () => {
    render(createElement(FirstLoginConsumer));

    const values = [
      ['nome', 'Maria Souza'],
      ['senha', 'senha-segura'],
      ['confirmar senha', 'senha-segura'],
      ['uf', 'DF'],
      ['numero OAB', '123456'],
    ];

    values.forEach(([label, value]) => {
      const input = screen.getByLabelText(label);
      expect(input).toHaveValue('');
      fireEvent.change(input, { target: { value } });
      expect(input).toHaveValue(value);
    });
  });

  it('impede o envio quando as senhas não conferem', async () => {
    render(createElement(FirstLoginConsumer));

    fireEvent.change(screen.getByLabelText('senha'), {
      target: { value: 'senha-1' },
    });
    fireEvent.change(screen.getByLabelText('confirmar senha'), {
      target: { value: 'senha-2' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Concluir' }));

    expect(await screen.findByTestId('erro')).toHaveTextContent(
      'As senhas não conferem.'
    );
    expect(firstLoginMock).not.toHaveBeenCalled();
  });

  it('conclui o cadastro e redireciona para login', async () => {
    firstLoginMock.mockResolvedValueOnce({ success: true });
    render(createElement(FirstLoginConsumer));

    const fields = [
      ['nome', 'Maria Souza'],
      ['senha', 'senha-segura'],
      ['confirmar senha', 'senha-segura'],
      ['uf', 'DF'],
      ['numero OAB', '123456'],
    ];
    fields.forEach(([label, value]) => {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Concluir' }));

    await waitFor(() => {
      expect(firstLoginMock).toHaveBeenCalledWith({
        token: 'token-de-acesso',
        nome: 'Maria Souza',
        senha: 'senha-segura',
        uf: 'DF',
        numeroOab: '123456',
      });
      expect(pushMock).toHaveBeenCalledWith('/login?cadastro=sucesso');
    });
  });

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

  it('exibe a mensagem de erro retornada pelo serviço', async () => {
    firstLoginMock.mockRejectedValueOnce(new Error('Cadastro inválido'));
    render(createElement(FirstLoginConsumer));

    fireEvent.change(screen.getByLabelText('senha'), {
      target: { value: 'senha' },
    });
    fireEvent.change(screen.getByLabelText('confirmar senha'), {
      target: { value: 'senha' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Concluir' }));

    expect(await screen.findByTestId('erro')).toHaveTextContent(
      'Cadastro inválido'
    );
  });

  it('exibe a mensagem padrão para uma rejeição que não é um Error', async () => {
    firstLoginMock.mockRejectedValueOnce('falha');
    render(createElement(FirstLoginConsumer));

    fireEvent.change(screen.getByLabelText('senha'), {
      target: { value: 'senha' },
    });
    fireEvent.change(screen.getByLabelText('confirmar senha'), {
      target: { value: 'senha' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Concluir' }));

    expect(await screen.findByTestId('erro')).toHaveTextContent(
      'Não foi possível concluir o cadastro.'
    );
  });
});
