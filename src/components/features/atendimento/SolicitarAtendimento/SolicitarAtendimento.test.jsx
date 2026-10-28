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

const fieldSpecs = [
  {
    label: 'Nome completo',
    type: 'text',
    autocomplete: 'name',
    minlength: '3',
    maxlength: '100',
  },
  {
    label: 'Email',
    type: 'email',
    autocomplete: 'email',
  },
  {
    label: 'Telefone',
    type: 'tel',
    autocomplete: 'tel',
  },
  {
    label: 'Descreva sua demanda',
    minlength: '10',
    maxlength: '2000',
  },
];

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

  it('renderiza a seção de solicitação de atendimento com id de âncora', () => {
    render(<SolicitarAtendimento />);

    expect(
      screen.getByRole('region', { name: 'Solicitar Atendimento' })
    ).toHaveAttribute('id', 'contato');
  });

  it.each(fieldSpecs)(
    'configura obrigatoriedade e atributos do campo "$label"',
    ({ label, type, autocomplete, minlength, maxlength }) => {
      render(<SolicitarAtendimento />);
      const field = screen.getByLabelText(label);

      expect(field).toBeRequired();
      if (type) expect(field).toHaveAttribute('type', type);
      if (autocomplete) {
        expect(field).toHaveAttribute('autocomplete', autocomplete);
      }
      if (minlength) expect(field).toHaveAttribute('minlength', minlength);
      if (maxlength) expect(field).toHaveAttribute('maxlength', maxlength);
    }
  );

  it('associa os erros aos campos e foca o primeiro inválido ao submeter vazio', () => {
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

  it.each([
    {
      cenario: 'campo obrigatório preenchido apenas com espaços',
      label: 'Nome completo',
      valorInvalido: '   ',
      valorValido: values['Nome completo'],
      mensagemEsperada: 'Preencha este campo.',
    },
    {
      cenario: 'formato de email inválido',
      label: 'Email',
      valorInvalido: 'email-invalido',
      valorValido: values.Email,
      mensagemEsperada: 'Informe um email válido.',
    },
  ])(
    'rejeita $cenario no campo "$label" e permite corrigir e enviar',
    async ({ label, valorInvalido, valorValido, mensagemEsperada }) => {
      render(<SolicitarAtendimento />);
      preencher();

      const campo = screen.getByLabelText(label);
      fireEvent.change(campo, { target: { value: valorInvalido } });
      enviar();

      expect(campo).toHaveFocus();
      expect(campo).toHaveAttribute('aria-invalid', 'true');
      expect(campo).toHaveAccessibleDescription(mensagemEsperada);

      fireEvent.change(campo, { target: { value: valorValido } });
      expect(campo).toHaveAttribute('aria-invalid', 'false');

      enviar();
      expect(
        await screen.findByRole('status', { name: 'Solicitação enviada' })
      ).toHaveTextContent('Recebemos sua solicitação com sucesso.');
    }
  );

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
