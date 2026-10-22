import { getAccessToken } from '@/utils/authSession';

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  'http://localhost:8000';

export const DEFAULT_INSTITUCIONAL = {
  id: 1,
  nomeEscritorio: '',
  descricao: '',
  sobreEscritorio: '',
  imagemSobre: null,
  textoAdicionalSobre: '',
  email: '',
  telefone: '',
  endereco: '',
  corPrimaria: '#1B2A4A',
  corSecundaria: '#B79A63',
  logotipo: '',
  bannerHero: '',
};

export const DEFAULT_EQUIPE_SITE = [];

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
    const token = getAccessToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    // Remove campos de imagem do payload, pois o backend já os salva na rota de upload.
    // Enviar a presigned URL de volta corromperia a chave no banco de dados.
    const { imagemSobre, logotipo, bannerHero, ...dadosLimpos } = dados;

    const response = await fetch(`${apiUrl}/institucional`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(dadosLimpos),
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
    const token = getAccessToken();
    const formData = new FormData();
    formData.append('file', arquivo);

    const headers = {
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const response = await fetch(`${apiUrl}/institucional/upload/${tipo}`, {
      method: 'POST',
      headers,
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
