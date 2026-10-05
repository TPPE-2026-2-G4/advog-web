import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './page';

describe('Home', () => {
  it('exibe o formulário público de solicitação de atendimento', () => {
    render(<Home />);

    expect(
      screen.getByRole('heading', { name: 'Solicitar Atendimento' })
    ).toBeInTheDocument();
    for (const label of [
      'Nome completo',
      'Email',
      'Telefone',
      'Descreva sua demanda',
    ]) {
      expect(screen.getByLabelText(label)).toBeRequired();
    }
    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('region', { name: 'Solicitar Atendimento' })
    );
    expect(
      screen.getByText(
        'Modo de demonstração: os dados preenchidos não serão enviados ao escritório.'
      )
    ).toBeInTheDocument();
  });
});
