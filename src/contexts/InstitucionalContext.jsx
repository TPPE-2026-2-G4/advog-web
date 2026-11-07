'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  DEFAULT_INSTITUCIONAL,
  buscarDadosInstitucionais,
} from '@/services/institucional';
import { getContrastTextColor } from '@/utils/institucional';

export const InstitucionalContext = createContext({
  institucional: DEFAULT_INSTITUCIONAL,
  atualizarInstitucional: () => {},
});

export function getInitialInstitucional(initialData) {
  if (initialData) return initialData;
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('institucional_data');
      if (cached) {
        const dadosCache = JSON.parse(cached);
        if (dadosCache && typeof dadosCache === 'object') {
          return { ...DEFAULT_INSTITUCIONAL, ...dadosCache };
        }
      }
    } catch {
      // Ignora erro de leitura do cache
    }
  }
  return DEFAULT_INSTITUCIONAL;
}

function aplicarVariaveisCSS(dados) {
  if (typeof document !== 'undefined' && dados) {
    const cp = dados.corPrimaria;
    const cs = dados.corSecundaria;

    if (cp) {
      document.documentElement.style.setProperty('--cor-primaria', cp);
      document.documentElement.style.setProperty(
        '--cor-primaria-texto',
        getContrastTextColor(cp)
      );
    }
    if (cs) {
      document.documentElement.style.setProperty('--cor-secundaria', cs);
      document.documentElement.style.setProperty(
        '--cor-secundaria-texto',
        getContrastTextColor(cs)
      );
    }

    let styleEl = document.getElementById('theme-injected-overrides');
    if (
      !styleEl &&
      (cp || cs || dados.logotipo) &&
      typeof document.head !== 'undefined'
    ) {
      styleEl = document.createElement('style');
      styleEl.id = 'theme-injected-overrides';
      document.head.appendChild(styleEl);
    }
    if (styleEl) {
      let css = '';
      if (cp) {
        css +=
          ':root, [class*="layout"] { --cor-primaria: ' +
          cp +
          ' !important; --cor-primaria-texto: ' +
          getContrastTextColor(cp) +
          ' !important; } ';
        css +=
          'aside[data-testid="sidebar"] { background-color: ' +
          cp +
          ' !important; } ';
      }
      if (cs) {
        css +=
          ':root, [class*="layout"] { --cor-secundaria: ' +
          cs +
          ' !important; --cor-secundaria-texto: ' +
          getContrastTextColor(cs) +
          ' !important; } ';
      }
      if (dados.logotipo) {
        css +=
          '[data-testid="sidebar-logo-icon"] { display: none !important; } ';
      }
      styleEl.textContent = css;
    }
  }
}

export function InstitucionalProvider({ children, initialData }) {
  const [institucional, setInstitucional] = useState(() => {
    const dadosIniciais = getInitialInstitucional(initialData);
    aplicarVariaveisCSS(dadosIniciais);
    return dadosIniciais;
  });

  const atualizarInstitucional = useCallback((novosDados) => {
    setInstitucional((prev) => {
      const atualizado = { ...prev, ...novosDados };
      aplicarVariaveisCSS(atualizado);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            'institucional_data',
            JSON.stringify(atualizado)
          );
        } catch {
          // Ignora erro de gravação
        }
      }
      return atualizado;
    });
  }, []);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('institucional_data');
      if (cached) {
        const dadosCache = JSON.parse(cached);
        if (dadosCache && typeof dadosCache === 'object') {
          aplicarVariaveisCSS(dadosCache);
        }
      }
    } catch {
      // Ignora erro de leitura do cache
    }

    buscarDadosInstitucionais().then((dados) => {
      if (
        dados &&
        (dados.corPrimaria || dados.corSecundaria || dados.nomeEscritorio)
      ) {
        setInstitucional((prev) => {
          const atualizado = { ...prev, ...dados };
          aplicarVariaveisCSS(atualizado);
          try {
            localStorage.setItem(
              'institucional_data',
              JSON.stringify(atualizado)
            );
          } catch {
            // Ignora erro de gravação
          }
          return atualizado;
        });
      }
    });

    const handleAtualizado = (event) => {
      if (event.detail) {
        setInstitucional((prev) => {
          const atualizado = { ...prev, ...event.detail };
          aplicarVariaveisCSS(atualizado);
          return atualizado;
        });
      }
    };

    const handleStorage = (event) => {
      if (event.key === 'institucional_data' && event.newValue) {
        try {
          const dados = JSON.parse(event.newValue);
          setInstitucional(dados);
          aplicarVariaveisCSS(dados);
        } catch {
          // Ignora JSON corrompido
        }
      }
    };

    window.addEventListener('institucional-updated', handleAtualizado);
    window.addEventListener('institucionalAtualizado', handleAtualizado);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('institucional-updated', handleAtualizado);
      window.removeEventListener('institucionalAtualizado', handleAtualizado);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <InstitucionalContext.Provider
      value={{ institucional, atualizarInstitucional }}
    >
      {children}
    </InstitucionalContext.Provider>
  );
}

export function useInstitucionalContext() {
  return useContext(InstitucionalContext);
}
