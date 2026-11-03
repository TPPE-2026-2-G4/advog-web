import { describe, expect, it } from 'vitest';
import {
  EMPTY_TEAM_SUMMARY,
  formatarSumarioEquipe,
  obterProgressoEquipe,
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
  });
});
