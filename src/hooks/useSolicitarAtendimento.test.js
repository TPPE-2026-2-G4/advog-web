import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSolicitarAtendimento } from './useSolicitarAtendimento';
import { enviarSolicitacaoServico } from '@/services/solicitacoes';

vi.mock('@/services/solicitacoes', async (importOriginal) => ({
  ...(await importOriginal()),
  enviarSolicitacaoServico: vi.fn(),
}));

const dados = {
  nome: 'Maria Silva',
  email: 'maria@example.com',
  telefone: '61999999999',
  descricao: 'Gostaria de solicitar atendimento.',
};

function preencher(result, values = dados) {
  act(() => {
    for (const [name, value] of Object.entries(values)) {
      result.current.handleChange({ target: { name, value } });
    }
  });
}

const submitEvent = () => ({ preventDefault: vi.fn() });

describe('useSolicitarAtendimento', () => {
  beforeEach(() => vi.resetAllMocks());

  it('inicia vazio, exige os quatro campos e foca o primeiro inválido', async () => {
    const { result } = renderHook(useSolicitarAtendimento);
    const focus = vi.fn();
    const namedItem = vi.fn().mockReturnValue({ focus });
    result.current.formRef.current = { elements: { namedItem } };

    expect(result.current.status).toBe('preenchimento');
    expect(Object.values(result.current.formData)).toEqual(['', '', '', '']);
    preencher(result, { nome: '   ' });
    const event = submitEvent();
    await act(() => result.current.handleSubmit(event));

    expect(event.preventDefault).toHaveBeenCalled();
    expect(Object.keys(result.current.errors)).toEqual(Object.keys(dados));
    expect(namedItem).toHaveBeenCalledWith('nome');
    expect(focus).toHaveBeenCalled();
    expect(enviarSolicitacaoServico).not.toHaveBeenCalled();
  });

  it('rejeita email inválido e limpa seu erro ao editar', async () => {
    const { result } = renderHook(useSolicitarAtendimento);
    preencher(result, { ...dados, email: 'email-invalido' });
    await act(() => result.current.handleSubmit(submitEvent()));

    expect(result.current.errors.email).toBe('Informe um email válido.');
    expect(enviarSolicitacaoServico).not.toHaveBeenCalled();
    preencher(result, { email: dados.email });
    expect(result.current.errors.email).toBe('');
  });

  it('normaliza os valores e confirma o envio', async () => {
    enviarSolicitacaoServico.mockResolvedValueOnce({
      cliente_id: 21,
      etapa_id: 1,
    });
    const { result } = renderHook(useSolicitarAtendimento);
    preencher(
      result,
      Object.fromEntries(
        Object.entries({ ...dados, telefone: '(61) 99999-9999' }).map(
          ([field, value]) => [field, ` ${value} `]
        )
      )
    );
    await act(() => result.current.handleSubmit(submitEvent()));

    expect(enviarSolicitacaoServico).toHaveBeenCalledWith(dados);
    expect(result.current.status).toBe('confirmacao');
  });

  it('bloqueia submissões duplicadas enquanto aguarda', async () => {
    let resolve;
    enviarSolicitacaoServico.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      })
    );
    const { result } = renderHook(useSolicitarAtendimento);
    preencher(result);
    let pending;
    act(() => {
      pending = result.current.handleSubmit(submitEvent());
    });
    expect(result.current.status).toBe('processamento');
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(enviarSolicitacaoServico).toHaveBeenCalledOnce();
    await act(async () => {
      resolve({ cliente_id: 21, etapa_id: 1 });
      await pending;
    });
    expect(result.current.status).toBe('confirmacao');
  });

  it.each([
    [new Error('Falha no envio.'), 'Falha no envio.'],
    [null, 'Não foi possível enviar sua solicitação. Tente novamente.'],
  ])(
    'preserva os dados após erro e permite nova tentativa (%s)',
    async (error, message) => {
      enviarSolicitacaoServico.mockRejectedValueOnce(error);
      const { result } = renderHook(useSolicitarAtendimento);
      preencher(result);
      await act(() => result.current.handleSubmit(submitEvent()));

      expect(result.current.erro).toBe(message);
      expect(result.current.formData).toEqual(dados);
      expect(result.current.status).toBe('preenchimento');
      preencher(result, { descricao: dados.descricao });
      expect(result.current.erro).toBe('');
      enviarSolicitacaoServico.mockResolvedValueOnce({
        cliente_id: 21,
        etapa_id: 1,
      });
      await act(() => result.current.handleSubmit(submitEvent()));
      expect(result.current.status).toBe('confirmacao');
    }
  );

  it('limpa valores e mensagens ao reiniciar', async () => {
    const { result } = renderHook(useSolicitarAtendimento);
    preencher(result, { ...dados, email: '' });
    await act(() => result.current.handleSubmit(submitEvent()));
    act(() => result.current.resetForm());

    expect(Object.values(result.current.formData)).toEqual(['', '', '', '']);
    expect(result.current.errors).toEqual({});
    expect(result.current.erro).toBe('');
    expect(result.current.status).toBe('preenchimento');
  });

  it.each([
    ['nome', 'An', 'Nome deve conter de 3 a 100 caracteres.'],
    ['nome', 'A'.repeat(101), 'Nome deve conter de 3 a 100 caracteres.'],
    ['descricao', 'Curto', 'Descrição deve conter de 10 a 2000 caracteres.'],
    [
      'descricao',
      'D'.repeat(2001),
      'Descrição deve conter de 10 a 2000 caracteres.',
    ],
    [
      'telefone',
      '12345',
      'Telefone deve conter DDD + número (10 ou 11 dígitos).',
    ],
    [
      'telefone',
      '+351 912 345 678',
      'Telefone deve conter DDD + número (10 ou 11 dígitos).',
    ],
    [
      'telefone',
      'abc',
      'Telefone deve conter DDD + número (10 ou 11 dígitos).',
    ],
  ])('rejeita %s fora das regras do backend', async (field, value, message) => {
    const { result } = renderHook(useSolicitarAtendimento);
    preencher(result, { ...dados, [field]: value });
    await act(() => result.current.handleSubmit(submitEvent()));

    expect(result.current.errors[field]).toBe(message);
    expect(enviarSolicitacaoServico).not.toHaveBeenCalled();
  });

  it.each([
    ['Ana', '1234567890', '6133334444'],
    ['A'.repeat(100), 'D'.repeat(2000), '61999999999'],
  ])(
    'aceita os limites de nome, descrição e telefone',
    async (nome, descricao, telefone) => {
      enviarSolicitacaoServico.mockResolvedValueOnce({ cliente_id: 21 });
      const { result } = renderHook(useSolicitarAtendimento);
      preencher(result, { ...dados, nome, descricao, telefone });
      await act(() => result.current.handleSubmit(submitEvent()));

      expect(enviarSolicitacaoServico).toHaveBeenCalledWith({
        ...dados,
        nome,
        descricao,
        telefone,
      });
      expect(result.current.status).toBe('confirmacao');
    }
  );

  it('foca o primeiro erro na ordem dos campos, mesmo com tipos de erro diferentes', async () => {
    const { result } = renderHook(useSolicitarAtendimento);
    const namedItem = vi.fn().mockReturnValue({ focus: vi.fn() });
    result.current.formRef.current = { elements: { namedItem } };
    preencher(result, { ...dados, nome: 'An', descricao: '' });
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(namedItem).toHaveBeenCalledWith('nome');
  });

  it('apresenta os erros de validação da API e foca o campo rejeitado', async () => {
    const error = Object.assign(
      new Error('Confira os dados informados e tente novamente.'),
      {
        fields: { email: 'Informe um email válido.' },
      }
    );
    enviarSolicitacaoServico.mockRejectedValueOnce(error);
    const { result } = renderHook(useSolicitarAtendimento);
    const focus = vi.fn();
    const namedItem = vi.fn().mockReturnValue({ focus });
    result.current.formRef.current = { elements: { namedItem } };
    preencher(result);
    await act(() => result.current.handleSubmit(submitEvent()));

    expect(result.current.errors).toEqual(error.fields);
    expect(result.current.erro).toBe(error.message);
    expect(result.current.formData).toEqual(dados);
    expect(result.current.status).toBe('preenchimento');
    await waitFor(() => {
      expect(namedItem).toHaveBeenCalledWith('email');
      expect(focus).toHaveBeenCalled();
    });
  });
});
