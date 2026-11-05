import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildExportFilename,
  downloadBlob,
  EXPORT_FORMATS,
} from './exportacao';

describe('utils de exportação', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('oferece PDF, Excel e CSV', () => {
    expect(EXPORT_FORMATS.map((format) => format.value)).toEqual([
      'pdf',
      'xlsx',
      'csv',
    ]);
  });

  it('monta o nome do arquivo com a data no formato aaaammdd', () => {
    expect(buildExportFilename('processos', 'pdf', new Date(2026, 10, 5))).toBe(
      'processos_20261105.pdf'
    );
    expect(
      buildExportFilename('lancamentos', 'xlsx', new Date(2026, 0, 9))
    ).toBe('lancamentos_20260109.xlsx');
  });

  it('usa a data atual quando nenhuma é informada', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 5));

    expect(buildExportFilename('processos', 'csv')).toBe(
      'processos_20261105.csv'
    );

    vi.useRealTimers();
  });

  it('baixa o blob por um link temporário e libera a URL', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:relatorio');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function () {
        expect(this.href).toBe('blob:relatorio');
        expect(this.download).toBe('processos_20261105.pdf');
      });
    const blob = new Blob(['conteudo']);

    downloadBlob(blob, 'processos_20261105.pdf');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:relatorio');
    expect(document.querySelector('a[download]')).toBeNull();

    vi.unstubAllGlobals();
  });
});
