import { describe, expect, it } from 'vitest';
import { notificacoesKeys, obterConfigTipo } from './notificacoes';

describe('configuração visual de notificações', () => {
  it('deriva a hierarquia de urgência pelos tipos de vencimento', () => {
    expect(obterConfigTipo('ATRASO').urgencia).toBe('urgente');
    expect(obterConfigTipo('VENCIMENTO_HOJE').urgencia).toBe('urgente');
    expect(obterConfigTipo('VENCIMENTO_1D').urgencia).toBe('importante');
    expect(obterConfigTipo('VENCIMENTO_7D').urgencia).toBe('atencao');
    expect(obterConfigTipo('ATRIBUICAO').urgencia).toBe('info');
  });

  it('faz fallback visual para tipo desconhecido', () => {
    expect(obterConfigTipo('TIPO_NOVO')).toEqual(obterConfigTipo('SISTEMA'));
  });

  it('cria as chaves estáveis para consultas de notificações', () => {
    expect(notificacoesKeys.all).toEqual(['notificacoes']);
    expect(notificacoesKeys.contagem()).toEqual(['notificacoes', 'contagem']);
    expect(notificacoesKeys.listas()).toEqual(['notificacoes', 'lista']);
    expect(notificacoesKeys.lista({ apenasNaoLidas: true })).toEqual([
      'notificacoes',
      'lista',
      { apenasNaoLidas: true },
    ]);
  });
});
