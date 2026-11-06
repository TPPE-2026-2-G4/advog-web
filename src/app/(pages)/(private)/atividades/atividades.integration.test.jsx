import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AtividadesPage from './page';
import AtividadesClient from './atividadesClient';

const atividade = (id) => ({
  atividade_id: id,
  titulo: `Atividade ${id}`,
  data_prazo: '2026-12-01T18:00:00',
  processo_id: null,
  responsaveis: [],
});

const kanban = {
  escopo: 'escritorio',
  etapas: [
    { etapa_id: 4, nome: 'Finalizado', ordem: 4, atividades: [atividade(7)] },
    {
      etapa_id: 1,
      nome: 'Backlog',
      ordem: 1,
      atividades: [atividade(1), atividade(2), atividade(3)],
    },
    {
      etapa_id: 3,
      nome: 'Revisão',
      ordem: 3,
      atividades: [atividade(5), atividade(6)],
    },
    {
      etapa_id: 2,
      nome: 'Em Execução',
      ordem: 2,
      atividades: [atividade(4)],
    },
  ],
};

describe('AtividadesClient integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    sessionStorage.setItem('access_token', 'fake-valid-token');

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('/atividades/kanban')) {
          return {
            ok: true,
            status: 200,
            json: async () => kanban,
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('renderiza AtividadesPage como wrapper de AtividadesClient', () => {
    const page = AtividadesPage();
    expect(page).toBeTruthy();
  });

  it('exibe o total e a contagem de cada etapa na ordem do quadro via fetch', async () => {
    render(<AtividadesClient />);

    await waitFor(() =>
      expect(screen.getByText('Total').nextSibling).toHaveTextContent('7')
    );

    const labels = screen
      .getAllByRole('listitem')
      .map((item) => item.firstChild.textContent);
    expect(labels).toEqual([
      'Total',
      'Backlog',
      'Em Execução',
      'Revisão',
      'Finalizado',
    ]);
    expect(screen.getByText('Backlog').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('Em Execução').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Revisão').nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Finalizado').nextSibling).toHaveTextContent('1');
  });

  it('mostra traços enquanto os dados carregam', () => {
    fetch.mockReturnValue(new Promise(() => {}));

    render(<AtividadesClient />);

    expect(screen.getByText('Total').nextSibling).toHaveTextContent('—');
  });

  it('trata erro quando usuário não tem token na sessão', async () => {
    sessionStorage.removeItem('access_token');

    render(<AtividadesClient />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Sessão expirada. Faça login novamente.'
      )
    );
  });

  it('trata erro 401 de sessão expirada retornado pela API', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Token inválido' }),
    });

    render(<AtividadesClient />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Sessão expirada. Faça login novamente.'
      )
    );
  });

  it('trata erro 403 de permissão negada retornado pela API', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ detail: 'Acesso negado' }),
    });

    render(<AtividadesClient />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Você não possui permissão para visualizar as atividades.'
      )
    );
  });

  it('permite tentar novamente quando o carregamento falha por falha de rede', async () => {
    fetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => kanban,
      });

    render(<AtividadesClient />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Não foi possível carregar as atividades.'
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() =>
      expect(screen.getByText('Total').nextSibling).toHaveTextContent('7')
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
