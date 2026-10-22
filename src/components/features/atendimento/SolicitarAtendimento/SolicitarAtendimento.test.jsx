import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SolicitarAtendimento from './SolicitarAtendimento';
import { enviarSolicitacaoServico } from '@/services/solicitacoes';

vi.mock('@/services/solicitacoes', async (importOriginal) => ({
  ...(await importOriginal()),
  enviarSolicitacaoServico: vi.fn(),
}));

const values = {
  'Nome completo': 'Maria Silva',
  Email: 'maria@example.com',
  Telefone: '(61) 99999-9999',
  'Descreva sua demanda': 'Preciso de orientação jurídica.',
};

function preencher() {
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}

function enviar() {
  fireEvent.submit(
    screen.getByRole('button', { name: 'Enviar Solicitação' }).form
  );
}

describe('SolicitarAtendimento', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    enviarSolicitacaoServico.mockResolvedValue({ cliente_id: 21, etapa_id: 1 });
  });

  it('renderiza seção, campos obrigatórios e limites do backend', () => {
    render(<SolicitarAtendimento />);

    expect(
      screen.getByRole('region', { name: 'Solicitar Atendimento' })
    ).toHaveAttribute('id', 'contato');
    for (const label of Object.keys(values)) {
      expect(screen.getByLabelText(label)).toBeRequired();
    }
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Telefone')).toHaveAttribute('type', 'tel');
    expect(screen.getByLabelText('Nome completo')).toHaveAttribute(
      'autocomplete',
      'name'
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'autocomplete',
      'email'
    );
    expect(screen.getByLabelText('Telefone')).toHaveAttribute(
      'autocomplete',
      'tel'
    );
    expect(screen.getByLabelText('Nome completo')).toHaveAttribute(
      'minlength',
      '3'
    );
    expect(screen.getByLabelText('Nome completo')).toHaveAttribute(
      'maxlength',
      '100'
    );
    expect(screen.getByLabelText('Descreva sua demanda')).toHaveAttribute(
      'minlength',
      '10'
    );
    expect(screen.getByLabelText('Descreva sua demanda')).toHaveAttribute(
      'maxlength',
      '2000'
    );
  });

  it('associa os erros aos campos e foca o primeiro inválido', () => {
    render(<SolicitarAtendimento />);
    enviar();

    for (const label of Object.keys(values)) {
      const input = screen.getByLabelText(label);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAccessibleDescription('Preencha este campo.');
    }
    expect(screen.getByLabelText('Nome completo')).toHaveFocus();
    expect(enviarSolicitacaoServico).not.toHaveBeenCalled();
  });

  it('rejeita conteúdo em branco e permite corrigir o email', async () => {
    render(<SolicitarAtendimento />);
    preencher();
    const nome = screen.getByLabelText('Nome completo');
    const email = screen.getByLabelText('Email');
    fireEvent.change(nome, { target: { value: '   ' } });
    enviar();
    expect(nome).toHaveAccessibleDescription('Preencha este campo.');
    fireEvent.change(nome, { target: { value: values['Nome completo'] } });
    fireEvent.change(email, { target: { value: 'email-invalido' } });
    enviar();
    expect(email).toHaveFocus();
    expect(email).toHaveAccessibleDescription('Informe um email válido.');
    fireEvent.change(email, { target: { value: values.Email } });
    expect(email).toHaveAttribute('aria-invalid', 'false');
    enviar();
    expect(
      await screen.findByRole('status', { name: 'Solicitação enviada' })
    ).toHaveTextContent('Recebemos sua solicitação com sucesso.');
  });

  it('envia pelo formulário, confirma o recebimento e reinicia com foco no nome', async () => {
    render(<SolicitarAtendimento />);
    preencher();
    const email = screen.getByLabelText('Email');
    fireEvent.submit(email.form);

    expect(
      await screen.findByRole('status', { name: 'Solicitação enviada' })
    ).toHaveTextContent(
      'Recebemos sua solicitação com sucesso. Nossa equipe entrará em contato.'
    );
    expect(enviarSolicitacaoServico).toHaveBeenCalledWith({
      nome: values['Nome completo'],
      email: values.Email,
      telefone: '61999999999',
      descricao: values['Descreva sua demanda'],
    });
    expect(screen.queryByLabelText('Nome completo')).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Preencher nova solicitação' })
    );

    await waitFor(() =>
      expect(screen.getByLabelText('Nome completo')).toHaveFocus()
    );
    for (const label of Object.keys(values)) {
      expect(screen.getByLabelText(label)).toHaveValue('');
    }
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('desabilita campos e botão durante o processamento', async () => {
    let resolve;
    enviarSolicitacaoServico.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      })
    );
    render(<SolicitarAtendimento />);
    preencher();
    const form = screen.getByRole('button', {
      name: 'Enviar Solicitação',
    }).form;
    fireEvent.submit(form);

    expect(form).toHaveAttribute('aria-busy', 'true');
    for (const label of Object.keys(values)) {
      expect(screen.getByLabelText(label)).toBeDisabled();
    }
    expect(
      screen.getByRole('status', { name: 'Carregando' }).closest('button')
    ).toBeDisabled();
    fireEvent.submit(form);
    expect(enviarSolicitacaoServico).toHaveBeenCalledOnce();
    await act(async () => resolve({ cliente_id: 21, etapa_id: 1 }));
    expect(
      screen.getByRole('status', { name: 'Solicitação enviada' })
    ).toHaveTextContent('Recebemos sua solicitação com sucesso.');
  });

  it('anuncia falha, preserva os dados e permite tentar novamente', async () => {
    enviarSolicitacaoServico.mockRejectedValueOnce(
      new Error('Falha no envio.')
    );
    render(<SolicitarAtendimento />);
    preencher();
    enviar();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falha no envio.'
    );
    for (const [label, value] of Object.entries(values)) {
      expect(screen.getByLabelText(label)).toHaveValue(value);
    }
    expect(
      screen.getByRole('button', { name: 'Enviar Solicitação' })
    ).toBeEnabled();
    enviar();
    expect(
      await screen.findByRole('status', { name: 'Solicitação enviada' })
    ).toHaveTextContent('Recebemos sua solicitação com sucesso.');
  });
});
