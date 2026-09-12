const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  'http://localhost:8000';

export const DEFAULT_INSTITUCIONAL = {
  id: 1,
  nomeEscritorio: 'Carreiro Advogados',
  descricao: 'Tradição e excelência na defesa dos seus direitos',
  sobreEscritorio:
    'Fundado em 2010 por Dr. Alexandre Carreiro, o escritório nasceu com a missão de oferecer atendimento jurídico de excelência, combinando tradição e inovação tecnológica.',
  email: 'contato@carreiro.adv.br',
  telefone: '(61) 98765-4321',
  endereco: 'SCLN 203, Bloco B — Brasília, DF',
  corPrimaria: '#1B2A4A',
  corSecundaria: '#B79A63',
  logotipo: '',
  bannerHero: '',
};

export async function buscarDadosInstitucionais() {
  try {
    const response = await fetch(`${apiUrl}/institucional`, {
      cache: 'no-store',
    });

    if (!response.ok) return DEFAULT_INSTITUCIONAL;

    const data = await response.json();
    return { ...DEFAULT_INSTITUCIONAL, ...data };
  } catch {
    return DEFAULT_INSTITUCIONAL;
  }
}

export async function salvarDadosInstitucionais(dados) {
  try {
    const response = await fetch(`${apiUrl}/institucional`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dados),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(
        error?.detail || 'Não foi possível salvar as configurações do site.'
      );
    }

    return await response.json();
  } catch (error) {
    if (error.message && !error.message.includes('fetch')) {
      throw error;
    }
    return { ...DEFAULT_INSTITUCIONAL, ...dados };
  }
}

export async function uploadImagemInstitucional(arquivo, tipo = 'logo') {
  try {
    const formData = new FormData();
    formData.append('file', arquivo);

    const response = await fetch(`${apiUrl}/institucional/upload/${tipo}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Falha no upload do arquivo.');
    }

    const data = await response.json();
    return data.url || URL.createObjectURL(arquivo);
  } catch {
    return URL.createObjectURL(arquivo);
  }
}
