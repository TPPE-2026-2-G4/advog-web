import { describe, expect, it } from 'vitest';
import {
  BORDA_URGENCIA,
  ROTULO_URGENCIA,
  notificacoesKeys,
  obterConfigTipo,
} from './notificacoes';

describe('Integração: catálogo de notificações', () => {
  it('expõe chaves e estilos de urgência consistentes', () => {
    expect(notificacoesKeys.all).toEqual(['notificacoes']);
    expect(notificacoesKeys.contagem()).toEqual(['notificacoes', 'contagem']);
    expect(notificacoesKeys.listas()).toEqual(['notificacoes', 'lista']);
    expect(notificacoesKeys.lista({ tipo: 'ATRASO' })).toEqual([
      'notificacoes',
      'lista',
      { tipo: 'ATRASO' },
    ]);
    expect(BORDA_URGENCIA).toMatchObject({
      urgente: expect.any(String),
      importante: expect.any(String),
      atencao: expect.any(String),
      info: expect.any(String),
    });
    expect(ROTULO_URGENCIA).toMatchObject({
      urgente: 'Urgente',
      importante: 'Importante',
      atencao: 'Atenção',
      info: '',
    });
  });

  it('configura todos os tipos e faz fallback desconhecido', () => {
    const tipos = [
      'ATRASO',
      'VENCIMENTO_HOJE',
      'VENCIMENTO_1D',
      'VENCIMENTO_7D',
      'ATRIBUICAO',
      'NOVO_CLIENTE',
      'STATUS_PROCESSO',
      'SISTEMA',
    ];

    for (const tipo of tipos) {
      expect(obterConfigTipo(tipo)).toMatchObject({
        label: expect.any(String),
        icone: expect.anything(),
        urgencia: expect.any(String),
        corTexto: expect.any(String),
        corBgIcone: expect.any(String),
      });
    }
    expect(obterConfigTipo('DESCONHECIDO')).toBe(obterConfigTipo('SISTEMA'));
  });
});
