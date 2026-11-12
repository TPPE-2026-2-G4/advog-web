import { describe, expect, it } from 'vitest';
import {
  formatarDataCompleta,
  formatarDataRelativa,
  formatarBadgeContagem,
  isTipoNotificacao,
  normalizarNotificacao,
  resolverLinkDestino,
} from './notificacao';
import { TIPOS_NOTIFICACAO } from '@/constants/notificacoes';

describe('normalização de notificações', () => {
  it('reconhece os oito tipos previstos pela API', () => {
    expect(TIPOS_NOTIFICACAO).toHaveLength(8);
    expect(isTipoNotificacao('ATRASO')).toBe(true);
    expect(isTipoNotificacao('TIPO_NOVO')).toBe(false);
  });

  it('usa SISTEMA como fallback para tipos desconhecidos', () => {
    expect(
      normalizarNotificacao({ tipo: 'TIPO_NOVO', link_destino: 42 })
    ).toMatchObject({ tipo: 'SISTEMA', link_destino: null });
  });

  it('aceita somente destinos internos', () => {
    expect(resolverLinkDestino('/processos/123')).toBe('/processos/123');
    expect(resolverLinkDestino('//exemplo.com')).toBeNull();
    expect(resolverLinkDestino('/\\exemplo.com')).toBeNull();
    expect(resolverLinkDestino('https://exemplo.com')).toBeNull();
    expect(resolverLinkDestino('javascript:alert(1)')).toBeNull();
    expect(resolverLinkDestino('')).toBeNull();
    expect(resolverLinkDestino(null)).toBeNull();
  });

  it.each([
    [0, ''],
    [1, '1'],
    [99, '99'],
    [100, '99+'],
    ['invalido', ''],
  ])('formata o badge %s como %s', (total, esperado) => {
    expect(formatarBadgeContagem(total)).toBe(esperado);
  });

  it('formata datas relativas e completas', () => {
    const agora = new Date('2026-11-11T12:00:00Z');

    expect(formatarDataRelativa('2026-11-11T11:57:00Z', agora)).toBe(
      'há 3 minutos'
    );
    expect(formatarDataCompleta('invalida')).toBe('Data desconhecida');
  });
});
