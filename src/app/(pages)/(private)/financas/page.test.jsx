import { beforeEach, describe, expect, it, vi } from 'vitest';
import FinancasPage from './page';
import { listarFinancas } from '@/services/financas';

vi.mock('@/services/financas', () => ({
  listarFinancas: vi.fn(),
}));

vi.mock('./financasClient', () => ({
  default: () => null,
}));

describe('FinancasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    {
      cenario: 'lista de lançamentos preenchida',
      dados: [
        { id: 1, titulo: 'Honorários', valor: 5000, tipo: 'entrada' },
        { id: 2, titulo: 'Custas', valor: 250, tipo: 'saida' },
      ],
    },
    {
      cenario: 'lista vazia de lançamentos',
      dados: [],
    },
  ])(
    'busca os lançamentos ($cenario) e repassa como initialData para FinancasClient',
    async ({ dados }) => {
      listarFinancas.mockResolvedValueOnce(dados);

      const page = await FinancasPage();

      expect(listarFinancas).toHaveBeenCalledOnce();
      expect(page).toBeDefined();
      expect(page.props.initialData).toEqual(dados);
    }
  );
});
