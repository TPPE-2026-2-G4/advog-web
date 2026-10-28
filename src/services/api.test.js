import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('configuração da API (API_URL)', () => {
  const envOriginal = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...envOriginal };
  });

  afterEach(() => {
    process.env = envOriginal;
  });

  it.each([
    {
      cenario: 'NEXT_PUBLIC_API_URL está definida (prioridade máxima)',
      nextPublicApiUrl: 'https://api.exemplo.com',
      apiUrl: 'https://api-ignorada.exemplo.com',
      esperado: 'https://api.exemplo.com',
    },
    {
      cenario: 'apenas API_URL está definida (fallback secundário)',
      nextPublicApiUrl: undefined,
      apiUrl: 'https://api-servidor.exemplo.com',
      esperado: 'https://api-servidor.exemplo.com',
    },
    {
      cenario: 'nenhuma variável de ambiente está definida (fallback local)',
      nextPublicApiUrl: undefined,
      apiUrl: undefined,
      esperado: 'http://localhost:8000',
    },
  ])(
    'resolve API_URL como "$esperado" quando $cenario',
    async ({ nextPublicApiUrl, apiUrl, esperado }) => {
      if (nextPublicApiUrl !== undefined) {
        process.env.NEXT_PUBLIC_API_URL = nextPublicApiUrl;
      } else {
        delete process.env.NEXT_PUBLIC_API_URL;
      }

      if (apiUrl !== undefined) {
        process.env.API_URL = apiUrl;
      } else {
        delete process.env.API_URL;
      }

      const { API_URL } = await import('./api');
      expect(API_URL).toBe(esperado);
    }
  );
});
