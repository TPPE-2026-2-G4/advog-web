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
    it('possui 5 etapas padrão configuradas corretamente', () => {
      expect(ETAPAS).toHaveLength(5);
      expect(ETAPAS[0].label).toBe('Novo contato');
      expect(ETAPAS[4].label).toBe('Encerrado');
    });

    it.each([
      {
        cenario: 'id numérico existente (1)',
        entrada: 1,
        esperado: { id: 1, label: 'Novo contato', variant: 'novoContato' },
      },
      {
        cenario: 'id como string numérica ("4")',
        entrada: '4',
        esperado: { id: 4, label: 'Cliente ativo', variant: 'clienteAtivo' },
      },
      {
        cenario: 'id inexistente (99) com fallback de label',
        entrada: 99,
        esperado: { id: 99, label: 'Novo contato', variant: 'novoContato' },
      },
      {
        cenario: 'id nulo retornando etapa padrão inicial',
        entrada: null,
        esperado: { id: 1, label: 'Novo contato', variant: 'novoContato' },
      },
    ])(
      'obterEtapaPorId retorna a etapa correta para $cenario',
      ({ entrada, esperado }) => {
        expect(obterEtapaPorId(entrada)).toEqual(esperado);
      }
    );

    it.each([
      {
        cenario: 'label exato ("Cliente ativo")',
        entrada: 'Cliente ativo',
        idEsperado: 4,
        labelEsperado: 'Cliente ativo',
      },
      {
        cenario: 'label em minúsculas ("cliente ativo")',
        entrada: 'cliente ativo',
        idEsperado: 4,
        labelEsperado: 'Cliente ativo',
      },
      {
        cenario: 'label inexistente preservando texto customizado',
        entrada: 'Não existe',
        idEsperado: 1,
        labelEsperado: 'Não existe',
      },
      {
        cenario: 'label nulo retornando etapa padrão',
        entrada: null,
        idEsperado: 1,
        labelEsperado: 'Novo contato',
      },
    ])(
      'obterEtapaPorLabel resolve corretamente para $cenario',
      ({ entrada, idEsperado, labelEsperado }) => {
        const etapa = obterEtapaPorLabel(entrada);
        expect(etapa.id).toBe(idEsperado);
        expect(etapa.label).toBe(labelEsperado);
      }
    );
  });

  describe('formatarCpfCnpj', () => {
    it.each([
      { cenario: 'string vazia', entrada: '', esperado: '' },
      { cenario: 'valor null', entrada: null, esperado: '' },
      { cenario: 'valor undefined', entrada: undefined, esperado: '' },
      { cenario: 'CPF parcial (3 dígitos)', entrada: '123', esperado: '123' },
      {
        cenario: 'CPF parcial (7 dígitos)',
        entrada: '1234567',
        esperado: '123.456.7',
      },
      {
        cenario: 'CPF completo sem máscara',
        entrada: '12345678900',
        esperado: '123.456.789-00',
      },
      {
        cenario: 'CPF já formatado',
        entrada: '123.456.789-00',
        esperado: '123.456.789-00',
      },
      {
        cenario: 'CNPJ completo sem máscara (exemplo 1)',
        entrada: '86765432000112',
        esperado: '86.765.432/0001-12',
      },
      {
        cenario: 'CNPJ completo sem máscara (exemplo 2)',
        entrada: '55666777000188',
        esperado: '55.666.777/0001-88',
      },
    ])(
      'formata corretamente $cenario ($entrada -> "$esperado")',
      ({ entrada, esperado }) => {
        expect(formatarCpfCnpj(entrada)).toBe(esperado);
      }
    );
  });

  describe('formatarTelefone', () => {
    it.each([
      { cenario: 'string vazia', entrada: '', esperado: '' },
      { cenario: 'apenas espaços', entrada: '   ', esperado: '' },
      { cenario: 'valor null', entrada: null, esperado: '' },
      { cenario: '1 dígito de DDD', entrada: '1', esperado: '(1' },
      { cenario: '2 dígitos de DDD', entrada: '11', esperado: '(11' },
      {
        cenario: 'DDD + início do número',
        entrada: '1199',
        esperado: '(11) 99',
      },
      {
        cenario: 'telefone fixo com 10 dígitos',
        entrada: '1133334444',
        esperado: '(11) 3333-4444',
      },
      {
        cenario: 'telefone celular com 11 dígitos',
        entrada: '11999991234',
        esperado: '(11) 99999-1234',
      },
    ])(
      'formata corretamente $cenario ($entrada -> "$esperado")',
      ({ entrada, esperado }) => {
        expect(formatarTelefone(entrada)).toBe(esperado);
      }
    );
  });

  describe('formatarDataInteracao', () => {
    it.each([
      { cenario: 'string vazia', entrada: '', esperado: '-' },
      { cenario: 'valor null', entrada: null, esperado: '-' },
      {
        cenario: 'data inválida (retorna original)',
        entrada: 'data-invalida',
        esperado: 'data-invalida',
      },
    ])(
      'retorna "$esperado" quando entrada for $cenario',
      ({ entrada, esperado }) => {
        expect(formatarDataInteracao(entrada)).toBe(esperado);
      }
    );

    it('formata data ISO válida para DD/MM/AAAA', () => {
      const dataStr = '2026-08-25T14:30:00Z';
      expect(formatarDataInteracao(dataStr)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });
  });

  describe('obterIniciais', () => {
    it.each([
      { cenario: 'string vazia', entrada: '', esperado: '--' },
      { cenario: 'valor null', entrada: null, esperado: '--' },
      { cenario: 'apenas espaços em branco', entrada: '   ', esperado: '--' },
      {
        cenario: 'nome com uma única palavra',
        entrada: 'Alexandre',
        esperado: 'AL',
      },
      {
        cenario: 'nome composto por duas palavras',
        entrada: 'João Santos',
        esperado: 'JS',
      },
      {
        cenario: 'razão social com duas palavras',
        entrada: 'Tech Solutions',
        esperado: 'TS',
      },
      {
        cenario: 'razão social com três palavras (primeira e última)',
        entrada: 'Tech Solutions LTDA',
        esperado: 'TL',
      },
      {
        cenario: 'outro nome composto',
        entrada: 'Maria Oliveira',
        esperado: 'MO',
      },
    ])('retorna "$esperado" para $cenario', ({ entrada, esperado }) => {
      expect(obterIniciais(entrada)).toBe(esperado);
    });
  });

  describe('validarDadosCliente', () => {
    const dadosValidos = {
      nome: 'João Santos',
      cpfCnpj: '12345678901',
      telefone: '(61) 98888-7777',
      email: 'joao@email.com',
    };

    it.each([
      {
        cenario: 'dados completos com CPF de 11 dígitos',
        payload: dadosValidos,
        esperado: null,
      },
      {
        cenario: 'dados completos com CNPJ de 14 dígitos formatado',
        payload: { ...dadosValidos, cpfCnpj: '12.345.678/0001-99' },
        esperado: null,
      },
      {
        cenario: 'CPF/CNPJ vazio (campo opcional)',
        payload: { ...dadosValidos, cpfCnpj: '' },
        esperado: null,
      },
      {
        cenario: 'telefone fixo de 10 dígitos sem máscara',
        payload: { ...dadosValidos, telefone: '6133334444' },
        esperado: null,
      },
      {
        cenario: 'telefone celular de 11 dígitos sem máscara',
        payload: { ...dadosValidos, telefone: '61999998888' },
        esperado: null,
      },
      {
        cenario: 'objeto ausente (undefined)',
        payload: undefined,
        esperado: 'O nome ou razão social é obrigatório.',
      },
      {
        cenario: 'nome vazio',
        payload: { ...dadosValidos, nome: '' },
        esperado: 'O nome ou razão social é obrigatório.',
      },
      {
        cenario: 'nome contendo apenas espaços',
        payload: { ...dadosValidos, nome: '   ' },
        esperado: 'O nome ou razão social é obrigatório.',
      },
      {
        cenario: 'CPF/CNPJ com 1 dígito',
        payload: { ...dadosValidos, cpfCnpj: '1' },
        esperado: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.',
      },
      {
        cenario: 'CPF/CNPJ com 9 dígitos',
        payload: { ...dadosValidos, cpfCnpj: '123456789' },
        esperado: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.',
      },
      {
        cenario: 'telefone vazio',
        payload: { ...dadosValidos, telefone: '' },
        esperado: 'O telefone é obrigatório.',
      },
      {
        cenario: 'telefone apenas com espaços',
        payload: { ...dadosValidos, telefone: '   ' },
        esperado: 'O telefone é obrigatório.',
      },
      {
        cenario: 'telefone com 1 dígito',
        payload: { ...dadosValidos, telefone: '1' },
        esperado: 'Informe um telefone válido com DDD (10 ou 11 dígitos).',
      },
      {
        cenario: 'telefone com 9 dígitos (abaixo do mínimo)',
        payload: { ...dadosValidos, telefone: '123456789' },
        esperado: 'Informe um telefone válido com DDD (10 ou 11 dígitos).',
      },
      {
        cenario: 'telefone com 12 dígitos (acima do máximo)',
        payload: { ...dadosValidos, telefone: '123456789012' },
        esperado: 'Informe um telefone válido com DDD (10 ou 11 dígitos).',
      },
      {
        cenario: 'email vazio',
        payload: { ...dadosValidos, email: '' },
        esperado: 'O e-mail é obrigatório.',
      },
      {
        cenario: 'email contendo apenas espaços',
        payload: { ...dadosValidos, email: '   ' },
        esperado: 'O e-mail é obrigatório.',
      },
      {
        cenario: 'email sem @',
        payload: { ...dadosValidos, email: 'invalido' },
        esperado: 'Informe um e-mail válido.',
      },
      {
        cenario: 'email sem domínio com ponto',
        payload: { ...dadosValidos, email: 'sem@ponto' },
        esperado: 'Informe um e-mail válido.',
      },
    ])('valida $cenario retornando $esperado', ({ payload, esperado }) => {
      expect(validarDadosCliente(payload)).toBe(esperado);
    });
  });
});
