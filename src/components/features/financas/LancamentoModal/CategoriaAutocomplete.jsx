import { useState, useEffect, useRef } from 'react';
import { listarCategorias } from '@/services/financas';
import styles from './LancamentoModal.module.css';

export default function CategoriaAutocomplete({
  id,
  value,
  onChange,
  disabled,
}) {
  const [query, setQuery] = useState(value || '');
  const [categorias, setCategorias] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef(null);

  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value || '');
  }

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const data = await listarCategorias();
        setCategorias(data || []);
      } catch (err) {
        console.error('Erro ao listar categorias', err);
      }
    };
    fetchCategorias();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = categorias.filter((c) => {
    const nomeCat = c.nome_categoria || '';
    return nomeCat.toLowerCase().includes(query.toLowerCase());
  });

  const hasExactMatch = categorias.some((c) => {
    const nomeCat = c.nome_categoria || '';
    return nomeCat.toLowerCase() === query.trim().toLowerCase();
  });

  const handleSelect = (nome) => {
    onChange(nome);
    setQuery(nome);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        id={id}
        type="text"
        className={styles.input}
        value={query}
        disabled={disabled || isLoading}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Digite e selecione..."
      />
      {isOpen && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            maxHeight: '112px',
            overflowY: 'auto',
            zIndex: 10,
            listStyle: 'none',
            padding: 0,
            margin: '4px 0 0 0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {filtered.map((c) => {
            const nomeCat = c.nome_categoria || '';
            return (
              <li
                key={c.categoria_id || nomeCat}
                style={{
                  padding: '8px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee',
                  color: '#333',
                }}
                onMouseDown={() => handleSelect(nomeCat)}
              >
                {nomeCat}
              </li>
            );
          })}
          {query.trim() && !hasExactMatch && (
            <li
              style={{
                padding: '8px',
                cursor: 'pointer',
                fontStyle: 'italic',
                color: '#0066cc',
                fontSize: '0.85rem',
              }}
              onMouseDown={() => handleSelect(query.trim())}
            >
              Nova categoria: &quot;{query.trim()}&quot;
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
