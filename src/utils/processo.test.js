import { describe, expect, it } from 'vitest';
import {
  buildProcessQuery,
  hasInvalidDateRange,
  toProcessPage,
  toProcessView,
  toResponsavelNames,
  toResponsavelOptions,
  CNJ_REGEX,
  calculateRemainingDays,
  formatCnjInput,
  formatProcessDate,
  isOverdueDeadline,
  normalizeProcessDate,
  toProcessFormData,
  toProcessPayload,
} from './processo';

const formData = {
  id: '0061234-56.2026.8.26.0100',
  titulo: '  Ação indenizatória  ',
  cliente: '  Maria Silva ',
  status: 'Ativo',
  tribunal: ' TJDFT ',
  area: ' Civil ',
  responsavel: ' Ana Paula ',
  prazo: '2026-10-05',
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
      id: formData.id,
      titulo: 'Ação indenizatória',
      cliente: 'Maria Silva',
      status: 'Ativo',
      tribunal: 'TJDFT',
      area: 'Civil',
      responsavel: 'Ana Paula',
      prazo: '2026-10-05',
    });
    expect(payload.diasRestantes).toEqual(expect.any(Number));
  });

  it('omite o identificador no payload de edição', () => {
    expect(toProcessPayload(formData, { includeId: false })).not.toHaveProperty(
      'id'
    );
  });

  it('converte uma resposta da API em dados de formulário', () => {
    expect(
      toProcessFormData({
        ...formData,
        prazo: '05/10/2026',
      })
    ).toEqual({
      ...formData,
      prazo: '2026-10-05',
    });
  });

  it('fornece valores padrão para um novo processo', () => {
    expect(toProcessFormData()).toEqual({
      id: '',
      titulo: '',
      cliente: '',
      status: 'Em Análise',
      tribunal: '',
      area: '',
      responsavel: '',
      prazo: '',
    });
  });
});

describe('filtros e listagem de processos', () => {
  it('monta a query somente com filtros preenchidos', () => {
    expect(
      buildProcessQuery({
        busca: '  0061234  ',
        status: 'Ativo',
        responsavelId: '7',
        prazoInicio: '2026-09-01',
        prazoFim: '',
        page: 2,
        pageSize: 5,
      })
    ).toBe(
      'busca=0061234&status=Ativo&responsavel_id=7&prazo_inicio=2026-09-01&page=2&page_size=5'
    );
  });

  it('normaliza datas em formato brasileiro e descarta datas inválidas', () => {
    expect(
      buildProcessQuery({ busca: '   ', prazoInicio: '31/12/2026', page: 1 })
    ).toBe('prazo_inicio=2026-12-31&page=1');

    expect(buildProcessQuery({ prazoInicio: '31/02/2026', page: 1 })).toBe(
      'page=1'
    );
  });

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

  it('adapta o processo da API para o formato da listagem', () => {
    const responsaveis = new Map([['3', 'Ana Paula Ribeiro']]);

    expect(
      toProcessView(
        {
          processo_id: 1,
          cnj: '0061234-56.2026.8.26.0100',
          titulo_proc: 'Ação Trabalhista',
          status: 'Ativo',
          tribunal: 'TRT2',
          area: 'Trabalhista',
          data_prazo: '2026-09-05T00:00:00',
          cliente_id: 4,
          responsavel_id: 3,
        },
        responsaveis
      )
    ).toEqual({
      id: '0061234-56.2026.8.26.0100',
      titulo: 'Ação Trabalhista',
      cliente: 'Cliente nº 4',
      status: 'Ativo',
      tribunal: 'TRT2',
      area: 'Trabalhista',
      responsavel: 'Ana Paula Ribeiro',
      prazo: '2026-09-05',
    });
  });

  it('usa valores de fallback quando cliente e responsável não existem', () => {
    expect(
      toProcessView({
        cnj: null,
        titulo_proc: 'Caso',
        status: 'Pendente',
        cliente_id: null,
        responsavel_id: null,
        data_prazo: null,
      })
    ).toMatchObject({
      id: '',
      cliente: 'Não informado',
      responsavel: 'Não informado',
      prazo: '',
    });
  });

  it('converte a página da API mantendo os metadados de paginação', () => {
    const page = toProcessPage(
      {
        itens: [{ cnj: '1', titulo_proc: 'A', status: 'Ativo' }],
        total: 6,
        page: 2,
        page_size: 5,
        total_pages: 2,
      },
      new Map()
    );

    expect(page).toMatchObject({
      total: 6,
      page: 2,
      pageSize: 5,
      totalPages: 2,
    });
    expect(page.itens).toHaveLength(1);
    expect(page.itens[0].titulo).toBe('A');
  });
});

describe('nomes de responsáveis', () => {
  it('indexa o nome pelo identificador textual do responsável', () => {
    const names = toResponsavelNames([{ value: '3', label: 'Ana Paula' }]);

    expect(names.get('3')).toBe('Ana Paula');
    expect(names.get('9')).toBeUndefined();
  });
});
