'use client';

import { ChevronDown, Download } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { EXPORT_FORMATS } from '@/utils/exportacao';
import styles from './ExportMenu.module.css';

export default function ExportMenu({
  label = 'Exportar',
  className = '',
  isExporting = false,
  disabled = false,
  onExport,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (format) => {
    setIsOpen(false);
    onExport?.(format);
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={className}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        disabled={disabled || isExporting}
        onClick={() => setIsOpen((open) => !open)}
      >
        <Download size={18} aria-hidden="true" />
        {isExporting ? 'Exportando…' : label}
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {isOpen && (
        <ul id={menuId} role="menu" className={styles.menu}>
          {EXPORT_FORMATS.map((format) => (
            <li key={format.value} role="none">
              <button
                type="button"
                role="menuitem"
                className={styles.item}
                onClick={() => handleSelect(format.value)}
              >
                {format.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
