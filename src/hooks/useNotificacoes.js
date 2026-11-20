'use client';

import { useEffect, useRef, useState } from 'react';
import {
  listarNotificacoes,
  marcarNotificacaoComoLida,
  marcarTodasNotificacoesComoLidas,
  obterContagemNaoLidas,
} from '@/services/notificacoes';

const PAGE_SIZE = 20;
const POLLING_INTERVAL = 30000;

const getErrorMessage = (error, fallback) =>
  error instanceof Error ? error.message : fallback;

export function useNotificacoes() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [naoLidasCount, setNaoLidasCount] = useState(0);
  const [apenasNaoLidas, setApenasNaoLidas] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const countRef = useRef(0);

  useEffect(() => {
    let ignore = false;

    Promise.resolve()
      .then(() => {
        if (ignore) return null;
        setIsLoading(true);
        setError('');
        setNotificacoes([]);
        setHasMore(true);
        return Promise.all([
          listarNotificacoes({
            apenasNaoLidas,
            limite: PAGE_SIZE,
            offset: 0,
          }),
          obterContagemNaoLidas(),
        ]);
      })
      .then((result) => {
        if (ignore || !result) return;
        const [lista, contagem] = result;
        setNotificacoes(lista);
        countRef.current = Math.max(0, contagem);
        setNaoLidasCount(Math.max(0, contagem));
        setHasMore(lista.length === PAGE_SIZE);
      })
      .catch((receivedError) => {
        if (ignore) return;
        setError(
          getErrorMessage(
            receivedError,
            'Não foi possível carregar as notificações.'
          )
        );
        setHasMore(false);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [apenasNaoLidas, reloadKey]);

  useEffect(() => {
    const sincronizarContagem = async () => {
      if (document.hidden) return;
      try {
        const contagem = await obterContagemNaoLidas();
        const contagemNormalizada = Math.max(0, contagem);
        const aumentou = contagemNormalizada > countRef.current;
        countRef.current = contagemNormalizada;
        setNaoLidasCount(contagemNormalizada);
        if (aumentou) setReloadKey((chave) => chave + 1);
      } catch {
        // Polling is best effort; explicit actions expose their errors.
      }
    };

    const intervalId = window.setInterval(
      sincronizarContagem,
      POLLING_INTERVAL
    );
    document.addEventListener('visibilitychange', sincronizarContagem);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', sincronizarContagem);
    };
  }, []);

  const carregarMais = async () => {
    if (isLoading || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const novas = await listarNotificacoes({
        apenasNaoLidas,
        limite: PAGE_SIZE,
        offset: notificacoes.length,
      });
      setNotificacoes((anteriores) => {
        const ids = new Set(anteriores.map(({ id }) => id));
        return [...anteriores, ...novas.filter(({ id }) => !ids.has(id))];
      });
      setHasMore(novas.length === PAGE_SIZE);
    } catch (receivedError) {
      setError(
        getErrorMessage(
          receivedError,
          'Não foi possível carregar mais notificações.'
        )
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  const marcarComoLida = async (id) => {
    const anterior = notificacoes;
    const item = anterior.find((notificacao) => notificacao.id === id);
    if (!item || item.lida) return;

    setNotificacoes((lista) =>
      apenasNaoLidas
        ? lista.filter((notificacao) => notificacao.id !== id)
        : lista.map((notificacao) =>
            notificacao.id === id ? { ...notificacao, lida: true } : notificacao
          )
    );
    setNaoLidasCount((count) => Math.max(0, count - 1));

    try {
      await marcarNotificacaoComoLida(id);
    } catch (receivedError) {
      setNotificacoes(anterior);
      setNaoLidasCount((count) => count + 1);
      setError(
        getErrorMessage(
          receivedError,
          'Não foi possível marcar a notificação como lida.'
        )
      );
    }
  };

  const marcarTodasComoLidas = async () => {
    const anterior = notificacoes;
    const contagemAnterior = naoLidasCount;
    setNotificacoes((lista) =>
      apenasNaoLidas
        ? []
        : lista.map((notificacao) => ({ ...notificacao, lida: true }))
    );
    setNaoLidasCount(0);

    try {
      await marcarTodasNotificacoesComoLidas();
    } catch (receivedError) {
      setNotificacoes(anterior);
      setNaoLidasCount(contagemAnterior);
      setError(
        getErrorMessage(
          receivedError,
          'Não foi possível marcar todas as notificações como lidas.'
        )
      );
    }
  };

  return {
    notificacoes,
    naoLidasCount,
    isLoading,
    isLoadingMore,
    hasMore,
    apenasNaoLidas,
    error,
    carregarMais,
    recarregar: () => setReloadKey((chave) => chave + 1),
    alternarFiltro: () => setApenasNaoLidas((filtro) => !filtro),
    marcarComoLida,
    marcarTodasComoLidas,
  };
}
