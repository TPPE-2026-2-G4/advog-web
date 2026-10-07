import { afterEach, describe, expect, it, vi } from 'vitest';
import { enviarSolicitacaoServico } from './solicitacoes';

describe('enviarSolicitacaoServico', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('simula o envio sem chamadas HTTP ou persistência', async () => {
    const fetchMock = vi.fn();
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      enviarSolicitacaoServico({
        nome: 'Maria Silva',
        email: 'maria@example.com',
        telefone: '(61) 99999-9999',
        descricao: 'Gostaria de solicitar atendimento.',
      })
    ).resolves.toEqual({ simulado: true });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });
});
