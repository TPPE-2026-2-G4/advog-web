'use client';

import { useEffect, useRef } from 'react';
import { Check, Filter, RefreshCw, X } from 'lucide-react';
import LoadingDots from '@/components/ui/LoadingDots/LoadingDots';
import { obterConfigTipo } from '@/constants/notificacoes';
import { formatarDataRelativa, resolverLinkDestino } from '@/utils/notificacao';
import styles from './NotificationPopover.module.css';

export default function NotificationPopover({
  notifications = [],
  unreadCount = 0,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  onlyUnread = false,
  error = '',
  onClose,
  onToggleFilter,
  onLoadMore,
  onRetry,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
}) {
  const popoverRef = useRef(null);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!popoverRef.current?.contains(event.target)) onClose();
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || !onLoadMore) return;

    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) onLoadMore();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  const handleNotificationClick = async (notification) => {
    if (!notification.lida) await onMarkRead(notification.id);
    const destination = resolverLinkDestino(notification.link_destino);
    onClose();
    if (destination) onNavigate(destination);
  };

  return (
    <div
      ref={popoverRef}
      id="notifications-popover"
      className={styles.popover}
      role="dialog"
      aria-label="Central de notificações"
    >
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Notificações</h2>
          <p className={styles.subtitle}>
            {unreadCount ? `${unreadCount} não lida(s)` : 'Tudo em dia'}
          </p>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Fechar notificações"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>

      <div className={styles.toolbar}>
        <button
          type="button"
          className={`${styles.filterButton} ${onlyUnread ? styles.active : ''}`}
          aria-pressed={onlyUnread}
          onClick={onToggleFilter}
        >
          <Filter size={15} />
          {onlyUnread ? 'Não lidas' : 'Todas'}
        </button>
        <button
          type="button"
          className={styles.markAllButton}
          disabled={unreadCount === 0}
          onClick={onMarkAllRead}
        >
          <Check size={15} />
          Marcar todas
        </button>
      </div>

      <div className={styles.content}>
        {isLoading && (
          <div className={styles.status} role="status">
            <LoadingDots />
            <span>Carregando notificações...</span>
          </div>
        )}

        {!isLoading && error && (
          <div className={styles.status}>
            <p>{error}</p>
            <button
              type="button"
              className={styles.retryButton}
              onClick={onRetry}
            >
              <RefreshCw size={15} />
              Tentar novamente
            </button>
          </div>
        )}

        {!isLoading && !error && notifications.length === 0 && (
          <p className={styles.empty}>
            {onlyUnread
              ? 'Nenhuma notificação não lida.'
              : 'Você não possui notificações no momento.'}
          </p>
        )}

        {!isLoading && !error && notifications.length > 0 && (
          <ul className={styles.list}>
            {notifications.map((notification) => {
              const config = obterConfigTipo(notification.tipo);
              const Icon = config.icone;
              return (
                <li
                  key={notification.id}
                  className={`${styles.item} ${
                    notification.lida ? '' : styles.unread
                  }`}
                >
                  <button
                    type="button"
                    className={styles.itemButton}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <span className={`${styles.icon} ${config.corBgIcone}`}>
                      <Icon size={17} className={config.corTexto} />
                    </span>
                    <span className={styles.itemBody}>
                      <span className={styles.itemTitle}>
                        {notification.titulo}
                      </span>
                      <span className={styles.itemMessage}>
                        {notification.mensagem}
                      </span>
                      <span className={styles.itemTime}>
                        {formatarDataRelativa(notification.criado_em)}
                      </span>
                    </span>
                  </button>
                  {!notification.lida && (
                    <button
                      type="button"
                      className={styles.readButton}
                      aria-label={`Marcar "${notification.titulo}" como lida`}
                      onClick={() => onMarkRead(notification.id)}
                    >
                      <Check size={15} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
        {isLoadingMore && (
          <div className={styles.moreLoading}>
            <LoadingDots />
          </div>
        )}
      </div>
    </div>
  );
}
