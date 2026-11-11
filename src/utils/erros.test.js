import { describe, expect, it } from 'vitest';
import { MENSAGEM_ERRO_PADRAO, mensagemAmigavel } from './erros';

describe('mensagemAmigavel', () => {
  it.each([
    ['Failed to fetch', /conectar ao servidor/],
    ['NetworkError when attempting to fetch resource.', /conectar ao servidor/],
    ['Load failed', /conectar ao servidor/],
    ['Internal Server Error', /servidor encontrou um problema/],
    ['HTTP 502', /servidor encontrou um problema/],
    ['Unexpected token < in JSON at position 0', /resposta inesperada/],
    ['Not authenticated', /sessão expirou/],
    ['Could not validate credentials', /sessão expirou/],
    ['Forbidden', /não tem permissão/],
    ['Not Found', /Não encontramos/],
    ['Too Many Requests', /Muitas tentativas/],
  ])('traduz "%s"', (original, esperado) => {
    expect(mensagemAmigavel(original)).toMatch(esperado);
  });

  it.each([
    ['Field required', 'Campo obrigatório'],
    ['Cargo: Field required', 'Cargo: campo obrigatório'],
    [
      'Título: String should have at most 100 characters',
      'Título: use no máximo 100 caracteres',
    ],
    ['String should have at least 2 characters', 'Use no mínimo 2 caracteres'],
    [
      'value is not a valid email address: An email address must have an @-sign.',
      'Informe um e-mail válido.',
    ],
    [
      'Input should be a valid datetime or date, invalid character in year',
      'Informe uma data válida',
    ],
    [
      'Input should be a valid integer, unable to parse',
      'Informe um número válido',
    ],
    ['Input should be greater than 0', 'O valor deve ser maior que 0'],
    ['Value error, A senha é muito curta', 'A senha é muito curta'],
  ])('traduz a validação "%s"', (original, esperado) => {
    expect(mensagemAmigavel(original)).toBe(esperado);
  });

  it.each([
    'Informe o próximo prazo do processo.',
    'Processo já cadastrado',
    'Erro ao salvar cliente.',
  ])('mantém mensagens já amigáveis: %s', (mensagem) => {
    expect(mensagemAmigavel(mensagem)).toBe(mensagem);
  });

  it('aceita Error, objeto com detail e texto vazio', () => {
    expect(mensagemAmigavel(new Error('Failed to fetch'))).toMatch(
      /conectar ao servidor/
    );
    expect(mensagemAmigavel({ detail: 'Processo já cadastrado' })).toBe(
      'Processo já cadastrado'
    );
    expect(mensagemAmigavel(null)).toBe(MENSAGEM_ERRO_PADRAO);
    expect(mensagemAmigavel('   ')).toBe(MENSAGEM_ERRO_PADRAO);
    expect(mensagemAmigavel({}, 'Falhou')).toBe('Falhou');
  });

  it.each([
    "TypeError: Cannot read properties of undefined (reading 'map')",
    'ReferenceError: foo is not defined',
    '[object Object]',
    'Something unexpected happened while processing the request',
  ])('troca mensagens técnicas por uma mensagem padrão: %s', (tecnica) => {
    expect(mensagemAmigavel(tecnica)).toBe(MENSAGEM_ERRO_PADRAO);
    expect(mensagemAmigavel(tecnica, 'Não foi possível salvar.')).toBe(
      'Não foi possível salvar.'
    );
  });
});
