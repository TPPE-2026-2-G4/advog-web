import { beforeEach, describe, expect, it, vi } from 'vitest';
import PerfilPage from './page';
import { listarAtuacoes } from '@/services/atuacoes';

vi.mock('@/services/atuacoes', () => ({
  listarAtuacoes: vi.fn(),
}));

vi.mock('./perfilClient', () => ({
  default: () => null,
}));

describe('PerfilPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carrega as áreas de atuação e encaminha para a tela do perfil', async () => {
    const areas = [
      { atuacao_id: 1, nome: 'Direito Civil' },
      { atuacao_id: 2, nome: 'Direito Trabalhista' },
    ];
    listarAtuacoes.mockResolvedValue(areas);

    const elemento = await PerfilPage();

    expect(listarAtuacoes).toHaveBeenCalledOnce();
    expect(elemento.props.atuacoes).toBe(areas);
  });
});
