import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationPopover from './NotificationPopover';

const notification = {
  id: 'notification-1',
  titulo: 'Prazo próximo',
  mensagem: 'O prazo do processo vence amanhã.',
  tipo: 'VENCIMENTO_1D',
  lida: false,
  criado_em: '2026-11-12T12:00:00Z',
  link_destino: '/processos/1',
};

const createProps = (overrides = {}) => ({
  notifications: [notification],
  unreadCount: 1,
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  onlyUnread: false,
  error: '',
  onClose: vi.fn(),
  onToggleFilter: vi.fn(),
  onLoadMore: vi.fn(),
  onRetry: vi.fn(),
  onMarkRead: vi.fn().mockResolvedValue(undefined),
  onMarkAllRead: vi.fn(),
  onNavigate: vi.fn(),
  ...overrides,
});

describe('NotificationPopover', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza a lista e permite marcar todas como lidas', () => {
    const props = createProps();
    render(<NotificationPopover {...props} />);

    expect(
      screen.getByRole('dialog', { name: 'Central de notificações' })
    ).toBeInTheDocument();
    expect(screen.getByText('Prazo próximo')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Marcar todas/i }));
    expect(props.onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it('marca o item como lido antes de navegar para uma rota interna', async () => {
    const props = createProps();
    render(<NotificationPopover {...props} />);

    fireEvent.click(
      screen.getAllByRole('button', { name: /Prazo próximo/i })[0]
    );

    await waitFor(() => {
      expect(props.onMarkRead).toHaveBeenCalledWith('notification-1');
      expect(props.onNavigate).toHaveBeenCalledWith('/processos/1');
      expect(props.onClose).toHaveBeenCalled();
    });
  });

  it('permite marcar diretamente um item não lido', () => {
    const props = createProps();
    render(<NotificationPopover {...props} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Marcar "Prazo próximo" como lida' })
    );

    expect(props.onMarkRead).toHaveBeenCalledWith('notification-1');
  });

  it('não navega para destinos externos', async () => {
    const props = createProps({
      notifications: [{ ...notification, link_destino: 'javascript:alert(1)' }],
    });
    render(<NotificationPopover {...props} />);

    fireEvent.click(
      screen.getAllByRole('button', { name: /Prazo próximo/i })[0]
    );

    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
    expect(props.onNavigate).not.toHaveBeenCalled();
  });

  it('não marca novamente uma notificação já lida', async () => {
    const props = createProps({
      notifications: [{ ...notification, lida: true }],
    });
    render(<NotificationPopover {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /Prazo próximo/i }));

    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
    expect(props.onMarkRead).not.toHaveBeenCalled();
    expect(props.onNavigate).toHaveBeenCalledWith('/processos/1');
  });

  it('notifica o carregamento adicional quando o sentinela fica visível', async () => {
    let callback;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(observerCallback) {
          callback = observerCallback;
        }

        observe() {}
        disconnect() {}
      }
    );
    const props = createProps({ hasMore: true });
    render(<NotificationPopover {...props} />);

    await act(async () => callback([{ isIntersecting: true }]));
    expect(props.onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('mostra o indicador de carregamento da próxima página', () => {
    render(<NotificationPopover {...createProps({ isLoadingMore: true })} />);

    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('exibe loading, erro com retry e estado vazio', () => {
    const { rerender } = render(
      <NotificationPopover {...createProps({ isLoading: true })} />
    );
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);

    const retry = vi.fn();
    rerender(
      <NotificationPopover
        {...createProps({
          error: 'Falha ao carregar.',
          onRetry: retry,
        })}
      />
    );
    expect(screen.getByText('Falha ao carregar.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }));
    expect(retry).toHaveBeenCalledTimes(1);

    rerender(
      <NotificationPopover
        {...createProps({ notifications: [], onlyUnread: true })}
      />
    );
    expect(
      screen.getByText('Nenhuma notificação não lida.')
    ).toBeInTheDocument();
  });

  it('fecha com Escape e clique fora', () => {
    const props = createProps();
    render(
      <div>
        <NotificationPopover {...props} />
        <button type="button">Fora</button>
      </div>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Fora' }));
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });
});
