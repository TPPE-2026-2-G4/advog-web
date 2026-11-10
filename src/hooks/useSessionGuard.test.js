import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { API_URL } from '@/services/api';
import { SESSION_EXPIRED_URL, useSessionGuard } from './useSessionGuard';

const { mockReplace, mockLogout } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockLogout: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

const toBase64Url = (value) =>
  btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const createJwt = (payload) =>
  `header.${toBase64Url(JSON.stringify(payload))}.signature`;

const tokenExpiringIn = (seconds) =>
  createJwt({ sub: '1', exp: Math.floor(Date.now() / 1000) + seconds });

const NOW = Date.parse('2026-11-09T12:00:00.000Z');

describe('useSessionGuard', () => {
  let originalFetch;
  let apiFetch;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    originalFetch = window.fetch;
    apiFetch = vi.fn().mockResolvedValue({ status: 200 });
    window.fetch = apiFetch;
  });

  afterEach(() => {
    window.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('expõe a URL de login com o aviso de sessão expirada', () => {
    expect(SESSION_EXPIRED_URL).toBe('/login?sessao=expirada');
  });

  it('encerra a sessão e redireciona ao login quando não há token', () => {
    renderHook(() => useSessionGuard());

    expect(mockLogout).toHaveBeenCalledOnce();
    expect(mockReplace).toHaveBeenCalledWith('/login?sessao=expirada');
  });

  it('encerra a sessão e redireciona ao login quando o token já expirou', () => {
    sessionStorage.setItem('access_token', tokenExpiringIn(-30));

    renderHook(() => useSessionGuard());

    expect(mockLogout).toHaveBeenCalledOnce();
    expect(mockReplace).toHaveBeenCalledWith('/login?sessao=expirada');
  });

  it('mantém a sessão quando o token ainda é válido', () => {
    sessionStorage.setItem('access_token', tokenExpiringIn(600));

    renderHook(() => useSessionGuard());

    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('agenda o encerramento da sessão para o momento exato da expiração do token', () => {
    sessionStorage.setItem('access_token', tokenExpiringIn(60));

    renderHook(() => useSessionGuard());

    vi.advanceTimersByTime(59_000);
    expect(mockReplace).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2_000);
    expect(mockLogout).toHaveBeenCalledOnce();
    expect(mockReplace).toHaveBeenCalledWith('/login?sessao=expirada');
  });

  it('não agenda expiração para token válido sem campo exp', () => {
    sessionStorage.setItem('access_token', createJwt({ sub: '1' }));

    renderHook(() => useSessionGuard());

    // se algum timer tivesse sido agendado, ele detectaria o token expirado abaixo
    sessionStorage.setItem('access_token', tokenExpiringIn(-1));
    vi.advanceTimersByTime(7 * 24 * 60 * 60 * 1000);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('limita o agendamento para expirações muito distantes sem estourar o timer', () => {
    sessionStorage.setItem('access_token', tokenExpiringIn(60 * 60 * 24 * 100));

    renderHook(() => useSessionGuard());

    vi.advanceTimersByTime(2 ** 31 - 1);
    expect(mockReplace).not.toHaveBeenCalled();

    // o guard reagendou a checagem em vez de estourar o limite do setTimeout
    sessionStorage.setItem('access_token', tokenExpiringIn(-1));
    vi.advanceTimersByTime(2 ** 31 - 1);
    expect(mockReplace).toHaveBeenCalledWith('/login?sessao=expirada');
  });

  it('revalida a sessão ao voltar o foco para a janela', () => {
    sessionStorage.setItem('access_token', tokenExpiringIn(600));
    renderHook(() => useSessionGuard());
    expect(mockReplace).not.toHaveBeenCalled();

    sessionStorage.setItem('access_token', tokenExpiringIn(-1));
    window.dispatchEvent(new Event('focus'));

    expect(mockLogout).toHaveBeenCalledOnce();
    expect(mockReplace).toHaveBeenCalledWith('/login?sessao=expirada');
  });

  it('revalida a sessão quando a aba volta a ficar visível e ignora quando está oculta', () => {
    sessionStorage.setItem('access_token', tokenExpiringIn(600));
    renderHook(() => useSessionGuard());
    sessionStorage.setItem('access_token', tokenExpiringIn(-1));

    const visibility = vi.spyOn(document, 'visibilityState', 'get');

    visibility.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(mockReplace).not.toHaveBeenCalled();

    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(mockReplace).toHaveBeenCalledWith('/login?sessao=expirada');
  });

  it('encerra a sessão quando a API responde 401 e devolve a resposta original', async () => {
    sessionStorage.setItem('access_token', tokenExpiringIn(600));
    const response = { status: 401 };
    apiFetch.mockResolvedValue(response);
    renderHook(() => useSessionGuard());

    await expect(window.fetch(`${API_URL}/processos/`)).resolves.toBe(response);

    expect(mockLogout).toHaveBeenCalledOnce();
    expect(mockReplace).toHaveBeenCalledWith('/login?sessao=expirada');
  });

  it('identifica requisições da API feitas com objeto Request', async () => {
    sessionStorage.setItem('access_token', tokenExpiringIn(600));
    apiFetch.mockResolvedValue({ status: 401 });
    renderHook(() => useSessionGuard());

    await window.fetch({ url: `${API_URL}/clientes/` });

    expect(mockReplace).toHaveBeenCalledWith('/login?sessao=expirada');
  });

  it('identifica requisições da API feitas com URL não textual', async () => {
    sessionStorage.setItem('access_token', tokenExpiringIn(600));
    apiFetch.mockResolvedValue({ status: 401 });
    renderHook(() => useSessionGuard());

    await window.fetch(new URL(`${API_URL}/clientes/`));

    expect(mockReplace).toHaveBeenCalledWith('/login?sessao=expirada');
  });

  it.each([
    { cenario: 'resposta 403 da API', status: 403, url: `${API_URL}/x` },
    { cenario: 'resposta 200 da API', status: 200, url: `${API_URL}/x` },
    {
      cenario: '401 de um serviço externo',
      status: 401,
      url: 'https://servico-externo.test/x',
    },
  ])('não encerra a sessão para $cenario', async ({ status, url }) => {
    sessionStorage.setItem('access_token', tokenExpiringIn(600));
    apiFetch.mockResolvedValue({ status });
    renderHook(() => useSessionGuard());

    await window.fetch(url);

    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('encerra a sessão apenas uma vez mesmo com várias respostas 401 simultâneas', async () => {
    sessionStorage.setItem('access_token', tokenExpiringIn(600));
    apiFetch.mockResolvedValue({ status: 401 });
    renderHook(() => useSessionGuard());

    await Promise.all([
      window.fetch(`${API_URL}/a`),
      window.fetch(`${API_URL}/b`),
      window.fetch(`${API_URL}/c`),
    ]);
    window.dispatchEvent(new Event('focus'));

    expect(mockLogout).toHaveBeenCalledOnce();
    expect(mockReplace).toHaveBeenCalledOnce();
  });

  it('remove os listeners, o timer e restaura o fetch original ao desmontar', () => {
    sessionStorage.setItem('access_token', tokenExpiringIn(60));
    const { unmount } = renderHook(() => useSessionGuard());
    expect(window.fetch).not.toBe(apiFetch);

    unmount();

    expect(window.fetch).toBe(apiFetch);

    sessionStorage.setItem('access_token', tokenExpiringIn(-1));
    window.dispatchEvent(new Event('focus'));
    vi.advanceTimersByTime(120_000);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('não sobrescreve o fetch quando outro código o substituiu depois do guard', () => {
    sessionStorage.setItem('access_token', tokenExpiringIn(600));
    const { unmount } = renderHook(() => useSessionGuard());
    const replacement = vi.fn();
    window.fetch = replacement;

    unmount();

    expect(window.fetch).toBe(replacement);
  });
});
