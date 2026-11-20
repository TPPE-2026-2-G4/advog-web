import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  gravarConfigAlertasLocal,
  obterConfigAlertas,
  salvarConfigAlertas,
  sincronizarConfigAlertas,
} from './alertas';
import {
  ALERTAS_CONFIG_EVENT,
  SYSTEM_PREF_KEYS,
} from '@/constants/preferencias';
import { getAccessToken } from '@/utils/authSession';

vi.mock('@/utils/authSession', () => ({ getAccessToken: vi.fn() }));

const resposta = (corpo, ok = true, status = 200) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(corpo),
});

describe('serviço de alertas', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.clear();
    getAccessToken.mockReturnValue('token-123');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('grava a configuração no navegador e avisa as telas abertas', () => {
    const ouvinte = vi.fn();
    window.addEventListener(ALERTAS_CONFIG_EVENT, ouvinte);

    gravarConfigAlertasLocal({
      dias_prazo_proximo: 30,
      dias_processo_critico: 45,
    });

    expect(localStorage.getItem(SYSTEM_PREF_KEYS.DIAS_PRAZO)).toBe('30');
    expect(localStorage.getItem(SYSTEM_PREF_KEYS.DIAS_CRITICO)).toBe('45');
    expect(ouvinte).toHaveBeenCalledOnce();
    window.removeEventListener(ALERTAS_CONFIG_EVENT, ouvinte);
  });

  it('obterConfigAlertas lê do servidor com o token', async () => {
    fetch.mockResolvedValue(
      resposta({ dias_prazo_proximo: 7, dias_processo_critico: 20 })
    );

    const config = await obterConfigAlertas();

    expect(config).toEqual({
      dias_prazo_proximo: 7,
      dias_processo_critico: 20,
    });
    const [url, opcoes] = fetch.mock.calls[0];
    expect(url).toMatch(/\/institucional\/alertas$/);
    expect(opcoes.headers.Authorization).toBe('Bearer token-123');
  });

  it('salvarConfigAlertas envia números, grava no navegador e devolve o salvo', async () => {
    fetch.mockResolvedValue(
      resposta({ dias_prazo_proximo: 60, dias_processo_critico: 90 })
    );

    const config = await salvarConfigAlertas({
      diasPrazoProximo: '60',
      diasProcessoCritico: '90',
    });

    const [, opcoes] = fetch.mock.calls[0];
    expect(opcoes.method).toBe('PATCH');
    expect(JSON.parse(opcoes.body)).toEqual({
      dias_prazo_proximo: 60,
      dias_processo_critico: 90,
    });
    expect(config.dias_prazo_proximo).toBe(60);
    expect(localStorage.getItem(SYSTEM_PREF_KEYS.DIAS_CRITICO)).toBe('90');
  });

  it.each([
    [{ detail: 'Sem permissão' }, 'Sem permissão'],
    [
      { detail: [{ msg: 'A antecedência deve ser 7, 15, 30 ou 60' }] },
      'A antecedência deve ser 7, 15, 30 ou 60',
    ],
    [{}, 'Não foi possível salvar a configuração de alertas.'],
  ])('mostra o motivo quando salvar falha (%j)', async (corpo, esperado) => {
    fetch.mockResolvedValue(resposta(corpo, false, 403));

    await expect(
      salvarConfigAlertas({ diasPrazoProximo: 7, diasProcessoCritico: 7 })
    ).rejects.toThrow(esperado);
    expect(localStorage.getItem(SYSTEM_PREF_KEYS.DIAS_PRAZO)).toBeNull();
  });

  it('obterConfigAlertas lança erro quando o servidor recusa', async () => {
    fetch.mockResolvedValue(resposta({}, false, 500));

    await expect(obterConfigAlertas()).rejects.toThrow(
      'Não foi possível carregar a configuração de alertas.'
    );
  });

  it('sincronizar grava o valor do servidor e é silencioso quando falha', async () => {
    fetch.mockResolvedValueOnce(
      resposta({ dias_prazo_proximo: 30, dias_processo_critico: 12 })
    );
    expect(await sincronizarConfigAlertas()).toEqual({
      dias_prazo_proximo: 30,
      dias_processo_critico: 12,
    });
    expect(localStorage.getItem(SYSTEM_PREF_KEYS.DIAS_CRITICO)).toBe('12');

    fetch.mockRejectedValueOnce(new Error('offline'));
    expect(await sincronizarConfigAlertas()).toBeNull();
    expect(localStorage.getItem(SYSTEM_PREF_KEYS.DIAS_CRITICO)).toBe('12');
  });
});
