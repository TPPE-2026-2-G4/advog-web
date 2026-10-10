content = """import { describe, expect, it } from 'vitest';
import {
  CNJ_REGEX,
  calculateRemainingDays,
  formatCnjInput,
  formatProcessDate,
  isOverdueDeadline,
  normalizeProcessDate,
  toProcessApiDate,
  toProcessFormData,
  toProcessPayload,
  toProcessUpdatePayload,
  hasInvalidDateRange,
  toResponsavelOptions,
} from './processo';

const formData = {
  cnj: '0061234-56.2026.8.26.0100',
  titulo: '  Ação indenizatória  ',
  descricao: '  Descrição do caso  ',
  status: 'Ativo',
  tribunal: ' TJDFT ',
  area: ' Civil ',
  data_inicio: '2026-01-01',
  data_realizado: '',
  data_prazo: '2026-10-05',
  cliente_id: '10',
  funcionario_id: '5',
};

describe('utilitários de processo', () => {
  it('normaliza as partes da data', () => {
    expect(normalizeProcessDate('2026-10-05')).toBe('2026-10-05');
    expect(normalizeProcessDate('05/10/2026')).toBe('2026-10-05');
    expect(normalizeProcessDate('2026/10/05')).toBe('');
    expect(normalizeProcessDate('')).toBe('');
  });

  it('formata a data para o padrão brasileiro', () => {
    expect(formatProcessDate('2026-10-05')).toBe('05/10/2026');
    expect(formatProcessDate('05/10/2026')).toBe('05/10/2026');
    expect(formatProcessDate('')).toBe('Não informado');
  });

  it('calcula dias restantes com base na data atual', () => {
    const now = new Date('2026-10-01T10:00:00.000Z');

    expect(calculateRemainingDays('2026-10-05', now)).toBe(4);
    expect(calculateRemainingDays('2026-09-30', now)).toBe(-1);
    expect(calculateRemainingDays('', now)).toBeNull();
    expect(calculateRemainingDays('inválida', now)).toBeNull();
  });

  it('considera vencido somente o prazo anterior à data atual', () => {
    const now = new Date('2026-10-01T10:00:00.000Z');

    expect(isOverdueDeadline('2026-09-30', now)).toBe(true);
    expect(isOverdueDeadline('2026-10-01', now)).toBe(false);
    expect(isOverdueDeadline('2026-10-02', now)).toBe(false);
    expect(isOverdueDeadline('inválida', now)).toBe(false);
  });

  it('reconhece apenas números CNJ no formato contratado', () => {
    expect(CNJ_REGEX.test('0061234-56.2026.8.26.0100')).toBe(true);
    expect(CNJ_REGEX.test('00612345620268260100')).toBe(false);
  });

  it.each([
    ['0061234', '0061234'],
    ['006123456', '0061234-56'],
    ['0061234562026', '0061234-56.2026'],
    ['00612345620268260100', '0061234-56.2026.8.26.0100'],
    ['0061234abc562026x8y260100', '0061234-56.2026.8.26.0100'],
    ['006123456202682601009999', '0061234-56.2026.8.26.0100'],
    [null, ''],
  ])('formata progressivamente o CNJ informado como %s', (input, expected) => {
    expect(formatCnjInput(input)).toBe(expected);
  });

  it('monta o payload de criação normalizado', () => {
    const payload = toProcessPayload(formData);

    expect(payload).toMatchObject({
      cnj: formData.cnj,
      titulo: 'Ação indenizatória',
      descricao: 'Descrição do caso',
      status: 'Ativo',
      tribunal: 'TJDFT',
      area: 'Civil',
      data_inicio: '2026-01-01T00:00:00',
      data_realizado: null,
      data_prazo: '2026-10-05T00:00:00',
      cliente_id: 10,
      funcionario_id: 5,
    });
  });

  it('converte datas para datetime e permite valores opcionais nulos', () => {
    expect(toProcessApiDate('05/10/2026')).toBe('2026-10-05T00:00:00');
    expect(toProcessApiDate('')).toBeNull();
  });

  it('omite o CNJ no payload de edição', () => {
    expect(
      toProcessPayload(formData, { includeCnj: false })
    ).not.toHaveProperty('cnj');
  });

  it('monta um PATCH somente com os campos alterados', () => {
    const original = {
      processo_id: 1,
      cnj: formData.cnj,
      titulo: 'Ação indenizatória',
      descricao: 'Descrição do caso',
      status: 'Ativo',
      tribunal: 'TJDFT',
      area: 'Civil',
      data_inicio: '2026-01-01T00:00:00',
      data_realizado: null,
      data_prazo: '2026-10-05T00:00:00',
      cliente_id: 10,
      funcionario_id: 5,
    };

    expect(
      toProcessUpdatePayload(
        { ...toProcessFormData(original), titulo: 'Novo título' },
        original
      )
    ).toEqual({ titulo: 'Novo título' });
  });

  it('converte uma resposta da API em dados de formulário', () => {
    expect(
      toProcessFormData({
        ...formData,
        cliente_id: 10,
        funcionario_id: null,
        data_inicio: '2026-01-01T00:00:00',
        data_prazo: '05/10/2026',
      })
    ).toEqual({
      ...formData,
      descricao: formData.descricao,
      cliente_id: '10',
      funcionario_id: '',
      data_inicio: '2026-01-01',
      data_prazo: '2026-10-05',
    });
  });

  it('fornece valores padrão para um novo processo', () => {
    expect(toProcessFormData()).toEqual({
      cnj: '',
      titulo: '',
      descricao: '',
      status: 'Em Análise',
      tribunal: '',
      area: '',
      data_inicio: '',
      data_realizado: '',
      data_prazo: '',
      cliente_id: '',
      funcionario_id: '',
    });
  });
});

describe('filtros e listagem de processos', () => {
  it('identifica intervalo de prazo com início posterior ao fim', () => {
    expect(hasInvalidDateRange('2026-09-10', '2026-09-01')).toBe(true);
    expect(hasInvalidDateRange('2026-09-01', '2026-09-01')).toBe(false);
    expect(hasInvalidDateRange('', '2026-09-01')).toBe(false);
  });

  it('converte opções de responsável a partir dos funcionários', () => {
    expect(
      toResponsavelOptions([{ funcionario_id: 3, nome: 'Ana Paula Ribeiro' }])
    ).toEqual([{ value: '3', label: 'Ana Paula Ribeiro' }]);
  });
});
"""
with open('src/utils/processo.test.js', 'w') as f:
    f.write(content)
