import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  formatParagraphs,
  getImageUrl,
  getContrastTextColor,
  getAreaIcon,
  validarDadosInstitucionais,
} from './institucional';
import {
  Briefcase,
  Scale,
  Shield,
  Landmark,
  FileText,
  Users,
} from 'lucide-react';

describe('formatParagraphs', () => {
  it.each([
    [
      'texto com múltiplas quebras',
      'Para 1\n\nPara 2\n \nPara 3',
      ['Para 1', 'Para 2', 'Para 3'],
    ],
    ['texto nulo', null, []],
    ['texto undefined', undefined, []],
    ['texto vazio', '', []],
    ['texto apenas com espaços', '   \n  ', []],
  ])('deve formatar corretamente %s', (_, input, expected) => {
    expect(formatParagraphs(input)).toEqual(expected);
  });
});

describe('getImageUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_MINIO_INTERNAL: 'minio:9000',
      NEXT_PUBLIC_MINIO_EXTERNAL: 'localhost:9000',
      NEXT_PUBLIC_MINIO_ALIAS: 'http://minio/',
      NEXT_PUBLIC_MINIO_ALIAS_EXTERNAL: 'http://localhost:9000/',
      NEXT_PUBLIC_API_URL: 'http://localhost:8000',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it.each([
    ['falsy (null)', null, null],
    ['falsy (undefined)', undefined, null],
    ['não string (objeto)', { url: 'teste' }, { url: 'teste' }],
    ['não string (número)', 123, 123],
    [
      'URL do minio interno',
      'http://minio:9000/teste.jpg',
      'http://localhost:9000/teste.jpg',
    ],
    [
      'URL com alias do minio',
      'http://minio/teste.jpg',
      'http://localhost:9000/teste.jpg',
    ],
    [
      'Caminho relativo',
      '/uploads/teste.jpg',
      'http://localhost:8000/uploads/teste.jpg',
    ],
    [
      'URL externa qualquer',
      'https://google.com/imagem.jpg',
      'https://google.com/imagem.jpg',
    ],
  ])(
    'deve retornar a URL correta para %s com variáveis de ambiente',
    (_, input, expected) => {
      expect(getImageUrl(input)).toEqual(expected);
    }
  );

  it.each([
    [
      'URL do minio interno sem variáveis',
      'http://minio:9000/teste.jpg',
      'http://minio:9000/teste.jpg',
    ],
    [
      'URL com alias do minio sem variáveis',
      'http://minio/teste.jpg',
      'http://minio/teste.jpg',
    ],
    [
      'Caminho relativo sem variáveis',
      '/uploads/teste.jpg',
      '/uploads/teste.jpg',
    ],
  ])(
    'deve retornar a URL sem substituição para %s caso variáveis de ambiente não existam',
    (_, input, expected) => {
      delete process.env.NEXT_PUBLIC_MINIO_INTERNAL;
      delete process.env.NEXT_PUBLIC_MINIO_EXTERNAL;
      delete process.env.NEXT_PUBLIC_MINIO_ALIAS;
      delete process.env.NEXT_PUBLIC_MINIO_ALIAS_EXTERNAL;
      delete process.env.NEXT_PUBLIC_API_URL;

      expect(getImageUrl(input)).toEqual(expected);
    }
  );
});

describe('getContrastTextColor', () => {
  it.each([
    ['fundo escuro azul marinho (#1B2A4A)', '#1B2A4A', '#ffffff'],
    ['fundo escuro preto (#000000)', '#000000', '#ffffff'],
    ['fundo escuro azul profundo (#0F172A)', '#0F172A', '#ffffff'],
    ['fundo escuro azul marinho (#000080)', '#000080', '#ffffff'],
    ['fundo escuro shorthand (#000)', '#000', '#ffffff'],
    ['fundo claro branco (#FFFFFF)', '#FFFFFF', '#172133'],
    ['fundo claro shorthand (#FFF)', '#FFF', '#172133'],
    ['fundo dourado padrão (#B79A63)', '#B79A63', '#172133'],
    ['fundo dourado claro (#C1A077)', '#C1A077', '#172133'],
    ['fundo amarelo (#FFFF00)', '#FFFF00', '#172133'],
    ['fundo cinza claro (#F3F4F6)', '#F3F4F6', '#172133'],
    ['hex sem hashtag (000000)', '000000', '#ffffff'],
    ['hex sem hashtag claro (FFFFFF)', 'FFFFFF', '#172133'],
  ])(
    'deve retornar a cor de texto contrastante correta para %s',
    (_, hex, expected) => {
      expect(getContrastTextColor(hex)).toBe(expected);
    }
  );

  it('deve usar darkColor e lightColor personalizados quando fornecidos', () => {
    expect(getContrastTextColor('#000000', '#111111', '#eeeeee')).toBe(
      '#eeeeee'
    );
    expect(getContrastTextColor('#ffffff', '#111111', '#eeeeee')).toBe(
      '#111111'
    );
  });

  it.each([
    ['cor nula', null],
    ['cor indefinida', undefined],
    ['string vazia', ''],
    ['hex inválido', '#xyz123'],
    ['hex incompleto', '#12'],
    ['tipo não-string', 12345],
  ])('deve retornar darkColor padrão como fallback para %s', (_, input) => {
    expect(getContrastTextColor(input)).toBe('#172133');
  });
});

