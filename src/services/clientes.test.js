import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken } from '@/utils/authSession';
import { listarClientes } from './clientes';

vi.mock('@/utils/authSession', () => ({ getAccessToken: vi.fn() }));

describe('serviço de clientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    getAccessToken.mockReturnValue('token-jwt');
  });

  it('lista clientes usando a sessão autenticada', async () => {
    const clientes = [{ cliente_id: 10, nome: 'Maria Silva' }];
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(clientes),
    });

    await expect(listarClientes()).resolves.toEqual(clientes);
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/clientes/', {
      cache: 'no-store',
      headers: { Authorization: 'Bearer token-jwt' },
    });
  });

  it('rejeita a chamada quando a sessão expirou', async () => {
    getAccessToken.mockReturnValue(null);
    await expect(listarClientes()).rejects.toThrow(
      'Sessão expirada. Faça login novamente.'
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('trata respostas inválidas e falhas da API', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({}),
    });
    await expect(listarClientes()).resolves.toEqual([]);

    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    await expect(listarClientes()).rejects.toThrow(
      'Não foi possível carregar os clientes.'
    );
  });
});
