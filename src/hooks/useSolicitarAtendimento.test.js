import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSolicitarAtendimento } from './useSolicitarAtendimento';
import { enviarSolicitacaoServico } from '@/services/solicitacoes';

vi.mock('@/services/solicitacoes', () => ({
  enviarSolicitacaoServico: vi.fn(),
}));

const dados = {
  nome: 'Maria Silva',
  email: 'maria@example.com',
  telefone: '+351 912 345 678',
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
  beforeEach(() => vi.clearAllMocks());

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

  it('normaliza os valores e confirma a simulação', async () => {
    enviarSolicitacaoServico.mockResolvedValueOnce({ simulado: true });
    const { result } = renderHook(useSolicitarAtendimento);
    preencher(
      result,
      Object.fromEntries(
        Object.entries(dados).map(([field, value]) => [field, ` ${value} `])
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
      resolve({ simulado: true });
      await pending;
    });
    expect(result.current.status).toBe('confirmacao');
  });

  it.each([
    [new Error('Falha na simulação.'), 'Falha na simulação.'],
    [null, 'Não foi possível concluir a simulação. Tente novamente.'],
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
      enviarSolicitacaoServico.mockResolvedValueOnce({ simulado: true });
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
});
