import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Navbar from './navbar';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));
let observerCallback;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const notification = (id, overrides = {}) => ({
  id,
  funcionario_id: 10,
  titulo: `Notificação ${id}`,
  mensagem: `Mensagem da notificação ${id}`,
  tipo: 'SISTEMA',
  lida: false,
  link_destino: `/processos/${id}`,
  criado_em: '2026-11-12T12:00:00Z',
  ...overrides,
});

const response = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue(data),
});

const renderNavbar = () => {
  sessionStorage.setItem('access_token', 'token-integracao');
  sessionStorage.setItem(
    'current_user',
    JSON.stringify({
      funcionario_id: 10,
      nome: 'Alexandre Carreiro',
      cargo: 'Advogado(a)',
      email: 'alexandre@carreiro.adv.br',
    })
  );
  return render(<Navbar />);
};

const listCalls = () =>
  fetch.mock.calls.filter(([url]) => String(url).includes('/notificacoes?'));

describe('Integração: central de notificações', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback) {
          observerCallback = callback;
        }

        observe() {}
        disconnect() {}
      }
    );
    vi.spyOn(document, 'removeEventListener');
  });

  it('carrega contagem, abre o popover, filtra e marca uma notificação como lida', async () => {
    const first = notification('1');
    const second = notification('2', { lida: true, link_destino: null });
    fetch.mockImplementation(async (url, options = {}) => {
      const path = String(url);
      if (path.includes('/nao-lidas/contagem'))
        return response({ total_nao_lidas: 1 });
      if (path.includes('/notificacoes?')) return response([first, second]);
      if (options.method === 'PATCH' && path.endsWith('/1/lida')) {
        return response({ ...first, lida: true });
      }
      return response({ alteradas: 1 });
    });

    renderNavbar();
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Notificações' }));
    expect(
      await screen.findByRole('dialog', { name: 'Central de notificações' })
    ).toBeInTheDocument();
    expect(screen.getByText('Notificação 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    await waitFor(() =>
      expect(listCalls().at(-1)?.[0]).toContain('apenas_nao_lidas=true')
    );

    fireEvent.click(
      screen.getAllByRole('button', { name: /Notificação 1/i })[0]
    );
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/notificacoes/1/lida'),
        expect.objectContaining({ method: 'PATCH' })
      );
      expect(pushMock).toHaveBeenCalledWith('/processos/1');
    });
  });

  it('carrega uma página adicional pelo sentinela e deduplica itens', async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) =>
      notification(String(index + 1))
    );
    const secondPage = [notification('20'), notification('21')];
    let listRequest = 0;
    fetch.mockImplementation(async (url) => {
      const path = String(url);
      if (path.includes('/nao-lidas/contagem'))
        return response({ total_nao_lidas: 20 });
      if (path.includes('/notificacoes?')) {
        listRequest += 1;
        return response(listRequest === 1 ? firstPage : secondPage);
      }
      return response({ alteradas: 0 });
    });

    renderNavbar();
    await waitFor(() => expect(screen.getByText('20')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Notificações' }));
    await screen.findByRole('dialog', { name: 'Central de notificações' });

    await act(async () => observerCallback([{ isIntersecting: true }]));
    await waitFor(() => expect(listCalls()).toHaveLength(2));
    expect(screen.getAllByText('Notificação 20')).toHaveLength(1);
    expect(screen.getByText('Notificação 21')).toBeInTheDocument();
  });

  it('exibe erro de carregamento e permite tentar novamente', async () => {
    let shouldFail = true;
    fetch.mockImplementation(async (url) => {
      if (String(url).includes('/nao-lidas/contagem')) {
        return response({ total_nao_lidas: 0 });
      }
      if (shouldFail) {
        shouldFail = false;
        return response({ detail: 'Falha controlada' }, 500);
      }
      return response([]);
    });

    renderNavbar();
    fireEvent.click(screen.getByRole('button', { name: 'Notificações' }));
    expect(await screen.findByText('Falha controlada')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }));
    await waitFor(() =>
      expect(
        screen.getByText('Você não possui notificações no momento.')
      ).toBeInTheDocument()
    );
  });

  it('marca todas como lidas e fecha com Escape e clique fora', async () => {
    fetch.mockImplementation(async (url, options = {}) => {
      const path = String(url);
      if (path.includes('/nao-lidas/contagem'))
        return response({ total_nao_lidas: 2 });
      if (path.includes('/notificacoes?')) return response([notification('1')]);
      if (options.method === 'PATCH' && path.endsWith('/marcar-todas-lidas')) {
        return response({ alteradas: 1 });
      }
      return response({ ...notification('1'), lida: true });
    });

    renderNavbar();
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Notificações' }));
    await screen.findByRole('dialog', { name: 'Central de notificações' });

    fireEvent.click(screen.getByRole('button', { name: /Marcar todas/i }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/marcar-todas-lidas'),
        expect.objectContaining({ method: 'PATCH' })
      )
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('dialog', { name: 'Central de notificações' })
    ).not.toBeInTheDocument();
  });
});
