import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RecorrenciaSelector from './RecorrenciaSelector';

function abrir() {
  const onChange = vi.fn();
  const onDialogChange = vi.fn();
  render(
    <RecorrenciaSelector
      data="2027-01-04"
      value="daily"
      onChange={onChange}
      onDialogChange={onDialogChange}
    />
  );
  fireEvent.change(screen.getByLabelText('Repetição'), {
    target: { value: 'custom' },
  });
  return { onChange, onDialogChange };
}

describe('RecorrenciaSelector', () => {
  it('monta a cada duas semanas, segundas e quartas, após 12 ocorrências', () => {
    const { onChange, onDialogChange } = abrir();
    expect(screen.getByLabelText('Intervalo de repetição')).toHaveFocus();
    fireEvent.change(screen.getByLabelText('Intervalo de repetição'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'quarta-feira' }));
    fireEvent.click(screen.getByLabelText('Após'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Aplicar recorrência' })
    );
    expect(onChange).toHaveBeenCalledWith(
      'custom',
      'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=12'
    );
    expect(onDialogChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exige ao menos um dia semanal e uma data final válida', () => {
    const { onChange } = abrir();
    fireEvent.click(screen.getByRole('button', { name: 'segunda-feira' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Aplicar recorrência' })
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Selecione pelo menos um dia'
    );
    fireEvent.change(screen.getByLabelText('Unidade de repetição'), {
      target: { value: 'DAILY' },
    });
    fireEvent.click(screen.getByLabelText('Em'));
    fireEvent.change(screen.getByLabelText('Data de término'), {
      target: { value: '2027-01-01' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Aplicar recorrência' })
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'O término deve ser igual ou posterior'
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('oferece posição mensal e fecha com Escape sem aplicar', () => {
    const { onChange, onDialogChange } = abrir();
    fireEvent.change(screen.getByLabelText('Unidade de repetição'), {
      target: { value: 'MONTHLY' },
    });
    expect(screen.getByLabelText('Repetição mensal')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'domingo' })
    ).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onDialogChange).toHaveBeenLastCalledWith(false);
    expect(onChange).not.toHaveBeenCalled();
  });
});
