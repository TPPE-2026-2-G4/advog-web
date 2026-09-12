import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SiteClient from './siteClient';
import { salvarDadosInstitucionais } from '@/services/institucional';

vi.mock('@/services/institucional', () => ({
  DEFAULT_INSTITUCIONAL: {
    id: 1,
    nomeEscritorio: 'Carreiro Advogados',
    descricao: 'Slogan teste',
    sobreEscritorio: 'História teste',
    email: 'contato@carreiro.adv.br',
    telefone: '(61) 98765-4321',
    endereco: 'Brasília, DF',
    corPrimaria: '#1B2A4A',
    corSecundaria: '#B79A63',
    logotipo: '',
    bannerHero: '',
  },
  salvarDadosInstitucionais: vi.fn(),
  uploadImagemInstitucional: vi.fn(),
}));

describe('Integração: Módulo de Personalização do Site', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permite navegar entre as abas e interagir com os formulários', () => {
    render(<SiteClient />);

    expect(screen.getByText('Logotipo')).toBeInTheDocument();
    expect(screen.getByText('Imagem do Banner (Hero)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Conteúdo' }));
    expect(screen.getByText('Textos Institucionais')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome do escritório')).toHaveValue(
      'Carreiro Advogados'
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Cores' }));
    expect(screen.getByText('Paleta de cores')).toBeInTheDocument();
    expect(screen.getByText('Prévia da navbar')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Identidade Visual' }));
    expect(screen.getByText('Logotipo')).toBeInTheDocument();
  });

  it('abre o modal de prévia ao clicar no botão "Ver prévia" e fecha corretamente', () => {
    render(<SiteClient />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ver prévia/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Sobre o Escritório')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Fechar prévia'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('salva os dados com sucesso e exibe mensagem de confirmação', async () => {
    salvarDadosInstitucionais.mockResolvedValueOnce({
      id: 1,
      nomeEscritorio: 'Carreiro Advogados',
      descricao: 'Slogan alterado',
    });

    render(<SiteClient />);

    fireEvent.click(screen.getByRole('tab', { name: 'Conteúdo' }));
    const inputDescricao = screen.getByLabelText('Slogan / subtítulo do hero');
    fireEvent.change(inputDescricao, { target: { value: 'Slogan alterado' } });

    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Configurações do site salvas com sucesso!')
      ).toBeInTheDocument();
    });
  });

  it('exibe alerta de erro caso falhe ao salvar', async () => {
    salvarDadosInstitucionais.mockRejectedValueOnce(
      new Error('Falha ao conectar no servidor')
    );

    render(<SiteClient />);

    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Falha ao conectar no servidor')
      ).toBeInTheDocument();
    });
  });

  it('bloqueia o acesso caso o usuário não seja administrador', () => {
    render(<SiteClient isAdmin={false} />);

    expect(screen.getByText('Acesso Restrito')).toBeInTheDocument();
    expect(
      screen.getByText(/apenas administradores possuem permissão/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('tab', { name: 'Conteúdo' })
    ).not.toBeInTheDocument();
  });
});
