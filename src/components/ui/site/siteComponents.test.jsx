import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VisualIdentityTab from './visualIdentityTab';
import ContentTab from './contentTab';
import ColorsTab from './colorsTab';
import TeamTab from './teamTab';
import AreasTab from './areasTab';
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

    it.each([
      {
        label: 'Nome do escritório',
        campo: 'nomeEscritorio',
        valor: 'Novo Nome',
      },
      {
        label: 'Slogan / subtítulo do hero',
        campo: 'descricao',
        valor: 'Novo Slogan',
      },
      {
        label: 'Sobre o escritório',
        campo: 'sobreEscritorio',
        valor: 'Novo Sobre',
      },
      {
        label: 'Telefone',
        campo: 'telefone',
        valor: '(61) 1234-5678',
      },
      {
        label: 'Email',
        campo: 'email',
        valor: 'novo@email.com',
      },
      {
        label: 'Endereço',
        campo: 'endereco',
        valor: 'Novo Endereço',
      },
      {
        label: 'Informações adicionais (exibidas abaixo da descrição)',
        campo: 'textoAdicionalSobre',
        valor: 'Novas informações adicionais',
      },
    ])(
      'chama onInputChange("$campo", "$valor") ao editar o campo "$label"',
      ({ label, campo, valor }) => {
        const handleInputChange = vi.fn();
        render(<ContentTab formData={{}} onInputChange={handleInputChange} />);

        fireEvent.change(screen.getByLabelText(label), {
          target: { value: valor },
        });
        expect(handleInputChange).toHaveBeenCalledWith(campo, valor);
      }
    );

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
      expect(img).toHaveAttribute('src', 'http://localhost:9000/sobre.jpg');

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

  describe('AreasTab', () => {
    const mockAreas = [
      {
        atuacao_id: 1,
        titulo: 'Direito Civil',
        descricao: 'Contratos e obrigações.',
        exibicaoInstitucional: true,
      },
      {
        atuacao_id: 2,
        nome: 'Direito Trabalhista',
        descricao: 'Defesa trabalhista.',
        exibicaoInstitucional: false,
      },
    ];

    it('renderiza as áreas de atuação e contador de visibilidade', () => {
      render(<AreasTab areas={mockAreas} onToggleArea={vi.fn()} />);

      expect(
        screen.getByText('Áreas de Atuação exibidas no site')
      ).toBeInTheDocument();
      expect(screen.getByText('Direito Civil')).toBeInTheDocument();
      expect(screen.getByText('Contratos e obrigações.')).toBeInTheDocument();
      expect(screen.getByText('Direito Trabalhista')).toBeInTheDocument();
      expect(
        screen.getByText(
          '1 de 2 áreas de atuação visíveis no site institucional'
        )
      ).toBeInTheDocument();
    });

    it('permite alternar visibilidade e confirmar ou cancelar a exclusão de uma área', async () => {
      const handleToggle = vi.fn();
      const handleDelete = vi.fn().mockResolvedValue({});
      render(
        <AreasTab
          areas={mockAreas}
          onToggleArea={handleToggle}
          onDeleteArea={handleDelete}
        />
      );

      fireEvent.click(
        screen.getByRole('switch', { name: 'Exibir Direito Civil no site' })
      );
      expect(handleToggle).toHaveBeenCalledWith(1);

      // Abre modal e cancela pelo botão Cancelar
      fireEvent.click(
        screen.getByRole('button', { name: 'Excluir Direito Civil' })
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Excluir área de atuação?')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(handleDelete).not.toHaveBeenCalled();

      // Abre modal para item com nome (sem titulo) e fecha pelo botão X (Fechar)
      fireEvent.click(
        screen.getByRole('button', { name: 'Excluir Direito Trabalhista' })
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Abre modal, clica dentro do dialog (não fecha) e depois no overlay (fecha)
      fireEvent.click(
        screen.getByRole('button', { name: 'Excluir Direito Civil' })
      );
      const dialog = screen.getByRole('dialog');
      fireEvent.click(dialog);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.click(dialog.parentElement);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Abre modal e confirma exclusão
      fireEvent.click(
        screen.getByRole('button', { name: 'Excluir Direito Civil' })
      );
      fireEvent.click(screen.getByRole('button', { name: 'Excluir área' }));
      await waitFor(() => {
        expect(handleDelete).toHaveBeenCalledWith(1);
      });
    });

    it('permite abrir o formulário, validar campos curtos, criar e cancelar', async () => {
      const handleCreate = vi.fn().mockResolvedValue({});
      render(<AreasTab areas={[]} onCreateArea={handleCreate} />);

      fireEvent.click(screen.getByRole('button', { name: /nova área/i }));
      expect(screen.getByText('Nova área de atuação')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Adicionar área' }));
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Informe o título e a descrição com pelo menos 2 caracteres.'
      );

      fireEvent.change(screen.getByLabelText(/título da área/i), {
        target: { value: 'Direito Previdenciário' },
      });
      fireEvent.change(screen.getByLabelText(/descrição da área/i), {
        target: { value: 'Aposentadorias e benefícios.' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Adicionar área' }));
      await waitFor(() => {
        expect(handleCreate).toHaveBeenCalledWith({
          nome: 'Direito Previdenciário',
          descricao: 'Aposentadorias e benefícios.',
          exibicaoInstitucional: true,
        });
      });
    });

    it('permite editar uma área existente e cancelar o formulário', async () => {
      const handleUpdate = vi.fn().mockResolvedValue({});
      render(
        <AreasTab
          areas={[
            {
              atuacao_id: 10,
              nome: '',
              descricao: '',
              exibicaoInstitucional: true,
            },
            ...mockAreas,
          ]}
          onUpdateArea={handleUpdate}
        />
      );

      fireEvent.click(
        screen.getByRole('button', { name: 'Editar Direito Trabalhista' })
      );
      expect(screen.getByText('Editar área de atuação')).toBeInTheDocument();
      expect(screen.getByLabelText(/título da área/i)).toHaveValue(
        'Direito Trabalhista'
      );

      fireEvent.change(screen.getByLabelText(/título da área/i), {
        target: { value: 'Direito Empresarial' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Salvar área' }));

      await waitFor(() => {
        expect(handleUpdate).toHaveBeenCalledWith(2, {
          nome: 'Direito Empresarial',
          descricao: 'Defesa trabalhista.',
        });
      });

      // Testa abrir edição de item vazio e cancelar
      fireEvent.click(screen.getAllByRole('button', { name: /editar/i })[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(
        screen.queryByText('Editar área de atuação')
      ).not.toBeInTheDocument();
    });

    it.each([
      [new Error('Área já cadastrada'), 'Área já cadastrada'],
      [{}, 'Não foi possível salvar a área de atuação.'],
    ])(
      'exibe erro no formulário quando onCreateArea falha (%j)',
      async (errObj, msgEsperada) => {
        const handleCreate = vi.fn().mockRejectedValueOnce(errObj);
        render(<AreasTab onCreateArea={handleCreate} />);

        fireEvent.click(screen.getByRole('button', { name: /nova área/i }));
        fireEvent.change(screen.getByLabelText(/título da área/i), {
          target: { value: 'Direito Civil' },
        });
        fireEvent.change(screen.getByLabelText(/descrição da área/i), {
          target: { value: 'Descrição válida' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Adicionar área' }));

        await waitFor(() => {
          expect(screen.getByRole('alert')).toHaveTextContent(msgEsperada);
        });
      }
    );
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
      {
        funcionario_id: 5,
        nome: 'Carlos Souza',
        cargo: {},
        exibicaoInstitucional: true,
      },
    ];

    it('renderiza os membros da equipe com avatares e cargos', () => {
      render(<TeamTab team={mockTeam} onToggleLawyer={vi.fn()} />);

      expect(
        screen.getByText('Advogados exibidos no site')
      ).toBeInTheDocument();
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
        screen.getByText('3 de 5 advogados visíveis no site institucional')
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

    it.each([
      {
        label: 'Cor primária (fundo, navbar, rodapé)',
        campo: 'corPrimaria',
        valor: '#000000',
      },
      {
        label: 'Cor de acento (botões, ícones, destaques)',
        campo: 'corSecundaria',
        valor: '#FFFFFF',
      },
      {
        label: 'Selecionar cor primária',
        campo: 'corPrimaria',
        valor: '#112233',
      },
      {
        label: 'Selecionar cor de acento',
        campo: 'corSecundaria',
        valor: '#445566',
      },
    ])(
      'chama onInputChange("$campo", "$valor") ao alterar "$label"',
      ({ label, campo, valor }) => {
        const handleInputChange = vi.fn();
        render(
          <ColorsTab
            formData={{ corPrimaria: 'invalido', corSecundaria: 'invalido' }}
            onInputChange={handleInputChange}
          />
        );

        fireEvent.change(screen.getByLabelText(label), {
          target: { value: valor },
        });
        expect(handleInputChange).toHaveBeenCalledWith(campo, valor);
      }
    );

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

    it('renderiza imagemSobre, textoAdicionalSobre, áreas de atuação e advogados visíveis', () => {
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
          exibicaoInstitucional: true,
        },
        {
          funcionario_id: 3,
          nome: 'Mariana Costa',
          cargo: { nome_cargo: 'Advogada Plena' },
          exibicaoInstitucional: true,
        },
        {
          funcionario_id: 4,
          nome: 'Pedro Lima',
          cargo: null,
          exibicaoInstitucional: true,
        },
        {
          funcionario_id: 5,
          nome: 'Carlos Souza',
          cargo: {},
          exibicaoInstitucional: true,
        },
        {
          funcionario_id: 6,
          nome: 'Advogado Oculto',
          cargo: 'Consultor',
          exibicaoInstitucional: false,
        },
      ];
      const mockAreas = [
        {
          atuacao_id: 1,
          titulo: 'Direito Civil',
          descricao: 'Contratos e obrigações',
          exibicaoInstitucional: true,
        },
        {
          atuacao_id: 2,
          nome: 'Direito Trabalhista',
          descricao: 'Relações de trabalho',
          exibicaoInstitucional: true,
        },
        {
          atuacao_id: 3,
          nome: 'Área Oculta',
          descricao: 'Oculta',
          exibicaoInstitucional: false,
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
          areas={mockAreas}
        />
      );

      const sobreImg = screen.getByAltText('Sobre o Escritório');
      expect(sobreImg).toHaveAttribute(
        'src',
        'http://localhost:9000/sobre.jpg'
      );
      expect(
        screen.getByText('Mais de 500 casos atendidos')
      ).toBeInTheDocument();

      expect(screen.getByText('Áreas de Atuação')).toBeInTheDocument();
      expect(screen.getByText('Direito Civil')).toBeInTheDocument();
      expect(screen.getByText('Direito Trabalhista')).toBeInTheDocument();
      expect(screen.queryByText('Área Oculta')).not.toBeInTheDocument();

      expect(screen.getByText('Nossa Equipe')).toBeInTheDocument();
      expect(screen.getByText('Dr. Alexandre Carreiro')).toBeInTheDocument();
      expect(screen.getByText('Sócio Fundador')).toBeInTheDocument();
      expect(screen.getByText('AC')).toBeInTheDocument();

      expect(screen.getByText('Mariana Costa')).toBeInTheDocument();
      expect(screen.getByText('MC')).toBeInTheDocument();

      expect(screen.getByText('Dra. Ana Paula Ribeiro')).toBeInTheDocument();
      expect(screen.getByText('Advogada Sênior')).toBeInTheDocument();

      expect(screen.queryByText('Advogado Oculto')).not.toBeInTheDocument();
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
