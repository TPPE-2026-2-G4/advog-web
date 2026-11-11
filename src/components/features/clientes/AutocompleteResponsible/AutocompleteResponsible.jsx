'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { obterIniciais } from '@/utils/cliente';
import {
  getCargoNome,
  getValidFotoUrl,
  isAdministratorAccount,
} from '@/utils/funcionario';
import { getImageUrl } from '@/utils/institucional';
import styles from './AutocompleteResponsible.module.css';

const encontrarFuncionario = (id, list = []) => {
  if (!id) return null;
  const found = list.find(
    (f) => Number(f.funcionario_id || f.id) === Number(id) || f.nome === id
  );
  if (!found || isAdministratorAccount(found)) return null;
  return found;
};

export default function AutocompleteResponsible({
  responsavelId = null,
  onChange,
  funcionarios = [],
  placeholder = 'Selecione o responsável',
  disabled = false,
  id = 'responsavel-autocomplete',
  name = '',
  required = false,
  ariaLabel = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);

  const selecionado = useMemo(
    () => encontrarFuncionario(responsavelId, funcionarios),
    [responsavelId, funcionarios]
  );

  const [searchTerm, setSearchTerm] = useState(() => {
    const inicial = encontrarFuncionario(responsavelId, funcionarios);
    return inicial ? inicial.nome : '';
  });

  const [prevResponsavelId, setPrevResponsavelId] = useState(responsavelId);

  if (prevResponsavelId !== responsavelId) {
    setPrevResponsavelId(responsavelId);
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
    const validos = funcionarios.filter((f) => !isAdministratorAccount(f));
    if (!searchTerm.trim()) return validos;
    const termo = searchTerm.toLowerCase();
    return validos.filter((f) => f.nome?.toLowerCase().includes(termo));
  }, [funcionarios, searchTerm]);

  const handleSelect = (func) => {
    if (isAdministratorAccount(func)) return;
    setIsOpen(false);
    setSearchTerm(func.nome);
    onChange?.(func.funcionario_id || func.id, func);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSearchTerm('');
    onChange?.(null, null);
    setIsOpen(false);
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
          onChange={(e) => {
            const val = e.target.value;
            setSearchTerm(val);
            setIsOpen(true);
            setHighlightedIndex(-1);
            if (!val.trim()) {
              onChange?.(null, null);
              return;
            }
            const matchById = funcionarios.find(
              (f) =>
                !isAdministratorAccount(f) &&
                String(f.funcionario_id || f.id) === val.trim()
            );
            if (matchById) {
              onChange?.(matchById.funcionario_id || matchById.id, matchById);
            }
          }}
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
            title="Limpar responsável"
            aria-label="Limpar responsável selecionado"
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
            <li className={styles.emptyState}>Nenhum responsável encontrado</li>
          ) : (
            filtrados.map((func, index) => {
              const isSelected =
                selecionado &&
                (selecionado.funcionario_id || selecionado.id) ===
                  (func.funcionario_id || func.id);
              const isHighlighted = highlightedIndex === index;

              return (
                <li
                  key={func.funcionario_id || func.id || func.nome}
                  className={`${styles.option} ${
                    isSelected ? styles.optionSelected : ''
                  } ${isHighlighted ? styles.optionHighlighted : ''}`}
                  onClick={() => handleSelect(func)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className={styles.avatar}>
                    {getValidFotoUrl(func) ? (
                      <>
                        <img
                          src={getImageUrl(getValidFotoUrl(func))}
                          alt={`Foto de ${func.nome}`}
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
                          {obterIniciais(func.nome)}
                        </span>
                      </>
                    ) : (
                      obterIniciais(func.nome)
                    )}
                  </div>
                  <div className={styles.optionInfo}>
                    <span className={styles.optionName}>{func.nome}</span>
                    {getCargoNome(func.cargo) && (
                      <span className={styles.optionRole}>
                        {getCargoNome(func.cargo)}
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
