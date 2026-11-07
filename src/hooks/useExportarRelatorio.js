import { useRef, useState } from 'react';
import { buildExportFilename, downloadBlob } from '@/utils/exportacao';

export function useExportarRelatorio({ baseName, request }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const inFlight = useRef(false);

  const exportReport = async (format) => {
    if (inFlight.current) return;

    inFlight.current = true;
    setIsExporting(true);
    setExportError('');

    try {
      const blob = await request(format);
      downloadBlob(blob, buildExportFilename(baseName, format));
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : 'Não foi possível exportar o relatório.'
      );
    } finally {
      inFlight.current = false;
      setIsExporting(false);
    }
  };

  return { isExporting, exportError, exportReport };
}
