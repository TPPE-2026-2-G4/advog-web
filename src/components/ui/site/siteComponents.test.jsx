import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VisualIdentityTab from './visualIdentityTab';
import ContentTab from './contentTab';
import ColorsTab from './colorsTab';
import PreviewModal from './previewModal';

describe('Componentes UI do Módulo Site', () => {
  describe('VisualIdentityTab', () => {
    it('renderiza os cards de logotipo e banner com sucesso', () => {
      render(
        <VisualIdentityTab
          logoPreview=""
          bannerPreview=""
          onUploadLogo={vi.fn()}
          onUploadBanner={vi.fn()}
          uploadError=""
        />
      );

      expect(screen.getByText('Logotipo')).toBeInTheDocument();
      expect(screen.getByText('Imagem do Banner (Hero)')).toBeInTheDocument();
      expect(screen.getByText('Fazer upload')).toBeInTheDocument();
      expect(screen.getByText('Clique para fazer upload')).toBeInTheDocument();
    });

    it('exibe a imagem do logotipo quando logoPreview é fornecido', () => {
      render(
        <VisualIdentityTab
          logoPreview="http://example.com/logo.png"
          bannerPreview=""
          onUploadLogo={vi.fn()}
          onUploadBanner={vi.fn()}
          uploadError=""
        />
      );

      const img = screen.getByAltText('Logotipo do escritório');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'http://example.com/logo.png');
    });

    it('exibe imagem do banner e botão substituir quando bannerPreview é fornecido', () => {
      render(
        <VisualIdentityTab
          logoPreview=""
          bannerPreview="http://example.com/banner.jpg"
          onUploadLogo={vi.fn()}
          onUploadBanner={vi.fn()}
          uploadError=""
        />
      );

      const banner = screen.getByAltText('Banner Hero');
      expect(banner).toBeInTheDocument();
      expect(screen.getByText('Substituir imagem')).toBeInTheDocument();
    });

    it('dispara onUploadLogo ao selecionar arquivo no input', () => {
      const handleUploadLogo = vi.fn();
      render(
        <VisualIdentityTab
          logoPreview=""
          bannerPreview=""
          onUploadLogo={handleUploadLogo}
          onUploadBanner={vi.fn()}
          uploadError=""
        />
      );

      const fileInput = screen.getByTestId('logo-file-input');
      const fakeFile = new File(['fake'], 'logo.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [fakeFile] } });

      expect(handleUploadLogo).toHaveBeenCalledWith(fakeFile);
    });

    it('dispara onUploadBanner ao selecionar arquivo no input de banner', () => {
      const handleUploadBanner = vi.fn();
      render(
        <VisualIdentityTab
          logoPreview=""
          bannerPreview=""
          onUploadLogo={vi.fn()}
          onUploadBanner={handleUploadBanner}
          uploadError=""
        />
      );

      const bannerInput = screen.getByTestId('banner-file-input');
      const fakeFile = new File(['fake'], 'banner.jpg', { type: 'image/jpeg' });
      fireEvent.change(bannerInput, { target: { files: [fakeFile] } });

      expect(handleUploadBanner).toHaveBeenCalledWith(fakeFile);
    });

    it('permite acionar upload de banner por teclado Enter e Espaço', () => {
      render(
        <VisualIdentityTab
          logoPreview=""
          bannerPreview=""
          onUploadLogo={vi.fn()}
          onUploadBanner={vi.fn()}
          uploadError=""
        />
      );

      const bannerArea = screen.getByRole('button', {
        name: /clique para fazer upload/i,
      });
      fireEvent.click(bannerArea);
      fireEvent.keyDown(bannerArea, { key: 'Enter' });
      fireEvent.keyDown(bannerArea, { key: ' ' });
      fireEvent.keyDown(bannerArea, { key: 'Tab' });
    });

    it('permite clicar em substituir imagem quando já houver banner', () => {
      render(
        <VisualIdentityTab
          logoPreview=""
          bannerPreview="http://example.com/banner.jpg"
          onUploadLogo={vi.fn()}
          onUploadBanner={vi.fn()}
          uploadError=""
        />
      );

      const replaceBtn = screen.getByRole('button', {
        name: /substituir imagem/i,
      });
      fireEvent.click(replaceBtn);
    });

    it('exibe mensagem de erro de upload quando fornecida', () => {
      render(
        <VisualIdentityTab
          logoPreview=""
          bannerPreview=""
          onUploadLogo={vi.fn()}
          onUploadBanner={vi.fn()}
          uploadError="Formato inválido"
        />
      );

      expect(screen.getByRole('alert')).toHaveTextContent('Formato inválido');
    });

    it('ignora quando nenhum arquivo for selecionado nos inputs de logo ou banner', () => {
      const onUploadLogo = vi.fn();
      const onUploadBanner = vi.fn();
      render(
        <VisualIdentityTab
          logoPreview=""
          bannerPreview=""
          onUploadLogo={onUploadLogo}
          onUploadBanner={onUploadBanner}
          uploadError=""
        />
      );

      fireEvent.change(screen.getByTestId('logo-file-input'), {
        target: { files: [] },
      });
      expect(onUploadLogo).not.toHaveBeenCalled();

      fireEvent.change(screen.getByTestId('banner-file-input'), {
        target: { files: [] },
      });
      expect(onUploadBanner).not.toHaveBeenCalled();
    });

    it('permite clicar no botão Fazer upload do logotipo', () => {
      render(
        <VisualIdentityTab
          logoPreview=""
          bannerPreview=""
          onUploadLogo={vi.fn()}
          onUploadBanner={vi.fn()}
          uploadError=""
        />
      );

      const uploadBtn = screen.getByRole('button', { name: 'Fazer upload' });
      fireEvent.click(uploadBtn);
    });
  });

  describe('ContentTab', () => {
    it('renderiza os campos de textos institucionais e dados de contato', () => {
      const formData = {
        nomeEscritorio: 'Carreiro Advogados',
        descricao: 'Slogan teste',
        sobreEscritorio: 'História teste',
        telefone: '(61) 98765-4321',
        email: 'contato@carreiro.adv.br',
        endereco: 'Brasília, DF',
      };

      render(<ContentTab formData={formData} onInputChange={vi.fn()} />);

      expect(screen.getByLabelText('Nome do escritório')).toHaveValue(
        'Carreiro Advogados'
      );
      expect(screen.getByLabelText('Slogan / subtítulo do hero')).toHaveValue(
        'Slogan teste'
      );
      expect(screen.getByLabelText('Sobre o escritório')).toHaveValue(
        'História teste'
      );
      expect(screen.getByLabelText('Telefone')).toHaveValue('(61) 98765-4321');
      expect(screen.getByLabelText('Email')).toHaveValue(
        'contato@carreiro.adv.br'
      );
      expect(screen.getByLabelText('Endereço')).toHaveValue('Brasília, DF');
    });

    it('chama onInputChange para cada campo quando são editados', () => {
      const handleInputChange = vi.fn();
      render(<ContentTab formData={{}} onInputChange={handleInputChange} />);

      fireEvent.change(screen.getByLabelText('Nome do escritório'), {
        target: { value: 'Novo Nome' },
      });
      expect(handleInputChange).toHaveBeenCalledWith(
        'nomeEscritorio',
        'Novo Nome'
      );

      fireEvent.change(screen.getByLabelText('Slogan / subtítulo do hero'), {
        target: { value: 'Novo Slogan' },
      });
      expect(handleInputChange).toHaveBeenCalledWith(
        'descricao',
        'Novo Slogan'
      );

      fireEvent.change(screen.getByLabelText('Sobre o escritório'), {
        target: { value: 'Novo Sobre' },
      });
      expect(handleInputChange).toHaveBeenCalledWith(
        'sobreEscritorio',
        'Novo Sobre'
      );

      fireEvent.change(screen.getByLabelText('Telefone'), {
        target: { value: '(61) 1234-5678' },
      });
      expect(handleInputChange).toHaveBeenCalledWith(
        'telefone',
        '(61) 1234-5678'
      );

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'novo@email.com' },
      });
      expect(handleInputChange).toHaveBeenCalledWith('email', 'novo@email.com');

      fireEvent.change(screen.getByLabelText('Endereço'), {
        target: { value: 'Novo Endereço' },
      });
      expect(handleInputChange).toHaveBeenCalledWith(
        'endereco',
        'Novo Endereço'
      );
    });
  });

  describe('ColorsTab', () => {
    it('renderiza as cores e a mini prévia da navbar', () => {
      const formData = {
        nomeEscritorio: 'Carreiro Advogados',
        corPrimaria: '#1B2A4A',
        corSecundaria: '#B79A63',
      };

      render(<ColorsTab formData={formData} onInputChange={vi.fn()} />);

      expect(
        screen.getByLabelText('Cor primária (fundo, navbar, rodapé)')
      ).toHaveValue('#1B2A4A');
      expect(
        screen.getByLabelText('Cor de acento (botões, ícones, destaques)')
      ).toHaveValue('#B79A63');

      const mockup = screen.getByTestId('navbar-mockup');
      expect(mockup).toBeInTheDocument();
      expect(screen.getByText('Prévia da navbar')).toBeInTheDocument();
    });

    it('chama onInputChange ao editar o código hex ou utilizar color picker', () => {
      const handleInputChange = vi.fn();
      render(
        <ColorsTab
          formData={{ corPrimaria: 'invalido', corSecundaria: 'invalido' }}
          onInputChange={handleInputChange}
        />
      );

      fireEvent.change(
        screen.getByLabelText('Cor primária (fundo, navbar, rodapé)'),
        {
          target: { value: '#000000' },
        }
      );
      expect(handleInputChange).toHaveBeenCalledWith('corPrimaria', '#000000');

      fireEvent.change(
        screen.getByLabelText('Cor de acento (botões, ícones, destaques)'),
        {
          target: { value: '#FFFFFF' },
        }
      );
      expect(handleInputChange).toHaveBeenCalledWith(
        'corSecundaria',
        '#FFFFFF'
      );

      fireEvent.change(screen.getByLabelText('Selecionar cor primária'), {
        target: { value: '#112233' },
      });
      expect(handleInputChange).toHaveBeenCalledWith('corPrimaria', '#112233');

      fireEvent.change(screen.getByLabelText('Selecionar cor de acento'), {
        target: { value: '#445566' },
      });
      expect(handleInputChange).toHaveBeenCalledWith(
        'corSecundaria',
        '#445566'
      );
    });

    it('utiliza cores padrão quando formData não possui cores definidas', () => {
      render(<ColorsTab formData={{}} onInputChange={vi.fn()} />);

      const inputPrimaria = screen.getByLabelText(
        'Cor primária (fundo, navbar, rodapé)'
      );
      expect(inputPrimaria).toHaveValue('');

      const swatchPrimaria = screen.getByTestId('swatch-primaria');
      expect(swatchPrimaria).toHaveStyle({ backgroundColor: '#1B2A4A' });
    });
  });

  describe('PreviewModal', () => {
    it('não renderiza nada quando isOpen é falso', () => {
      const { container } = render(
        <PreviewModal isOpen={false} onClose={vi.fn()} formData={{}} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renderiza o modal completo de prévia da landing page quando isOpen é verdadeiro', () => {
      const formData = {
        nomeEscritorio: 'Carreiro Advogados',
        descricao: 'Tradição e excelência',
        sobreEscritorio: 'Fundado em 2010...',
        telefone: '(61) 98765-4321',
        email: 'contato@carreiro.adv.br',
        endereco: 'Brasília, DF',
        corPrimaria: '#1B2A4A',
        corSecundaria: '#B79A63',
      };

      render(
        <PreviewModal isOpen={true} onClose={vi.fn()} formData={formData} />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Tradição e excelência')).toBeInTheDocument();
      expect(screen.getByText('Sobre o Escritório')).toBeInTheDocument();
      expect(screen.getByText('Fundado em 2010...')).toBeInTheDocument();
      expect(screen.getByText('(61) 98765-4321')).toBeInTheDocument();
      expect(screen.getByText('contato@carreiro.adv.br')).toBeInTheDocument();
      expect(screen.getByText('Brasília, DF')).toBeInTheDocument();
    });

    it('chama onClose ao clicar no botão fechar ou pressionar Escape', () => {
      const handleClose = vi.fn();
      render(
        <PreviewModal isOpen={true} onClose={handleClose} formData={{}} />
      );

      fireEvent.click(screen.getByLabelText('Fechar prévia'));
      expect(handleClose).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(window, { key: 'Tab' });
      expect(handleClose).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(2);
    });

    it('renderiza logotipo e bannerHero quando fornecidos e fecha no clique do overlay', () => {
      const handleClose = vi.fn();
      render(
        <PreviewModal
          isOpen={true}
          onClose={handleClose}
          formData={{
            nomeEscritorio: 'Carreiro Teste',
            logotipo: 'http://example.com/logo.png',
            bannerHero: 'http://example.com/banner.jpg',
          }}
        />
      );

      const logoImg = screen.getByAltText('Carreiro Teste');
      expect(logoImg).toHaveAttribute('src', 'http://example.com/logo.png');

      fireEvent.click(screen.getByRole('dialog'));
      expect(handleClose).not.toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('preview-modal-overlay'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
