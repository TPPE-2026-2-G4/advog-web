import { describe, expect, it } from 'vitest';
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
  it.each([
    ['2026-10-05', '2026-10-05'],
    ['2026-10-05T12:30:00', '2026-10-05'],
    ['05/10/2026', '2026-10-05'],
    [' 05/10/2026 ', '2026-10-05'],
  ])('normaliza a data %s para ISO', (value, expected) => {
    expect(normalizeProcessDate(value)).toBe(expected);
  });

  it.each(['', null, '31/02/2026', '2026-13-01', 'data inválida'])(
    'rejeita a data inválida %s',
    (value) => {
      expect(normalizeProcessDate(value)).toBe('');
    }
  );

  it('formata datas válidas para pt-BR e preserva valores desconhecidos', () => {
    expect(formatProcessDate('2026-10-05')).toBe('05/10/2026');
    expect(formatProcessDate('05/10/2026')).toBe('05/10/2026');
    expect(formatProcessDate('sem prazo')).toBe('sem prazo');
    expect(formatProcessDate('')).toBe('Não informado');
  });

  it('calcula dias restantes por dias de calendário em UTC', () => {
    const now = new Date('2026-10-01T23:59:00.000Z');

    expect(calculateRemainingDays('2026-10-05', now)).toBe(4);
    expect(calculateRemainingDays('30/09/2026', now)).toBe(-1);
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
