import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSavedDashboardPrefs,
  getSavedInitialPage,
} from '@/hooks/useAjustes';
import { clearAuthSession } from '@/utils/authSession';
import AjustesPage from './page';

describe('Integração: Página de Ajustes (/ajustes)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    sessionStorage.clear();
    localStorage.clear();
    sessionStorage.setItem('access_token', 'token-jwt');
    sessionStorage.setItem(
      'current_user',
      JSON.stringify({
        funcionario_id: 1,
        nome: 'Alexandre Carreiro',
        email: 'alexandre@carreiro.adv.br',
        receber_emails: true,
      })
    );
    localStorage.setItem(
      'current_user',
      JSON.stringify({
        funcionario_id: 1,
        nome: 'Alexandre Carreiro',
        email: 'alexandre@carreiro.adv.br',
        receber_emails: true,
      })
    );
  });

  afterEach(() => {
    clearAuthSession();
    vi.unstubAllGlobals();
  });

  it('carrega dados iniciais, verifica DataJud e Infraestrutura e só persiste alterações após clicar no botão Salvar geral', async () => {
    fetch.mockImplementation(async (url, options) => {
      const urlStr = String(url);

      if (urlStr.endsWith('/funcionarios') && !options?.method) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              funcionario_id: 99,
              nome: 'Outro Advogado',
              email: 'outro@carreiro.adv.br',
              receber_emails: false,
            },
            {
              funcionario_id: 1,
              nome: 'Alexandre Carreiro',
              email: 'alexandre@carreiro.adv.br',
              receber_emails: true,
            },
          ],
        };
      }

      if (urlStr.endsWith('/processos/datajud/status')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            online: true,
            status: 'online',
            mensagem: 'Integração conectada · Sincronização automática ativa',
          }),
        };
      }

      if (urlStr.endsWith('/health/ready')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ready',
            database: 'ok',
            storage: 'ok',
          }),
        };
      }

      if (
        urlStr.endsWith('/funcionarios/1/receber-emails') &&
        options?.method === 'PATCH'
      ) {
        const body = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            funcionario_id: 1,
            nome: 'Alexandre Carreiro',
            email: 'alexandre@carreiro.adv.br',
            receber_emails: body.receber_emails,
          }),
        };
      }

      return { ok: false, status: 404, json: async () => ({}) };
    });

    const Page = await AjustesPage();
    render(Page);

    expect(
      screen.getByRole('heading', { name: 'Ajustes' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Receba alertas de prazos e movimentações/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId('email-notification-status')).toHaveTextContent(
      'Ativo'
    );

    await waitFor(() => {
      expect(screen.queryByTestId('datajud-status-badge')).toBeNull();
      expect(screen.getByTestId('infra-status-badge')).toHaveTextContent(
        'Online'
      );
    });
    expect(
      screen.getByText('Serviço de anexos e banco de dados operacionais')
    ).toBeInTheDocument();

    // Testa re-verificação manual do Armazenamento
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Testar conexão com o armazenamento',
      })
    );
    await waitFor(() => {
      expect(screen.getByTestId('infra-status-badge')).toHaveTextContent(
        'Online'
      );
    });

    // Altera página inicial padrão, filtro de processos, prazo próximo e processos críticos
    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Selecionar página inicial padrão',
      }),
      { target: { value: '/processos' } }
    );
    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Selecionar filtro padrão de processos',
      }),
      { target: { value: 'meus_processos' } }
    );
    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Selecionar antecedência de prazos próximos',
      }),
      { target: { value: '30' } }
    );
    const criticalInput = screen.getByRole('spinbutton', {
      name: 'Dias sem movimentação para processo crítico',
    });
    fireEvent.change(criticalInput, { target: { value: '45' } });

    // Abre o modal de e-mail e cancela primeiro
    fireEvent.click(
      screen.getByRole('button', { name: 'Bloquear notificações por e-mail' })
    );
    expect(
      screen.getByRole('heading', { name: 'Desabilitar notificações?' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(
      screen.queryByRole('heading', { name: 'Desabilitar notificações?' })
    ).not.toBeInTheDocument();

    // Abre o modal novamente e confirma o bloqueio (estado fica pendente até clicar em Salvar)
    fireEvent.click(
      screen.getByRole('button', { name: 'Bloquear notificações por e-mail' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Desabilitar notificações' })
    );
    expect(screen.getByTestId('email-notification-status')).toHaveTextContent(
      'Bloqueado'
    );

    // Antes de clicar em Salvar, nada foi persistido no localStorage ainda
    expect(getSavedInitialPage()).toBe('/dashboard');

    // Clica no botão Salvar geral no topo direito
    fireEvent.click(screen.getByRole('button', { name: /Salvar/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Ajustes salvos com sucesso.'
      );
    });

    expect(getSavedInitialPage()).toBe('/processos');
    expect(getSavedDashboardPrefs()).toEqual({
      escopoProcessos: 'meus_processos',
      diasPrazo: 30,
      diasCritico: 45,
    });

    // Reativa notificações por e-mail e salva novamente
    fireEvent.click(
      screen.getByRole('button', { name: 'Ativar notificações por e-mail' })
    );
    expect(
      screen.getByRole('heading', { name: 'Habilitar notificações?' })
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Habilitar notificações' })
    );
    fireEvent.click(screen.getByRole('button', { name: /Salvar/i }));

    await waitFor(() => {
      expect(screen.getByTestId('email-notification-status')).toHaveTextContent(
        'Ativo'
      );
      expect(screen.getByRole('status')).toHaveTextContent(
        'Ajustes salvos com sucesso.'
      );
    });
  });

  it('localiza membro por e-mail, exibe status Offline do DataJud e da Infraestrutura e trata erro ao salvar preferência de e-mail', async () => {
    sessionStorage.setItem(
      'current_user',
      JSON.stringify({
        email: 'alexandre@carreiro.adv.br',
      })
    );

    fetch.mockImplementation(async (url, options) => {
      const urlStr = String(url);

      if (urlStr.endsWith('/funcionarios') && !options?.method) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              funcionario_id: 7,
              nome: 'Alexandre Carreiro',
              email: 'ALEXANDRE@carreiro.adv.br',
            },
          ],
        };
      }

      if (
        urlStr.endsWith('/processos/datajud/status') ||
        urlStr.endsWith('/health/ready')
      ) {
        return {
          ok: false,
          status: 503,
          json: async () => ({ detail: 'Serviço indisponível' }),
        };
      }

      if (
        urlStr.endsWith('/funcionarios/7/receber-emails') &&
        options?.method === 'PATCH'
      ) {
        return {
          ok: false,
          status: 400,
          json: async () => ({ detail: 'Funcionário não encontrado' }),
        };
      }

      return { ok: false, status: 404, json: async () => ({}) };
    });

    const Page = await AjustesPage();
    render(Page);

    await waitFor(() => {
      expect(screen.queryByTestId('datajud-status-badge')).toBeNull();
      expect(screen.getByTestId('infra-status-badge')).toHaveTextContent(
        'Offline'
      );
    });
    expect(
      screen.getByText(
        'Falha na comunicação com o armazenamento ou banco de dados'
      )
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Bloquear notificações por e-mail' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Desabilitar notificações' })
    );
    fireEvent.click(screen.getByRole('button', { name: /Salvar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Funcionário não encontrado'
      );
    });
  });

  it('exibe erro quando não há usuário logado ao salvar e valida entrada inválida em Processos Críticos', async () => {
    sessionStorage.removeItem('current_user');
    localStorage.removeItem('current_user');

    fetch.mockImplementation(async (url, options) => {
      const urlStr = String(url);

      if (urlStr.endsWith('/funcionarios') && !options?.method) {
        return {
          ok: true,
          status: 200,
          json: async () => [],
        };
      }

      if (urlStr.endsWith('/processos/datajud/status')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ online: false }),
        };
      }

      if (urlStr.endsWith('/health/ready')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'unhealthy',
            database: 'ok',
            storage: 'erro',
          }),
        };
      }

      return { ok: false, status: 404, json: async () => ({}) };
    });

    const Page = await AjustesPage();
    render(Page);

    await waitFor(() => {
      expect(screen.queryByTestId('datajud-status-badge')).toBeNull();
      expect(screen.getByTestId('infra-status-badge')).toHaveTextContent(
        'Offline'
      );
    });

    const criticalInput = screen.getByRole('spinbutton', {
      name: 'Dias sem movimentação para processo crítico',
    });
    fireEvent.change(criticalInput, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Informe uma quantidade válida entre 1 e 365 dias sem movimentação.'
    );

    fireEvent.change(criticalInput, { target: { value: '30' } });
    fireEvent.click(
      screen.getByRole('button', { name: 'Bloquear notificações por e-mail' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Desabilitar notificações' })
    );
    fireEvent.click(screen.getByRole('button', { name: /Salvar/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível identificar o usuário logado.'
    );
  });

  it('hidrata o HTML renderizado no servidor sem erro de mismatch quando há usuário no storage', async () => {
    fetch.mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/funcionarios')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              funcionario_id: 1,
              nome: 'Alexandre Carreiro',
              email: 'alexandre@carreiro.adv.br',
              receber_emails: true,
            },
          ],
        };
      }
      if (urlStr.endsWith('/processos/datajud/status')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            online: true,
            status: 'online',
            mensagem: 'Integração conectada · Sincronização automática ativa',
          }),
        };
      }
      if (urlStr.endsWith('/health/ready')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ready',
            database: 'ok',
            storage: 'ok',
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const Page = await AjustesPage();
    const ssrHtml = renderToString(Page);

    const container = document.createElement('div');
    container.innerHTML = ssrHtml;
    document.body.appendChild(container);

    render(Page, { container, hydrate: true });

    await waitFor(() => {
      expect(
        screen.getByText('Receba alertas de prazos e movimentações')
      ).toBeInTheDocument();
    });

    const hydrationErrors = errorSpy.mock.calls.filter((args) =>
      args.some(
        (arg) =>
          typeof arg === 'string' &&
          (arg.includes('Hydration failed') ||
            arg.includes('did not match') ||
            arg.includes("didn't match"))
      )
    );
    expect(hydrationErrors).toHaveLength(0);

    document.body.removeChild(container);
    errorSpy.mockRestore();
  });
});
