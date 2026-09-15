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

  it('utiliza NEXT_PUBLIC_API_URL quando definida', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.exemplo.com';
    delete process.env.API_URL;

    const { API_URL } = await import('./api');
    expect(API_URL).toBe('https://api.exemplo.com');
  });

  it('utiliza API_URL quando NEXT_PUBLIC_API_URL não está definida', async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.API_URL = 'https://api-servidor.exemplo.com';

    const { API_URL } = await import('./api');
    expect(API_URL).toBe('https://api-servidor.exemplo.com');
  });

  it('utiliza o fallback http://localhost:8000 quando nenhuma variável está definida', async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.API_URL;

    const { API_URL } = await import('./api');
    expect(API_URL).toBe('http://localhost:8000');
  });
});
