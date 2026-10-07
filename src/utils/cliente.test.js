import { describe, expect, it } from 'vitest';
import {
  ETAPAS,
  formatarCpfCnpj,
  formatarDataInteracao,
  formatarTelefone,
  obterEtapaPorId,
  obterEtapaPorLabel,
  obterIniciais,
} from './cliente';

describe('cliente utils', () => {
  describe('ETAPAS e buscas de etapa', () => {
    it('possui 5 etapas padrão', () => {
      expect(ETAPAS).toHaveLength(5);
      expect(ETAPAS[0].label).toBe('Novo contato');
      expect(ETAPAS[4].label).toBe('Encerrado');
    });

    it('retorna a etapa correta por id', () => {
      expect(obterEtapaPorId(1).label).toBe('Novo contato');
      expect(obterEtapaPorId('4').label).toBe('Cliente ativo');
      expect(obterEtapaPorId(99).label).toBe('Novo contato');
      expect(obterEtapaPorId(null).label).toBe('Novo contato');
    });

    it('retorna a etapa correta por label', () => {
      expect(obterEtapaPorLabel('Cliente ativo').id).toBe(4);
      expect(obterEtapaPorLabel('cliente ativo').id).toBe(4);
      expect(obterEtapaPorLabel('Não existe').id).toBe(1);
      expect(obterEtapaPorLabel(null).label).toBe('Novo contato');
    });
  });

  describe('formatarCpfCnpj', () => {
    it('retorna string vazia quando valor for nulo ou vazio', () => {
      expect(formatarCpfCnpj('')).toBe('');
      expect(formatarCpfCnpj(null)).toBe('');
      expect(formatarCpfCnpj(undefined)).toBe('');
    });

    it('formata CPF com até 11 dígitos', () => {
      expect(formatarCpfCnpj('12345678900')).toBe('123.456.789-00');
      expect(formatarCpfCnpj('123.456.789-00')).toBe('123.456.789-00');
      expect(formatarCpfCnpj('123')).toBe('123');
    });

    it('formata CNPJ com mais de 11 dígitos', () => {
      expect(formatarCpfCnpj('86765432000112')).toBe('86.765.432/0001-12');
      expect(formatarCpfCnpj('55666777000188')).toBe('55.666.777/0001-88');
    });
  });

  describe('formatarTelefone', () => {
    it('retorna vazio para valores nulos ou vazios', () => {
      expect(formatarTelefone('')).toBe('');
      expect(formatarTelefone('   ')).toBe('');
      expect(formatarTelefone(null)).toBe('');
    });

    it('formata DDD parcial', () => {
      expect(formatarTelefone('1')).toBe('(1');
      expect(formatarTelefone('11')).toBe('(11');
      expect(formatarTelefone('1199')).toBe('(11) 99');
    });

    it('formata telefone fixo com 10 dígitos', () => {
      expect(formatarTelefone('1133334444')).toBe('(11) 3333-4444');
    });

    it('formata telefone celular com 11 dígitos', () => {
      expect(formatarTelefone('11999991234')).toBe('(11) 99999-1234');
    });
  });

  describe('formatarDataInteracao', () => {
    it('retorna hífen para datas nulas ou vazias', () => {
      expect(formatarDataInteracao('')).toBe('-');
      expect(formatarDataInteracao(null)).toBe('-');
    });

    it('formata data ISO válida para DD/MM/AAAA', () => {
      const dataStr = '2026-08-25T14:30:00Z';
      const formatada = formatarDataInteracao(dataStr);
      expect(formatada).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    it('retorna o valor original para datas inválidas', () => {
      expect(formatarDataInteracao('data-invalida')).toBe('data-invalida');
    });
  });

  describe('obterIniciais', () => {
    it('retorna -- quando nome for vazio ou inválido', () => {
      expect(obterIniciais('')).toBe('--');
      expect(obterIniciais(null)).toBe('--');
      expect(obterIniciais('   ')).toBe('--');
    });

    it('retorna primeiras 2 letras quando nome tiver uma só palavra', () => {
      expect(obterIniciais('Alexandre')).toBe('AL');
    });

    it('retorna primeira letra do primeiro e do último nome', () => {
      expect(obterIniciais('João Santos')).toBe('JS');
      expect(obterIniciais('Tech Solutions')).toBe('TS');
      expect(obterIniciais('Tech Solutions LTDA')).toBe('TL');
      expect(obterIniciais('Maria Oliveira')).toBe('MO');
    });
  });
});
