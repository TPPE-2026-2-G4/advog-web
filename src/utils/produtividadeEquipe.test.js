import { describe, expect, it } from 'vitest';
import {
  EMPTY_TEAM_SUMMARY,
  formatarSumarioEquipe,
  obterProgressoEquipe,
  filtrarProdutividadeSemAdmin,
} from './produtividadeEquipe';

describe('utilitários de produtividade da equipe', () => {
  describe('formatarSumarioEquipe', () => {
    it.each([null, undefined])(
      'retorna os valores padrão quando o resumo é %s',
      (summary) => {
        expect(formatarSumarioEquipe(summary)).toEqual(EMPTY_TEAM_SUMMARY);
      }
    );

    it('preenche campos ausentes e converte valores numéricos', () => {
      expect(
        formatarSumarioEquipe({
          finalizadas: '4',
          em_andamento: 2,
          progresso: '75',
        })
      ).toEqual({
        finalizadas: 4,
        em_andamento: 2,
        a_fazer: 0,
        atrasadas: 0,
        progresso: 75,
      });
    });

    it('preserva propriedades adicionais do resumo', () => {
      expect(
        formatarSumarioEquipe({
          nome: 'Ana',
          finalizadas: 1,
        })
      ).toEqual({
        nome: 'Ana',
        finalizadas: 1,
        em_andamento: 0,
        a_fazer: 0,
        atrasadas: 0,
        progresso: 0,
      });
    });

    it('usa zero para valores falsy dos campos numéricos', () => {
      expect(
        formatarSumarioEquipe({
          finalizadas: 0,
          em_andamento: null,
          a_fazer: undefined,
          atrasadas: '',
          progresso: 0,
        })
      ).toEqual({
        finalizadas: 0,
        em_andamento: 0,
        a_fazer: 0,
        atrasadas: 0,
        progresso: 0,
      });
    });

    it('converte valores numéricos representados como texto', () => {
      expect(
        formatarSumarioEquipe({
          finalizadas: '10',
          em_andamento: '3',
          a_fazer: '2',
          atrasadas: '1',
          progresso: '85',
        })
      ).toEqual({
        finalizadas: 10,
        em_andamento: 3,
        a_fazer: 2,
        atrasadas: 1,
        progresso: 85,
      });
    });
  });

  describe('obterProgressoEquipe', () => {
    it.each([
      [{ progresso: 42 }, 42],
      [{ progresso: '68' }, 68],
      [{ progresso: 0 }, 0],
      [{ progresso: -10 }, 0],
      [{ progresso: 120 }, 100],
      [{}, 0],
    ])('retorna %i para o resumo %j', (summary, expected) => {
      expect(obterProgressoEquipe(summary)).toBe(expected);
    });

    it.each([
      [null, 0],
      [undefined, 0],
      [{ progresso: null }, 0],
      [{ progresso: undefined }, 0],
      [{ progresso: '' }, 0],
    ])(
      'retorna 0 quando o progresso está ausente ou é falsy: %j',
      (summary, expected) => {
        expect(obterProgressoEquipe(summary)).toBe(expected);
      }
    );

    it('mantém valores exatamente nos limites permitidos', () => {
      expect(obterProgressoEquipe({ progresso: 0 })).toBe(0);
      expect(obterProgressoEquipe({ progresso: 100 })).toBe(100);
    });
  });

  describe('filtrarProdutividadeSemAdmin', () => {
    it('filtra registros pertencentes ao administrador', () => {
      const list = [
        { funcionario_id: 1, nome: 'Administrador', finalizadas: 0 },
        { funcionario_id: 2, nome: 'Ana Paula', finalizadas: 5 },
        { funcionario_id: 3, nome: 'Admin', finalizadas: 2 },
      ];
      const result = filtrarProdutividadeSemAdmin(list);
      expect(result).toHaveLength(1);
      expect(result[0].nome).toBe('Ana Paula');
    });

    it('retorna array vazio para entradas não-array', () => {
      expect(filtrarProdutividadeSemAdmin(null)).toEqual([]);
      expect(filtrarProdutividadeSemAdmin(undefined)).toEqual([]);
    });
  });
});
