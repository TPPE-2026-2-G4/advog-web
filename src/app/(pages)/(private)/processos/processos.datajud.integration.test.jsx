import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProcessosClient from './processosClient';
import { PROCESS_REFRESH_MS } from '@/hooks/useProcessos';

const original = {
  processo_id: 10,
  cnj: '0061234-56.2026.8.26.0100',
  titulo: 'Ação de Cobrança',
  descricao: 'Dados cadastrados do processo',
  cliente_id: 1,
  funcionario_id: 2,
  status: 'Ativo',
  tribunal: 'TJSP',
  area: 'Civil',
  data_inicio: '2026-01-10T10:00:00',
  data_realizado: null,
  data_prazo: '2026-11-01T18:00:00',
};
const updated = {
  ...original,
  status: 'Concluído',
  tribunal: 'TJDFT',
  data_realizado: '2026-10-29T12:00:00',
};
const json = (data, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: async () => data });
const page = (items) => ({
  itens: items,
  total: items.length,
  page: 1,
  page_size: 5,
  total_pages: 1,
});
let storedProcess;
let syncResponse;
let failList;

const allow = (canEdit = true, canView = true) =>
  sessionStorage.setItem(
    'current_user',
    JSON.stringify({
      cargo: {
        permissao: { visualizar_processos: canView, editar_processos: canEdit },
      },
    })
  );
const openDetails = async () => {
  fireEvent.click(
    await screen.findByRole('button', {
      name: `Visualizar processo ${original.cnj}`,
    })
  );
  return screen.getByRole('dialog');
};
const syncCalls = () =>
  fetch.mock.calls.filter(([url]) => url.endsWith('/sincronizar'));
const listCalls = () =>
  fetch.mock.calls.filter(([url]) => new URL(url).pathname === '/processos/');

