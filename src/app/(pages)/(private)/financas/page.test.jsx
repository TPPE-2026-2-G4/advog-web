import { describe, expect, it } from 'vitest';
import FinancasPage from './page';

describe('FinancasPage', () => {
  it('renderiza o componente FinancasClient', async () => {
    const page = await FinancasPage();
    expect(page).toBeDefined();
  });
});
