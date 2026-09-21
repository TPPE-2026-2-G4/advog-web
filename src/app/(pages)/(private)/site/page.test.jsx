import { beforeEach, describe, expect, it, vi } from 'vitest';
import SitePage from './page';
import { buscarDadosInstitucionais } from '@/services/institucional';
import { listarFuncionarios } from '@/services/funcionarios';

vi.mock('@/services/institucional', () => ({
  buscarDadosInstitucionais: vi.fn(),
}));

vi.mock('@/services/funcionarios', () => ({
  listarFuncionarios: vi.fn(),
}));

vi.mock('./siteClient', () => ({
  default: () => null,
}));

describe('SitePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('busca os dados institucionais e funcionários e repassa para o SiteClient', async () => {
    const dadosMock = {
      nomeEscritorio: 'Carreiro Advogados',
      corPrimaria: '#1B2A4A',
      corSecundaria: '#B79A63',
    };
    const funcionariosMock = [
      { funcionario_id: 1, nome: 'Dr. Teste', exibicaoInstitucional: true },
    ];
    buscarDadosInstitucionais.mockResolvedValue(dadosMock);
    listarFuncionarios.mockResolvedValue(funcionariosMock);

    const elemento = await SitePage();

    expect(buscarDadosInstitucionais).toHaveBeenCalledOnce();
    expect(listarFuncionarios).toHaveBeenCalledOnce();
    expect(elemento.props.initialData).toEqual(dadosMock);
    expect(elemento.props.initialTeam).toEqual(funcionariosMock);
  });
});
