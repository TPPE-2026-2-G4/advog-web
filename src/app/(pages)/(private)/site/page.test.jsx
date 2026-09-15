import { beforeEach, describe, expect, it, vi } from 'vitest';
import SitePage from './page';
import { buscarDadosInstitucionais } from '@/services/institucional';

vi.mock('@/services/institucional', () => ({
  buscarDadosInstitucionais: vi.fn(),
}));

vi.mock('./siteClient', () => ({
  default: () => null,
}));

describe('SitePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('busca os dados institucionais e repassa para o SiteClient', async () => {
    const dadosMock = {
      nomeEscritorio: 'Carreiro Advogados',
      corPrimaria: '#1B2A4A',
      corSecundaria: '#B79A63',
    };
    buscarDadosInstitucionais.mockResolvedValue(dadosMock);

    const elemento = await SitePage();

    expect(buscarDadosInstitucionais).toHaveBeenCalledOnce();
    expect(elemento.props.initialData).toEqual(dadosMock);
  });
});
