import { describe, expect, it } from 'vitest';
import { montarRegra, opcoesRecorrencia } from './recorrencia';

describe('regras de recorrência', () => {
  it('deriva o dia semanal, a posição mensal e a data anual do vencimento', () => {
    const opcoes = opcoesRecorrencia('2027-01-12');
    expect(opcoes.find((o) => o.value === 'weekly').rule).toBe(
      'FREQ=WEEKLY;BYDAY=TU'
    );
    expect(opcoes.find((o) => o.value === 'monthlyWeekday')).toMatchObject({
      label: 'Mensalmente: na segunda terça-feira',
      rule: 'FREQ=MONTHLY;BYDAY=TU;BYSETPOS=2',
    });
    expect(opcoes.find((o) => o.value === 'yearly').rule).toBe(
      'FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=12'
    );
  });

  it('usa -1 para último dia e última ocorrência do dia da semana', () => {
    const opcoes = opcoesRecorrencia('2027-01-31');
    expect(opcoes.find((o) => o.value === 'monthlyDay').rule).toBe(
      'FREQ=MONTHLY;BYMONTHDAY=-1'
    );
    expect(opcoes.find((o) => o.value === 'monthlyWeekday').rule).toBe(
      'FREQ=MONTHLY;BYDAY=SU;BYSETPOS=-1'
    );
  });

  it.each([
    [
      {
        unidade: 'WEEKLY',
        intervalo: 2,
        dias: ['MO', 'WE'],
        termina: 'count',
        quantidade: 12,
      },
      'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=12',
    ],
    [
      { unidade: 'DAILY', intervalo: 3, termina: 'date', fim: '2027-06-30' },
      'FREQ=DAILY;INTERVAL=3;UNTIL=20270630T235959',
    ],
    [
      {
        unidade: 'MONTHLY',
        intervalo: 2,
        mensal: 'monthlyDay',
        termina: 'never',
      },
      'FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=-1',
    ],
  ])('monta a regra personalizada %j', (config, regra) => {
    expect(montarRegra(config, '2027-01-31')).toBe(regra);
  });
});
