import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './page';
import * as institucionalService from '@/services/institucional';
import * as funcionariosService from '@/services/funcionarios';

vi.mock('@/services/institucional', () => ({
  buscarDadosInstitucionais: vi.fn(),
}));

vi.mock('@/services/funcionarios', () => ({
  listarFuncionarios: vi.fn(),
}));

describe('Home', () => {
  it('renderiza a seção Nossa Equipe corretamente', async () => {
    institucionalService.buscarDadosInstitucionais.mockResolvedValue({
      textoEquipe: 'Conheça nossos especialistas.',
    });

    funcionariosService.listarFuncionarios.mockResolvedValue([
      {
        funcionario_id: 1,
        nome: 'Dr. Pedro Lima',
        cargo: { nome: 'Advogado Júnior · Direito Tributário' },
        uf_oab: 'DF',
        numero_oab: '34.567',
        exibicaoInstitucional: true,
      },
    ]);

    const jsx = await Home();
    render(jsx);

    expect(
      screen.getByRole('heading', { name: 'Nossa Equipe' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Conheça nossos especialistas.')
    ).toBeInTheDocument();
    expect(screen.getByText('Dr. Pedro Lima')).toBeInTheDocument();
    expect(screen.getByText('Advogado Júnior')).toBeInTheDocument();
    expect(screen.getByText('Direito Tributário')).toBeInTheDocument();
    expect(screen.getByText('OAB/DF 34.567')).toBeInTheDocument();
    expect(screen.getByText('PL')).toBeInTheDocument(); // Iniciais
  });
});
