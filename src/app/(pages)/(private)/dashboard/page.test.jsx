import { describe, expect, it, vi } from 'vitest';
import DashboardPage from './page';
import { redirect } from 'next/navigation';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('DashboardPage', () => {
  it('redireciona para /equipe', () => {
    DashboardPage();
    expect(redirect).toHaveBeenCalledWith('/equipe');
  });
});
