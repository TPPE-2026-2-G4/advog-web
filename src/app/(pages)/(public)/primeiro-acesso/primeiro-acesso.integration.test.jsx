import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

const { apiUrl, mockPush, mockGetSearchParam } = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
  return {
    apiUrl: 'http://localhost:8000',
    mockPush: vi.fn(),
    mockGetSearchParam: vi.fn(),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGetSearchParam }),
}));

import FirstLoginPage from './page';

describe('Integração: Primeiro Acesso (FirstLoginPage + useFirstLogin + services/auth + fetch)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSearchParam.mockReturnValue('token-convite-valido');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    {
      perfil: 'advogado(a) com OAB',
      semOab: false,
      uf: 'DF',
      numeroOab: '54321',
      expectedBody: {
        token: 'token-convite-valido',
        nome: 'Dr. Bruno Cavalcanti',
        senha: 'SenhaForte@123',
        uf_oab: 'DF',
        numero_oab: '54321',
      },
    },
    {
      perfil: 'estagiário(a) sem OAB',
      semOab: true,
      uf: '',
      numeroOab: '',
      expectedBody: {
        token: 'token-convite-valido',
        nome: 'Dr. Bruno Cavalcanti',
        senha: 'SenhaForte@123',
        uf_oab: undefined,
        numero_oab: undefined,
      },
    },
  ])(
    'envia PATCH /funcionarios/primeiro-acesso para $perfil e redireciona para o login com aviso de sucesso',
    async ({ semOab, uf, numeroOab, expectedBody }) => {
      let resolveFetch;
      fetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      );

      render(<FirstLoginPage />);

      fireEvent.change(screen.getByLabelText('Nome completo'), {
        target: { value: 'Dr. Bruno Cavalcanti' },
      });
      fireEvent.change(screen.getByLabelText('Senha'), {
        target: { value: 'SenhaForte@123' },
      });
      fireEvent.change(screen.getByLabelText('Confirmar senha'), {
        target: { value: 'SenhaForte@123' },
      });

      if (semOab) {
        fireEvent.click(
          screen.getByRole('checkbox', {
            name: 'Sou estagiário(a) / ainda não possuo OAB',
          })
        );
      } else {
        fireEvent.change(screen.getByLabelText('UF da OAB'), {
          target: { value: uf },
        });
        fireEvent.change(screen.getByLabelText('Número da OAB'), {
          target: { value: numeroOab },
        });
      }

      const submitBtn = screen.getByRole('button', {
        name: 'Concluir cadastro',
      });
      fireEvent.click(submitBtn);

      expect(submitBtn).toBeDisabled();
      expect(
        screen.getByRole('status', { name: 'Carregando' })
      ).toBeInTheDocument();

      expect(fetch).toHaveBeenCalledOnce();
      expect(fetch).toHaveBeenCalledWith(
        `${apiUrl}/funcionarios/primeiro-acesso`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expectedBody),
        }
      );

      await act(async () => {
        resolveFetch({
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?cadastro=sucesso');
      });
    }
  );

  it.each([
    {
      cenario: 'erro de validação 422 do Pydantic em numero_oab e uf_oab',
      status: 422,
      payload: {
        detail: [
          { loc: ['body', 'numero_oab'], msg: 'Invalid length' },
          { loc: ['body', 'uf_oab'], msg: 'Invalid state' },
        ],
      },
      mensagemEsperada:
        'Número da OAB deve conter exatamente 5 dígitos. UF da OAB deve conter 2 letras.',
    },
    {
      cenario: 'erro 400 de token expirado',
      status: 400,
      payload: { detail: 'O link de primeiro acesso expirou.' },
      mensagemEsperada: 'O link de primeiro acesso expirou.',
    },
    {
      cenario: 'erro 500 inesperado sem corpo detalhado',
      status: 500,
      payload: {},
      mensagemEsperada: 'Não foi possível concluir o cadastro.',
    },
  ])(
    'traduz e exibe erro da API na tela quando PATCH /funcionarios/primeiro-acesso retorna $cenario',
    async ({ status, payload, mensagemEsperada }) => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status,
        json: async () => payload,
      });

      render(<FirstLoginPage />);

      fireEvent.change(screen.getByLabelText('Nome completo'), {
        target: { value: 'Maria Souza Lima' },
      });
      fireEvent.change(screen.getByLabelText('Senha'), {
        target: { value: 'SenhaForte@123' },
      });
      fireEvent.change(screen.getByLabelText('Confirmar senha'), {
        target: { value: 'SenhaForte@123' },
      });
      fireEvent.change(screen.getByLabelText('UF da OAB'), {
        target: { value: 'DF' },
      });
      fireEvent.change(screen.getByLabelText('Número da OAB'), {
        target: { value: '12345' },
      });

      fireEvent.click(
        screen.getByRole('button', { name: 'Concluir cadastro' })
      );

      expect(await screen.findByText(mensagemEsperada)).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    }
  );
});
