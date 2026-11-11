'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { formatarCpfCnpj, obterIniciais } from '@/utils/cliente';
import { getValidFotoUrl } from '@/utils/funcionario';
import { getImageUrl } from '@/utils/institucional';
import styles from './AutocompleteClient.module.css';

const encontrarCliente = (id, list = []) => {
  if (id == null || id === '') return null;
  return (
    list.find(
      (c) =>
        Number(c.cliente_id || c.id) === Number(id) ||
        String(c.cliente_id || c.id) === String(id) ||
        c.nome === id
    ) || null
  );
};

export default function AutocompleteClient({
  clienteId = null,
  onChange,
  clientes = [],
  placeholder = 'Selecione um cliente',
  disabled = false,
  id = 'cliente-autocomplete',
  name = '',
  required = false,
  ariaLabel = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);

  const selecionado = useMemo(
    () => encontrarCliente(clienteId, clientes),
    [clienteId, clientes]
  );

  const [searchTerm, setSearchTerm] = useState(() => {
    const inicial = encontrarCliente(clienteId, clientes);
    return inicial ? inicial.nome : '';
  });

  const [prevClienteId, setPrevClienteId] = useState(clienteId);

  if (prevClienteId !== clienteId) {
    setPrevClienteId(clienteId);
    setSearchTerm(selecionado ? selecionado.nome : '');
  }

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        if (selecionado) {
          setSearchTerm(selecionado.nome);
        } else {
          setSearchTerm('');
        }
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [selecionado]);

  const filtrados = useMemo(() => {
    if (!searchTerm.trim()) return clientes;
    const termo = searchTerm.toLowerCase();
    const termoDigitos = searchTerm.replace(/\D/g, '');

    return clientes.filter((c) => {
      const nomeMatch = c.nome?.toLowerCase().includes(termo);
      const doc = c.cpf || c.cnpj || c.documento || '';
      const docMatch =
        (doc && doc.toLowerCase().includes(termo)) ||
        (termoDigitos && doc.replace(/\D/g, '').includes(termoDigitos));
      const idMatch = String(c.cliente_id || c.id) === termo.trim();
      return nomeMatch || docMatch || idMatch;
    });
  }, [clientes, searchTerm]);

  const handleSelect = (cliente) => {
    setIsOpen(false);
    setSearchTerm(cliente.nome);
    onChange?.(cliente.cliente_id || cliente.id, cliente);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSearchTerm('');
    onChange?.('', null);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);
    setHighlightedIndex(-1);

    if (!val.trim()) {
      onChange?.('', null);
      return;
    }

    // Se o valor digitado corresponder exatamente ao ID de um cliente (ex: testes disparando change com ID)
    const matchById = clientes.find(
      (c) => String(c.cliente_id || c.id) === val.trim()
    );
    if (matchById) {
      onChange?.(matchById.cliente_id || matchById.id, matchById);
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) =>
        prev < filtrados.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filtrados.length - 1
      );
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && filtrados[highlightedIndex]) {
        e.preventDefault();
        handleSelect(filtrados[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.inputWrapper}>
        <input
          id={id}
          name={name || undefined}
          type="text"
          className={styles.input}
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          required={required}
          autoComplete="off"
          role="combobox"
          aria-label={ariaLabel || placeholder}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={`${id}-list`}
        />

        {selecionado && !disabled ? (
          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClear}
            title="Limpar cliente"
            aria-label="Limpar cliente selecionado"
          >
            <X size={16} />
          </button>
        ) : (
          <div className={styles.iconRight}>
            <ChevronDown size={16} />
          </div>
        )}
      </div>

      {isOpen && !disabled && (
        <ul
          id={`${id}-list`}
          className={styles.dropdown}
          role="listbox"
          tabIndex={-1}
        >
          {filtrados.length === 0 ? (
            <li className={styles.emptyState}>Nenhum cliente encontrado</li>
          ) : (
            filtrados.map((cliente, index) => {
              const isSelected =
                selecionado &&
                (selecionado.cliente_id || selecionado.id) ===
                  (cliente.cliente_id || cliente.id);
              const isHighlighted = highlightedIndex === index;
              const doc = cliente.cpf || cliente.cnpj || cliente.documento;

              return (
                <li
                  key={cliente.cliente_id || cliente.id || cliente.nome}
                  className={`${styles.option} ${
                    isSelected ? styles.optionSelected : ''
                  } ${isHighlighted ? styles.optionHighlighted : ''}`}
                  onClick={() => handleSelect(cliente)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className={styles.avatar}>
                    {getValidFotoUrl(cliente) ? (
                      <>
                        <img
                          src={getImageUrl(getValidFotoUrl(cliente))}
                          alt={`Foto de ${cliente.nome}`}
                          className={styles.avatarImage}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.style.display =
                                'inline';
                            }
                          }}
                        />
                        <span style={{ display: 'none' }}>
                          {obterIniciais(cliente.nome)}
                        </span>
                      </>
                    ) : (
                      obterIniciais(cliente.nome)
                    )}
                  </div>
                  <div className={styles.optionInfo}>
                    <span className={styles.optionName}>{cliente.nome}</span>
                    {doc && (
                      <span className={styles.optionDoc}>
                        {formatarCpfCnpj(doc)}
                      </span>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
