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

function aplicarVariaveisCSS(dados) {
  if (typeof document !== 'undefined' && dados) {
    if (dados.corPrimaria) {
      document.documentElement.style.setProperty(
        '--cor-primaria',
        dados.corPrimaria
      );
      document.documentElement.style.setProperty(
        '--cor-primaria-texto',
        getContrastTextColor(dados.corPrimaria)
      );
    }
    if (dados.corSecundaria) {
      document.documentElement.style.setProperty(
        '--cor-secundaria',
        dados.corSecundaria
      );
      document.documentElement.style.setProperty(
        '--cor-secundaria-texto',
        getContrastTextColor(dados.corSecundaria)
      );
    }
  }
}

export function InstitucionalProvider({ children, initialData }) {
  const [institucional, setInstitucional] = useState(
    () => initialData || DEFAULT_INSTITUCIONAL
  );

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
    // Sincroniza variáveis CSS imediatamente com o cache local
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

    // Atualiza o estado React de forma assíncrona para evitar renderizações em cascata
    Promise.resolve().then(() => {
      try {
        const cached = localStorage.getItem('institucional_data');
        if (cached) {
          const dadosCache = JSON.parse(cached);
          if (dadosCache && typeof dadosCache === 'object') {
            setInstitucional((prev) => ({ ...prev, ...dadosCache }));
          }
        }
      } catch {
        // Ignora erro de leitura do cache
      }
    });

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
