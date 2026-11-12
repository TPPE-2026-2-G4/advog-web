import { describe, expect, it } from 'vitest';
import { obterConfigTipo } from './notificacoes';

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
});
