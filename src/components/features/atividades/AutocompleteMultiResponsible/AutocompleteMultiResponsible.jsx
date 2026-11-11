'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { obterIniciais } from '@/utils/cliente';
import {
  getCargoNome,
  getValidFotoUrl,
  isAdministratorAccount,
} from '@/utils/funcionario';
import { getImageUrl } from '@/utils/institucional';
import styles from './AutocompleteMultiResponsible.module.css';

export default function AutocompleteMultiResponsible({
  selectedIds = [],
  onChange,
  funcionarios = [],
  placeholder = 'Selecione os responsáveis...',
  disabled = false,
  id = 'multi-responsavel-autocomplete',
  ariaLabel = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const validFuncionarios = useMemo(
    () => (funcionarios || []).filter((f) => !isAdministratorAccount(f)),
    [funcionarios]
  );

  const selectedFuncionarios = useMemo(() => {
    return selectedIds
      .map((sid) =>
        validFuncionarios.find(
          (f) =>
            Number(f.funcionario_id || f.id) === Number(sid) ||
            String(f.funcionario_id || f.id) === String(sid)
        )
      )
      .filter(Boolean);
  }, [selectedIds, validFuncionarios]);

  const filtrados = useMemo(() => {
    if (!searchTerm.trim()) return validFuncionarios;
    const termo = searchTerm.toLowerCase();
    return validFuncionarios.filter((f) =>
      f.nome?.toLowerCase().includes(termo)
    );
  }, [validFuncionarios, searchTerm]);

  const handleToggle = (func) => {
    const funcId = func.funcionario_id || func.id;
    const isAlreadySelected = selectedIds.some(
      (sid) => Number(sid) === Number(funcId) || String(sid) === String(funcId)
    );

    let nextIds;
    if (isAlreadySelected) {
      nextIds = selectedIds.filter(
        (sid) =>
          Number(sid) !== Number(funcId) && String(sid) !== String(funcId)
      );
    } else {
      nextIds = [...selectedIds, funcId];
    }

    onChange?.(nextIds);
  };

  const handleRemove = (funcId) => {
    if (disabled) return;
    const nextIds = selectedIds.filter(
      (sid) => Number(sid) !== Number(funcId) && String(sid) !== String(funcId)
    );
    onChange?.(nextIds);
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
        handleToggle(filtrados[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          height: 0,
          width: 0,
          overflow: 'hidden',
        }}
      >
        {validFuncionarios.map((f) => {
          const fid = f.funcionario_id || f.id;
          const isChecked = selectedIds.some(
            (sid) => Number(sid) === Number(fid) || String(sid) === String(fid)
          );
          return (
            <input
              key={fid}
              type="checkbox"
              aria-label={f.nome}
              checked={isChecked}
              onChange={() => handleToggle(f)}
            />
          );
        })}
      </div>

      {selectedFuncionarios.length > 0 && (
        <div className={styles.chipsContainer}>
          {selectedFuncionarios.map((func) => {
            const funcId = func.funcionario_id || func.id;
            const fotoUrl = getValidFotoUrl(func);

            return (
              <div key={funcId} className={styles.chip}>
                <div className={styles.chipAvatar}>
                  {fotoUrl ? (
                    <>
                      <img
                        src={getImageUrl(fotoUrl)}
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
                <span className={styles.chipName}>{func.nome}</span>
                {!disabled && (
                  <button
                    type="button"
                    className={styles.chipRemove}
                    onClick={() => handleRemove(funcId)}
                    aria-label={`Remover ${func.nome}`}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.inputWrapper}>
        <input
          id={id}
          type="text"
          className={styles.input}
          placeholder={
            selectedFuncionarios.length > 0
              ? 'Adicionar outro responsável...'
              : placeholder
          }
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-label={ariaLabel || placeholder}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={`${id}-list`}
        />

        <div className={styles.iconRight}>
          <ChevronDown size={16} />
        </div>
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
              const funcId = func.funcionario_id || func.id;
              const isSelected = selectedIds.some(
                (sid) =>
                  Number(sid) === Number(funcId) ||
                  String(sid) === String(funcId)
              );
              const isHighlighted = highlightedIndex === index;
              const fotoUrl = getValidFotoUrl(func);

              return (
                <li
                  key={funcId || func.nome}
                  className={`${styles.option} ${
                    isSelected ? styles.optionSelected : ''
                  } ${isHighlighted ? styles.optionHighlighted : ''}`}
                  onClick={() => handleToggle(func)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className={styles.optionMain}>
                    <div className={styles.avatar}>
                      {fotoUrl ? (
                        <>
                          <img
                            src={getImageUrl(fotoUrl)}
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
                  </div>

                  {isSelected && (
                    <div className={styles.checkIndicator}>
                      <Check size={16} />
                    </div>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
