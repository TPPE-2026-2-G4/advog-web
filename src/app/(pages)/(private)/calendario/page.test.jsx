import { beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarioPage from './page';
import { listarFinancas, listarCategorias } from '@/services/financas';

vi.mock('@/services/financas', () => ({
  listarFinancas: vi.fn(),
  listarCategorias: vi.fn().mockResolvedValue([]),
}));

vi.mock('./calendarioClient', () => ({
  default: () => null,
}));

describe('CalendarioPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    {
      cenario: 'lista de lançamentos preenchida',
      dados: [
        { id: 1, titulo: 'Honorários Iniciais', valor: 5000, tipo: 'entrada' },
        { id: 2, titulo: 'Custas Processuais', valor: 250, tipo: 'saida' },
      ],
    },
    {
      cenario: 'lista vazia de lançamentos',
      dados: [],
    },
  ])(
    'busca os lançamentos ($cenario) e repassa como initialData para CalendarioClient',
    async ({ dados }) => {
      listarFinancas.mockResolvedValueOnce(dados);

      const page = await CalendarioPage();

      expect(listarFinancas).toHaveBeenCalledOnce();
      expect(page).toBeDefined();
      expect(page.props.initialData).toEqual(dados);
    }
  );
});
