import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  InstitucionalProvider,
  useInstitucionalContext,
} from './InstitucionalContext';
import * as institucionalService from '@/services/institucional';

function ConsumerComponent() {
  const { institucional } = useInstitucionalContext();
  return (
    <div>
      <span data-testid="nome">{institucional?.nomeEscritorio}</span>
      <span data-testid="primaria">{institucional?.corPrimaria}</span>
      <span data-testid="secundaria">{institucional?.corSecundaria}</span>
      <span data-testid="logo">{institucional?.logotipo}</span>
    </div>
  );
}

describe('InstitucionalContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('fornece dados iniciais e atualiza via buscarDadosInstitucionais', async () => {
    vi.spyOn(
      institucionalService,
      'buscarDadosInstitucionais'
    ).mockResolvedValue({
      nomeEscritorio: 'Escritório Silva',
      corPrimaria: '#112233',
      corSecundaria: '#445566',
    });

    render(
      <InstitucionalProvider>
        <ConsumerComponent />
      </InstitucionalProvider>
    );

    expect(await screen.findByText('Escritório Silva')).toBeInTheDocument();
    expect(screen.getByTestId('primaria')).toHaveTextContent('#112233');
    expect(screen.getByTestId('secundaria')).toHaveTextContent('#445566');
    expect(
      document.documentElement.style.getPropertyValue('--cor-primaria-texto')
    ).toBe('#ffffff');
    expect(
      document.documentElement.style.getPropertyValue('--cor-secundaria-texto')
    ).toBe('#ffffff');
  });

  it('reage ao evento institucional-updated', async () => {
    vi.spyOn(
      institucionalService,
      'buscarDadosInstitucionais'
    ).mockResolvedValue({
      nomeEscritorio: 'Nome Antigo',
      corPrimaria: '#1B2A4A',
      corSecundaria: '#B79A63',
    });

    render(
      <InstitucionalProvider>
        <ConsumerComponent />
      </InstitucionalProvider>
    );

    expect(await screen.findByText('Nome Antigo')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new CustomEvent('institucional-updated', {
          detail: {
            nomeEscritorio: 'Novo Nome Atualizado',
            corPrimaria: '#000000',
            corSecundaria: '#FFFFFF',
          },
        })
      );
    });

    expect(screen.getByTestId('nome')).toHaveTextContent(
      'Novo Nome Atualizado'
    );
    expect(screen.getByTestId('primaria')).toHaveTextContent('#000000');
    expect(screen.getByTestId('secundaria')).toHaveTextContent('#FFFFFF');
    expect(
      document.documentElement.style.getPropertyValue('--cor-primaria-texto')
    ).toBe('#ffffff');
    expect(
      document.documentElement.style.getPropertyValue('--cor-secundaria-texto')
    ).toBe('#172133');
  });

  it('inicializa imediatamente com dados do localStorage prevenindo flash de cores e logotipo padrões', async () => {
    vi.spyOn(
      institucionalService,
      'buscarDadosInstitucionais'
    ).mockResolvedValue(null);

    localStorage.setItem(
      'institucional_data',
      JSON.stringify({
        nomeEscritorio: 'Escritório Sem Flash',
        corPrimaria: '#123456',
        corSecundaria: '#654321',
        logotipo: 'https://exemplo.com/logo-custom.png',
      })
    );

    render(
      <InstitucionalProvider>
        <ConsumerComponent />
      </InstitucionalProvider>
    );

    // Deve carregar os dados do localStorage e sincronizar o estado prevenindo flash
    expect(await screen.findByText('Escritório Sem Flash')).toBeInTheDocument();
    expect(screen.getByTestId('primaria')).toHaveTextContent('#123456');
    expect(screen.getByTestId('secundaria')).toHaveTextContent('#654321');
    expect(screen.getByTestId('logo')).toHaveTextContent(
      'https://exemplo.com/logo-custom.png'
    );

    expect(
      document.documentElement.style.getPropertyValue('--cor-primaria')
    ).toBe('#123456');
    expect(
      document.documentElement.style.getPropertyValue('--cor-secundaria')
    ).toBe('#654321');

    const styleEl = document.getElementById('theme-injected-overrides');
    expect(styleEl).toBeInTheDocument();
    expect(styleEl?.textContent).toContain(
      '--cor-primaria: #123456 !important'
    );
    expect(styleEl?.textContent).toContain(
      '[data-testid="sidebar-logo-icon"] { display: none !important; }'
    );
  });
});
