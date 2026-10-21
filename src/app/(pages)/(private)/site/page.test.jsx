import { beforeEach, describe, expect, it, vi } from 'vitest';
import SitePage from './page';
import { buscarDadosInstitucionais } from '@/services/institucional';
import { listarFuncionarios } from '@/services/funcionarios';
import { listarAtuacoes } from '@/services/atuacoes';

vi.mock('@/services/institucional', () => ({
  buscarDadosInstitucionais: vi.fn(),
}));

vi.mock('@/services/funcionarios', () => ({
  listarFuncionarios: vi.fn(),
}));

vi.mock('@/services/atuacoes', () => ({
  listarAtuacoes: vi.fn(),
}));

vi.mock('./siteClient', () => ({
  default: () => null,
}));

describe('SitePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('busca os dados institucionais, funcionários e áreas de atuação e repassa para o SiteClient', async () => {
    const dadosMock = {
      nomeEscritorio: 'Carreiro Advogados',
      corPrimaria: '#1B2A4A',
      corSecundaria: '#B79A63',
    };
    const funcionariosMock = [
      { funcionario_id: 1, nome: 'Dr. Teste', exibicaoInstitucional: true },
    ];
    const atuacoesMock = [
      {
        atuacao_id: 1,
        nome: 'Direito Civil',
        descricao: 'Contratos',
        exibicaoInstitucional: true,
      },
    ];
    buscarDadosInstitucionais.mockResolvedValue(dadosMock);
    listarFuncionarios.mockResolvedValue(funcionariosMock);
    listarAtuacoes.mockResolvedValue(atuacoesMock);

    const elemento = await SitePage();

    expect(buscarDadosInstitucionais).toHaveBeenCalledOnce();
    expect(listarFuncionarios).toHaveBeenCalledOnce();
    expect(listarAtuacoes).toHaveBeenCalledOnce();
    expect(elemento.props.initialData).toEqual(dadosMock);
    expect(elemento.props.initialTeam).toEqual(funcionariosMock);
    expect(elemento.props.initialAreas).toEqual(atuacoesMock);
  });
});
