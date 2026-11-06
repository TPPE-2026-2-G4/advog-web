import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  formatParagraphs,
  getImageUrl,
  getContrastTextColor,
} from './institucional';

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
