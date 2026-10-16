import { describe, expect, it } from 'vitest';
import {
  ETAPAS,
  formatarCpfCnpj,
  formatarDataInteracao,
  formatarTelefone,
  obterEtapaPorId,
  obterEtapaPorLabel,
  obterIniciais,
  validarDadosCliente,
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

  describe('validarDadosCliente', () => {
    const dadosValidos = {
      nome: 'João Santos',
      cpfCnpj: '12345678901',
      telefone: '(61) 98888-7777',
      email: 'joao@email.com',
    };

    it('retorna null para dados válidos com CPF de 11 dígitos', () => {
      expect(validarDadosCliente(dadosValidos)).toBeNull();
    });

    it('retorna null para dados válidos com CNPJ de 14 dígitos', () => {
      expect(
        validarDadosCliente({
          ...dadosValidos,
          cpfCnpj: '12.345.678/0001-99',
        })
      ).toBeNull();
    });

    it('permite CPF/CNPJ vazio', () => {
      expect(
        validarDadosCliente({
          ...dadosValidos,
          cpfCnpj: '',
        })
      ).toBeNull();
    });

    it('retorna erro quando nome não for preenchido', () => {
      expect(validarDadosCliente({ ...dadosValidos, nome: '' })).toBe(
        'O nome ou razão social é obrigatório.'
      );
      expect(validarDadosCliente({ ...dadosValidos, nome: '   ' })).toBe(
        'O nome ou razão social é obrigatório.'
      );
      expect(validarDadosCliente()).toBe(
        'O nome ou razão social é obrigatório.'
      );
    });

    it('retorna erro quando CPF/CNPJ tiver tamanho inválido', () => {
      expect(validarDadosCliente({ ...dadosValidos, cpfCnpj: '1' })).toBe(
        'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.'
      );
      expect(
        validarDadosCliente({ ...dadosValidos, cpfCnpj: '123456789' })
      ).toBe('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');
    });

    it('retorna erro quando telefone não for preenchido', () => {
      expect(validarDadosCliente({ ...dadosValidos, telefone: '' })).toBe(
        'O telefone é obrigatório.'
      );
      expect(validarDadosCliente({ ...dadosValidos, telefone: '   ' })).toBe(
        'O telefone é obrigatório.'
      );
    });

    it('retorna erro quando telefone tiver dígitos insuficientes ou excessivos', () => {
      expect(validarDadosCliente({ ...dadosValidos, telefone: '1' })).toBe(
        'Informe um telefone válido com DDD (10 ou 11 dígitos).'
      );
      expect(
        validarDadosCliente({ ...dadosValidos, telefone: '123456789' })
      ).toBe('Informe um telefone válido com DDD (10 ou 11 dígitos).');
      expect(
        validarDadosCliente({ ...dadosValidos, telefone: '123456789012' })
      ).toBe('Informe um telefone válido com DDD (10 ou 11 dígitos).');
    });

    it('aceita telefone fixo de 10 dígitos e celular de 11 dígitos', () => {
      expect(
        validarDadosCliente({ ...dadosValidos, telefone: '6133334444' })
      ).toBeNull();
      expect(
        validarDadosCliente({ ...dadosValidos, telefone: '61999998888' })
      ).toBeNull();
    });

    it('retorna erro quando email for vazio', () => {
      expect(validarDadosCliente({ ...dadosValidos, email: '' })).toBe(
        'O e-mail é obrigatório.'
      );
      expect(validarDadosCliente({ ...dadosValidos, email: '   ' })).toBe(
        'O e-mail é obrigatório.'
      );
    });

    it('retorna erro quando email tiver formato inválido', () => {
      expect(validarDadosCliente({ ...dadosValidos, email: 'invalido' })).toBe(
        'Informe um e-mail válido.'
      );
      expect(validarDadosCliente({ ...dadosValidos, email: 'sem@ponto' })).toBe(
        'Informe um e-mail válido.'
      );
    });
  });
});