describe('getAreaIcon', () => {
  it.each([
    ['Direito do Trabalho', Briefcase],
    ['Direito Empresarial', Briefcase],
    ['Direito Penal', Shield],
    ['Direito Criminal', Shield],
    ['Segurança Pública', Shield],
    ['Defesa do Cidadão', Shield],
    ['Direito Tributário', Landmark],
    ['Direito Público', Landmark],
    ['Direito Bancário', Landmark],
    ['Direito de Família', Users],
    ['Sucessões', Users],
    ['Direito Contratual', FileText],
    ['Direito Imobiliário', FileText],
    ['Direito do Consumidor', FileText],
  ])('deve retornar o ícone correto para %s', (titulo, IconEsperado) => {
    expect(getAreaIcon(titulo)).toBe(IconEsperado);
  });

  it('deve utilizar fallback cíclico baseado no índice quando não reconhecer o título', () => {
    expect(getAreaIcon('Área Genérica', 0)).toBe(Briefcase);
    expect(getAreaIcon('Área Genérica', 1)).toBe(Scale);
    expect(getAreaIcon('Área Genérica', 2)).toBe(Shield);
    expect(getAreaIcon('Área Genérica', 3)).toBe(Landmark);
    expect(getAreaIcon('Área Genérica', 4)).toBe(FileText);
    expect(getAreaIcon('Área Genérica', 5)).toBe(Users);
    expect(getAreaIcon('Área Genérica', 6)).toBe(Briefcase);
  });
});

describe('validarDadosInstitucionais', () => {
  it('retorna null quando os dados são válidos', () => {
    const dados = {
      nomeEscritorio: 'Carreiro Advogados',
      email: 'contato@carreiro.adv.br',
      telefone: '(61) 98765-4321',
      corPrimaria: '#1B2A4A',
      corSecundaria: '#B79A63',
    };
    expect(validarDadosInstitucionais(dados)).toBeNull();
  });

  it('permite nomeEscritorio vazio (utiliza fallback padrão)', () => {
    expect(validarDadosInstitucionais({ nomeEscritorio: '' })).toBeNull();
  });

  it('retorna erro quando o e-mail for inválido', () => {
    expect(
      validarDadosInstitucionais({
        nomeEscritorio: 'Teste',
        email: 'email-invalido',
      })
    ).toBe(
      'E-mail inválido. Por favor, insira um e-mail no formato correto (ex: contato@escritorio.adv.br).'
    );
  });

  it('permite e-mail vazio ou não informado', () => {
    expect(
      validarDadosInstitucionais({
        nomeEscritorio: 'Teste',
        email: '',
      })
    ).toBeNull();
  });

  it('retorna erro quando telefone tiver quantidade inválida de dígitos', () => {
    expect(
      validarDadosInstitucionais({
        nomeEscritorio: 'Teste',
        telefone: '(61) 123',
      })
    ).toBe('Telefone inválido. Informe um número com DDD (10 ou 11 dígitos).');

    expect(
      validarDadosInstitucionais({
        nomeEscritorio: 'Teste',
        telefone: '(61) 98765-4321000',
      })
    ).toBe('Telefone inválido. Informe um número com DDD (10 ou 11 dígitos).');
  });

  it('permite telefone vazio ou não informado', () => {
    expect(
      validarDadosInstitucionais({
        nomeEscritorio: 'Teste',
        telefone: '',
      })
    ).toBeNull();
  });

  it('retorna erro quando corPrimaria for inválida', () => {
    expect(
      validarDadosInstitucionais({
        nomeEscritorio: 'Teste',
        corPrimaria: 'azul',
      })
    ).toBe(
      'A cor primária deve ser um código hexadecimal válido (ex: #1B2A4A).'
    );
  });

  it('retorna erro quando corSecundaria for inválida', () => {
    expect(
      validarDadosInstitucionais({
        nomeEscritorio: 'Teste',
        corSecundaria: '#12345Z',
      })
    ).toBe(
      'A cor de acento deve ser um código hexadecimal válido (ex: #B79A63).'
    );
  });
});
