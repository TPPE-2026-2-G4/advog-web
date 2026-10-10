import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { formatParagraphs, getImageUrl } from './institucional';

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
