'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { mensagemAmigavel } from '@/utils/erros';
import styles from './Toast.module.css';

const noopSubscribe = () => () => {};
const VIEWPORT_ID = 'toast-viewport';
const DEFAULT_DURATION_MS = { error: 7000, success: 4000, info: 5000 };
const ICONS = { error: AlertCircle, success: CheckCircle2, info: Info };

function obterViewport() {
  let viewport = document.getElementById(VIEWPORT_ID);
  if (!viewport) {
    viewport = document.createElement('div');
    viewport.id = VIEWPORT_ID;
    viewport.className = styles.viewport;
    document.body.appendChild(viewport);
  }
  return viewport;
}

/**
 * Aviso flutuante no topo da tela, que se fecha sozinho após alguns segundos
 * (ou pelo botão X). Mensagens de erro técnicas são traduzidas para algo que
 * o usuário consiga entender.
 *
 * Basta renderizar `<Toast message={erro} onClose={() => setErro('')} />`:
 * sem mensagem, nada aparece.
 */
export default function Toast({
  message,
  onClose,
  variant = 'error',
  duration,
  fallback,
}) {
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
  const [dismissedMessage, setDismissedMessage] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  const text =
    variant === 'error' ? mensagemAmigavel(message, fallback) : message;
  const isVisible = Boolean(message) && dismissedMessage !== message;
  const timeout = duration ?? DEFAULT_DURATION_MS[variant];

  // Ao limpar a mensagem, o mesmo texto volta a poder ser exibido depois.
  if (!message && dismissedMessage !== null) setDismissedMessage(null);

  const dismiss = useCallback(() => {
    setDismissedMessage(message);
    onClose?.();
  }, [message, onClose]);

  useEffect(() => {
    if (!isVisible || isPaused || !timeout) return undefined;
    const timer = setTimeout(dismiss, timeout);
    return () => clearTimeout(timer);
  }, [isVisible, isPaused, timeout, dismiss]);

  if (!isVisible || !isClient) return null;

  const Icon = ICONS[variant] ?? ICONS.error;

  return createPortal(
    <div
      className={`${styles.toast} ${styles[variant] ?? styles.error}`}
      role={variant === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <Icon size={20} className={styles.icon} aria-hidden="true" />
      <p className={styles.message}>{text}</p>
      <button
        type="button"
        className={styles.closeButton}
        onClick={dismiss}
        aria-label="Fechar aviso"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>,
    obterViewport()
  );
}
