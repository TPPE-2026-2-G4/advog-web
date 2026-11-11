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
  email: '',
  telefone: '',
  endereco: '',
  corPrimaria: '#1B2A4A',
  corSecundaria: '#B79A63',
  logotipo: '',
  bannerHero: '',
};

export const DEFAULT_EQUIPE_SITE = [];

const validationFieldLabels = {
  nomeEscritorio: 'Nome do escritório',
  descricao: 'Slogan / subtítulo',
  sobreEscritorio: 'Sobre o escritório',
  telefone: 'Telefone',
  email: 'E-mail',
  endereco: 'Endereço',
  corPrimaria: 'Cor primária',
  corSecundaria: 'Cor de acento',
};

async function parseInstitucionalError(response, fallbackMessage) {
  try {
    const error = await response.json();
    if (!error) return fallbackMessage;
    if (typeof error === 'string') return error;
    if (typeof error.detail === 'string') return error.detail;
    if (Array.isArray(error.detail)) {
      const messages = error.detail
        .map((item) => {
          if (typeof item === 'string') return item;
          const field = item.loc ? item.loc[item.loc.length - 1] : null;
          const label = validationFieldLabels[field] || field;
          if (field === 'email') {
            return 'E-mail inválido. Por favor, insira um e-mail no formato correto (ex: contato@escritorio.adv.br).';
          }
          if (label && item.msg) {
            return `${label}: ${item.msg}`;
          }
          return (
            item.msg || (item.message ? item.message : JSON.stringify(item))
          );
        })
        .filter(Boolean);
      if (messages.length > 0) return messages.join(' ');
    }
    if (typeof error.detail === 'object' && error.detail !== null) {
      return (
        error.detail.message || error.detail.msg || JSON.stringify(error.detail)
      );
    }
    if (error.message) return error.message;
    return fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

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

export async function listarEquipeInstitucional() {
  try {
    const response = await fetch(`${apiUrl}/institucional/equipe`, {
      cache: 'no-store',
    });

    if (!response.ok) return DEFAULT_EQUIPE_SITE;

    const data = await response.json();
    return Array.isArray(data) ? data : DEFAULT_EQUIPE_SITE;
  } catch {
    return DEFAULT_EQUIPE_SITE;
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
    const {
      imagemSobre,
      logotipo,
      bannerHero,
      textoAdicionalSobre,
      ...dadosLimpos
    } = dados;

    const response = await fetch(`${apiUrl}/institucional`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(dadosLimpos),
    });

    if (!response.ok) {
      const errorMessage = await parseInstitucionalError(
        response,
        'Não foi possível salvar as configurações do site.'
      );
      throw new Error(errorMessage);
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
