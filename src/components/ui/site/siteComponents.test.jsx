import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VisualIdentityTab from './visualIdentityTab';
import ContentTab from './contentTab';
import ColorsTab from './colorsTab';
import TeamTab from './teamTab';
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

      fireEvent.change(
        screen.getByLabelText(
          'Informações adicionais (exibidas abaixo da descrição)'
        ),
        {
          target: { value: 'Novas informações adicionais' },
        }
      );
      expect(handleInputChange).toHaveBeenCalledWith(
        'textoAdicionalSobre',
        'Novas informações adicionais'
      );
    });

    it('renderiza upload de imagem da seção sobre e aciona onUploadImagemSobre', () => {
      const handleUpload = vi.fn();
      render(
        <ContentTab
          formData={{}}
          onInputChange={vi.fn()}
          onUploadImagemSobre={handleUpload}
          sobreImagePreview=""
        />
      );

      const fileInput = screen.getByTestId('sobre-file-input');
      const fakeFile = new File(['fake'], 'sobre.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [fakeFile] } });

      expect(handleUpload).toHaveBeenCalledWith(fakeFile);
    });

    it('ignora seleção vazia de arquivo para a imagem sobre', () => {
      const handleUpload = vi.fn();
      render(
        <ContentTab
          formData={{}}
          onInputChange={vi.fn()}
          onUploadImagemSobre={handleUpload}
          sobreImagePreview=""
        />
      );

      const fileInput = screen.getByTestId('sobre-file-input');
      fireEvent.change(fileInput, { target: { files: [] } });

      expect(handleUpload).not.toHaveBeenCalled();
    });

    it('exibe prévia da imagem sobre e botão de substituir quando fornecida', () => {
      render(
        <ContentTab
          formData={{ imagemSobre: 'http://minio/sobre.jpg' }}
          onInputChange={vi.fn()}
          onUploadImagemSobre={vi.fn()}
        />
      );

      const img = screen.getByAltText('Imagem da seção Sobre');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'http://minio/sobre.jpg');

      const replaceBtn = screen.getByRole('button', {
        name: /substituir imagem/i,
      });
      fireEvent.click(replaceBtn);
    });

    it('permite acionar upload de imagem sobre por teclado Enter e Espaço', () => {
      render(
        <ContentTab
          formData={{}}
          onInputChange={vi.fn()}
          onUploadImagemSobre={vi.fn()}
        />
      );

      const uploadArea = screen.getByRole('button', {
        name: /clique para fazer upload/i,
      });
      fireEvent.click(uploadArea);
      fireEvent.keyDown(uploadArea, { key: 'Enter' });
      fireEvent.keyDown(uploadArea, { key: ' ' });
      fireEvent.keyDown(uploadArea, { key: 'Tab' });
    });
  });

  describe('TeamTab', () => {
    const mockTeam = [
      {
        funcionario_id: 1,
        nome: 'Dr. Alexandre Carreiro',
        cargo: 'Sócio Fundador',
        exibicaoInstitucional: true,
      },
      {
        funcionario_id: 2,
        nome: 'Dra. Ana Paula Ribeiro',
        cargo: { nome: 'Advogada Sênior' },
        exibicaoInstitucional: false,
      },
      {
        funcionario_id: 3,
        nome: 'Pedro Lima',
        cargo: { nome_cargo: 'Advogado Pleno' },
        exibicaoInstitucional: true,
      },
      {
        funcionario_id: 4,
        nome: 'Mariana Costa',
        cargo: null,
        exibicaoInstitucional: false,
      },
    ];

    it('renderiza os membros da equipe com avatares e cargos', () => {
      render(<TeamTab team={mockTeam} onToggleLawyer={vi.fn()} />);

      expect(screen.getByText('Advogados exibidos no site')).toBeInTheDocument();
      expect(screen.getByText('Dr. Alexandre Carreiro')).toBeInTheDocument();
      expect(screen.getByText('Sócio Fundador')).toBeInTheDocument();
      expect(screen.getByText('AC')).toBeInTheDocument();

      expect(screen.getByText('Dra. Ana Paula Ribeiro')).toBeInTheDocument();
      expect(screen.getByText('Advogada Sênior')).toBeInTheDocument();
      expect(screen.getByText('AP')).toBeInTheDocument();

      expect(screen.getByText('Pedro Lima')).toBeInTheDocument();
      expect(screen.getByText('Advogado Pleno')).toBeInTheDocument();
      expect(screen.getByText('PL')).toBeInTheDocument();

      expect(screen.getByText('Mariana Costa')).toBeInTheDocument();
      expect(screen.getByText('MC')).toBeInTheDocument();

      expect(
        screen.getByText('2 de 4 advogados visíveis no site institucional')
      ).toBeInTheDocument();
    });

    it('dispara onToggleLawyer ao clicar no switch', () => {
      const handleToggle = vi.fn();
      render(<TeamTab team={mockTeam} onToggleLawyer={handleToggle} />);

      const toggleAlexandre = screen.getByRole('switch', {
        name: 'Exibir Dr. Alexandre Carreiro no site',
      });
      expect(toggleAlexandre).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(toggleAlexandre);
      expect(handleToggle).toHaveBeenCalledWith(1);
    });

    it('renderiza corretamente com lista vazia de membros', () => {
      render(<TeamTab team={[]} onToggleLawyer={vi.fn()} />);

      expect(
        screen.getByText('0 de 0 advogados visíveis no site institucional')
      ).toBeInTheDocument();
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

    it('renderiza imagemSobre, textoAdicionalSobre e advogados visíveis da equipe', () => {
      const mockTeam = [
        {
          funcionario_id: 1,
          nome: 'Dr. Alexandre Carreiro',
          cargo: 'Sócio Fundador',
          exibicaoInstitucional: true,
        },
        {
          funcionario_id: 2,
          nome: 'Dra. Ana Paula Ribeiro',
          cargo: { nome: 'Advogada Sênior' },
          exibicaoInstitucional: false,
        },
        {
          funcionario_id: 3,
          nome: 'Mariana Costa',
          cargo: { nome_cargo: 'Advogada Plena' },
          exibicaoInstitucional: true,
        },
      ];

      render(
        <PreviewModal
          isOpen={true}
          onClose={vi.fn()}
          formData={{
            imagemSobre: 'http://minio/sobre.jpg',
            textoAdicionalSobre: 'Mais de 500 casos atendidos',
          }}
          team={mockTeam}
        />
      );

      const sobreImg = screen.getByAltText('Sobre o Escritório');
      expect(sobreImg).toHaveAttribute('src', 'http://minio/sobre.jpg');
      expect(
        screen.getByText('Mais de 500 casos atendidos')
      ).toBeInTheDocument();

      expect(screen.getByText('Nossa Equipe')).toBeInTheDocument();
      expect(screen.getByText('Dr. Alexandre Carreiro')).toBeInTheDocument();
      expect(screen.getByText('Sócio Fundador')).toBeInTheDocument();
      expect(screen.getByText('AC')).toBeInTheDocument();

      expect(screen.getByText('Mariana Costa')).toBeInTheDocument();
      expect(screen.getByText('MC')).toBeInTheDocument();

      // Advogada não visível não deve aparecer
      expect(
        screen.queryByText('Dra. Ana Paula Ribeiro')
      ).not.toBeInTheDocument();
    });

    it('não renderiza a seção Nossa Equipe se nenhum advogado estiver visível', () => {
      const mockTeam = [
        {
          funcionario_id: 1,
          nome: 'Dr. Alexandre Carreiro',
          exibicaoInstitucional: false,
        },
      ];

      render(
        <PreviewModal
          isOpen={true}
          onClose={vi.fn()}
          formData={{}}
          team={mockTeam}
        />
      );

      expect(screen.queryByText('Nossa Equipe')).not.toBeInTheDocument();
    });
  });
});
