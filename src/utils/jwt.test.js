import { describe, expect, it } from 'vitest';
import {
  getTokenExpiration,
  getTokenMaxAgeSeconds,
  isTokenExpired,
  parseJwtPayload,
} from './jwt';

const toBase64Url = (value) =>
  btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const createJwt = (payload) =>
  `header.${toBase64Url(JSON.stringify(payload))}.signature`;

const NOW = Date.parse('2026-11-09T12:00:00.000Z');
const toSeconds = (ms) => Math.floor(ms / 1000);

describe('parseJwtPayload', () => {
  it('decodifica o payload de um JWT em base64url', () => {
    const payload = { sub: '10', nome: '~~~???>>>', email: 'a@b.com' };

    expect(parseJwtPayload(createJwt(payload))).toEqual(payload);
  });

  it('decodifica caracteres UTF-8 do payload', () => {
    const json = JSON.stringify({ nome: 'Conceição Öztürk' });
    const bytes = new TextEncoder().encode(json);
    const base64 = btoa(String.fromCharCode(...bytes));

    expect(parseJwtPayload(`h.${base64}.s`)).toEqual({
      nome: 'Conceição Öztürk',
    });
  });

  it.each([
    { cenario: 'valor nulo', token: null },
    { cenario: 'valor indefinido', token: undefined },
    { cenario: 'valor que não é string', token: 123 },
    { cenario: 'string vazia', token: '' },
    { cenario: 'token com apenas uma parte', token: 'abc' },
    { cenario: 'payload que não é base64', token: 'h.@@@.s' },
    { cenario: 'payload que não é JSON', token: `h.${btoa('texto')}.s` },
  ])('retorna null para $cenario', ({ token }) => {
    expect(parseJwtPayload(token)).toBeNull();
  });
});

describe('getTokenExpiration', () => {
  it('retorna a expiração em milissegundos', () => {
    const exp = toSeconds(NOW) + 600;

    expect(getTokenExpiration(createJwt({ exp }))).toBe(exp * 1000);
  });

  it.each([
    { cenario: 'token sem exp', token: createJwt({ sub: '1' }) },
    { cenario: 'exp que não é número', token: createJwt({ exp: 'amanhã' }) },
    { cenario: 'token inválido', token: 'invalido' },
  ])('retorna null para $cenario', ({ token }) => {
    expect(getTokenExpiration(token)).toBeNull();
  });
});

describe('isTokenExpired', () => {
  it.each([
    {
      cenario: 'token com exp no passado',
      token: createJwt({ exp: toSeconds(NOW) - 1 }),
      esperado: true,
    },
    {
      cenario: 'token com exp exatamente agora',
      token: createJwt({ exp: toSeconds(NOW) }),
      esperado: true,
    },
    {
      cenario: 'token com exp no futuro',
      token: createJwt({ exp: toSeconds(NOW) + 1 }),
      esperado: false,
    },
    {
      cenario: 'token válido sem exp (nunca expira)',
      token: createJwt({ sub: '1' }),
      esperado: false,
    },
    { cenario: 'token malformado', token: 'jwt-valido', esperado: true },
    { cenario: 'token ausente', token: undefined, esperado: true },
  ])('retorna $esperado para $cenario', ({ token, esperado }) => {
    expect(isTokenExpired(token, NOW)).toBe(esperado);
  });

  it('usa o horário atual quando não recebe o parâmetro now', () => {
    const futuro = toSeconds(Date.now()) + 3600;
    const passado = toSeconds(Date.now()) - 3600;

    expect(isTokenExpired(createJwt({ exp: futuro }))).toBe(false);
    expect(isTokenExpired(createJwt({ exp: passado }))).toBe(true);
  });
});

describe('getTokenMaxAgeSeconds', () => {
  it('retorna os segundos restantes até a expiração', () => {
    const token = createJwt({ exp: toSeconds(NOW) + 3600 });

    expect(getTokenMaxAgeSeconds(token, NOW)).toBe(3600);
  });

  it('retorna 0 para token já expirado', () => {
    const token = createJwt({ exp: toSeconds(NOW) - 10 });

    expect(getTokenMaxAgeSeconds(token, NOW)).toBe(0);
  });

  it('retorna null quando não é possível determinar a expiração', () => {
    expect(getTokenMaxAgeSeconds(createJwt({ sub: '1' }), NOW)).toBeNull();
    expect(getTokenMaxAgeSeconds('invalido', NOW)).toBeNull();
  });

  it('usa o horário atual quando não recebe o parâmetro now', () => {
    const token = createJwt({ exp: toSeconds(Date.now()) + 600 });
    const maxAge = getTokenMaxAgeSeconds(token);

    expect(maxAge).toBeGreaterThan(590);
    expect(maxAge).toBeLessThanOrEqual(600);
  });
});