describe('US19 — integração do frontend com o contrato HTTP de processos', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    sessionStorage.setItem('access_token', 'token-teste');
    allow();
    storedProcess = { ...original };
    failList = false;
    syncResponse = () => {
      storedProcess = { ...updated };
      return json({
        atualizados: 1,
        mensagem: '1 processos sincronizados com sucesso via Datajud.',
      });
    };
    vi.stubGlobal(
      'fetch',
      vi.fn((url, options) => {
        const parsed = new URL(url);
        if (parsed.pathname === '/clientes/')
          return json([{ cliente_id: 1, nome: 'João da Silva' }]);
        if (parsed.pathname === '/funcionarios')
          return json([{ funcionario_id: 2, nome: 'Dr. Lucas Mendes' }]);
        if (parsed.pathname === '/processos/sincronizar') return syncResponse();
        if (parsed.pathname === '/processos/') {
          if (failList) return json({ detail: 'Consulta indisponível' }, 503);
          expect(options.headers.Authorization).toBe('Bearer token-teste');
          const status = parsed.searchParams.get('status');
          return json(
            page(
              status && status !== storedProcess.status ? [] : [storedProcess]
            )
          );
        }
        throw new Error(`Requisição inesperada: ${url}`);
      })
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('carrega com o token do navegador, sincroniza e atualiza lista e detalhe mesmo fora do filtro', async () => {
    render(<ProcessosClient />);
    await screen.findByRole('button', { name: original.titulo });
    fireEvent.change(
      screen.getByRole('combobox', { name: /filtrar por status/i }),
      { target: { value: 'Ativo' } }
    );
    await waitFor(() =>
      expect(listCalls().some(([url]) => url.includes('status=Ativo'))).toBe(
        true
      )
    );
    const dialog = await openDetails();
    await within(dialog).findByText('Dr. Lucas Mendes');
    expect(within(dialog).getByText('Não informado')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Sincronizar com DataJud' })
    );
    await screen.findByText('Sincronização concluída: 1 processo atualizado.');
    await within(dialog).findByText('29/10/2026');
    expect(within(dialog).getByText('TJDFT')).toBeInTheDocument();
    expect(within(dialog).getByText('Concluído')).toBeInTheDocument();
    expect(
      await screen.findByText('Nenhum processo encontrado')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: /filtrar por status/i })
    ).toHaveValue('Ativo');
    expect(syncCalls()).toHaveLength(1);
    expect(syncCalls()[0][1]).toEqual({
      method: 'POST',
      headers: { Authorization: 'Bearer token-teste' },
    });
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Movimentações' }));
    expect(
      within(dialog).getByText(
        'O histórico de movimentações ainda não está disponível.'
      )
    ).toBeInTheDocument();
    expect(within(dialog).queryByText('DataJud')).not.toBeInTheDocument();
  });

  it.each([401, 403, 500])(
    'mantém os dados e permite tentar novamente quando a sincronização retorna %s',
    async (status) => {
      syncResponse = () => json({ detail: 'DataJud indisponível' }, status);
      render(<ProcessosClient />);
      await screen.findByRole('button', { name: original.titulo });
      fireEvent.click(
        screen.getByRole('button', { name: 'Sincronizar com DataJud' })
      );
      const message =
        status === 401
          ? 'Sessão expirada. Faça login novamente.'
          : status === 403
            ? 'Você não possui permissão para realizar esta ação.'
            : 'DataJud indisponível';
      await screen.findByText(message);
      expect(
        screen.getByRole('button', { name: original.titulo })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Sincronizar com DataJud' })
      ).toBeEnabled();
      expect(
        screen.queryByText(/Sincronização concluída/)
      ).not.toBeInTheDocument();
    }
  );

  it('bloqueia cliques repetidos e informa quando nenhum processo foi atualizado', async () => {
    let finish;
    syncResponse = () =>
      new Promise((resolve) => {
        finish = resolve;
      });
    render(<ProcessosClient />);
    await screen.findByRole('button', { name: original.titulo });
    const button = screen.getByRole('button', {
      name: 'Sincronizar com DataJud',
    });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(syncCalls()).toHaveLength(1);
    await act(async () =>
      finish(
        await json({ atualizados: 0, mensagem: '0 processos sincronizados' })
      )
    );
    expect(
      await screen.findByText(
        'Sincronização concluída. Nenhum processo foi atualizado.'
      )
    ).toBeInTheDocument();
  });

  it('permite consultar sem editar e não faz chamadas sem permissão de visualização', async () => {
    allow(false);
    const { unmount } = render(<ProcessosClient />);
    await screen.findByRole('button', { name: original.titulo });
    expect(
      screen.queryByRole('button', { name: 'Sincronizar com DataJud' })
    ).not.toBeInTheDocument();
    unmount();
    fetch.mockClear();
    allow(false, false);
    render(<ProcessosClient />);
    expect(screen.getByText('Acesso negado')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('consulta alterações do job em segundo plano sem disparar POST, pausa oculta e limpa timers', async () => {
    vi.useFakeTimers();
    let unmount;
    await act(async () => {
      ({ unmount } = render(<ProcessosClient />));
    });
    expect(
      screen.getByRole('button', { name: original.titulo })
    ).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: `Visualizar processo ${original.cnj}`,
        })
      );
    });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Não informado')).toBeInTheDocument();
    storedProcess = { ...updated };
    await act(async () => vi.advanceTimersByTimeAsync(PROCESS_REFRESH_MS));
    expect(within(dialog).getByText('29/10/2026')).toBeInTheDocument();
    expect(syncCalls()).toHaveLength(0);
    const count = listCalls().length;
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await act(async () => vi.advanceTimersByTimeAsync(PROCESS_REFRESH_MS));
    expect(listCalls()).toHaveLength(count);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    await act(async () =>
      document.dispatchEvent(new Event('visibilitychange'))
    );
    expect(listCalls().length).toBeGreaterThan(count);
    unmount();
    const callsBeforeUnmount = fetch.mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(PROCESS_REFRESH_MS));
    expect(fetch).toHaveBeenCalledTimes(callsBeforeUnmount);
  });

  it('preserva lista e detalhe na falha de atualização e recupera ao voltar para a janela', async () => {
    render(<ProcessosClient />);
    await screen.findByRole('button', { name: original.titulo });
    const dialog = await openDetails();
    failList = true;
    fireEvent(window, new Event('focus'));
    await screen.findByText('Os dados exibidos podem estar desatualizados.', {
      exact: false,
    });
    expect(
      screen.getByRole('button', { name: original.titulo })
    ).toBeInTheDocument();
    expect(within(dialog).getByText('TJSP')).toBeInTheDocument();
    failList = false;
    storedProcess = { ...updated };
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Tentar novamente' })
    );
    await within(dialog).findByText('29/10/2026');
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    );
  });
});
