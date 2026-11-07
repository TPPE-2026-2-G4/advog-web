import {
  Scale,
  Briefcase,
  Shield,
  Landmark,
  FileText,
  Users,
} from 'lucide-react';

export const formatParagraphs = (text) => {
  return text ? text.split('\n').filter((p) => p.trim() !== '') : [];
};
export const getImageUrl = (url) => {
  if (!url) return null;

  if (typeof url !== 'string') return url;
  const minioInternal = process.env.NEXT_PUBLIC_MINIO_INTERNAL;
  const minioExternal = process.env.NEXT_PUBLIC_MINIO_EXTERNAL;
  const minioAlias = process.env.NEXT_PUBLIC_MINIO_ALIAS;
  const minioAliasExternal = process.env.NEXT_PUBLIC_MINIO_ALIAS_EXTERNAL;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (minioInternal && minioExternal && url.includes(minioInternal)) {
    return url.replace(minioInternal, minioExternal);
  }

  if (minioAlias && minioAliasExternal && url.startsWith(minioAlias)) {
    return url.replace(minioAlias, minioAliasExternal);
  }

  if (url.startsWith('/')) {
    return `${apiUrl || ''}${url}`;
  }

  return url;
};

/**
 * Retorna a cor de texto mais legível ('#ffffff' ou '#172133') com base na luminância
 * da cor hexadecimal fornecida, utilizando o cálculo de contraste YIQ (FCC standard).
 *
 * @param {string} hexColor - Cor de fundo em formato hexadecimal (#RRGGBB ou #RGB)
 * @param {string} [darkColor='#172133'] - Cor de texto para fundos claros
 * @param {string} [lightColor='#ffffff'] - Cor de texto para fundos escuros
 * @returns {string} - Cor de texto adequada para garantir legibilidade
 */
export const getContrastTextColor = (
  hexColor,
  darkColor = '#172133',
  lightColor = '#ffffff'
) => {
  if (!hexColor || typeof hexColor !== 'string') {
    return darkColor;
  }

  let cleaned = hexColor.replace('#', '').trim();

  // Expande formato hex de 3 caracteres (ex: 'fff' -> 'ffffff')
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }

  if (cleaned.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return darkColor;
  }

  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);

  // Fórmula de luminância YIQ (padrão FCC)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  return yiq >= 150 ? darkColor : lightColor;
};

/**
 * Mapeia o título ou índice de uma área de atuação para um ícone representativo.
 *
 * @param {string} [titulo=''] - Título ou nome da área jurídica
 * @param {number} [index=0] - Índice na listagem para seleção cíclica de fallback
 * @returns {import('lucide-react').LucideIcon}
 */
export function getAreaIcon(titulo = '', index = 0) {
  const t = (titulo || '').toLowerCase();
  if (t.includes('trabalh') || t.includes('empresari')) return Briefcase;
  if (
    t.includes('penal') ||
    t.includes('criminal') ||
    t.includes('seguran') ||
    t.includes('defesa')
  ) {
    return Shield;
  }
  if (
    t.includes('tribut') ||
    t.includes('públic') ||
    t.includes('public') ||
    t.includes('bancár')
  ) {
    return Landmark;
  }
  if (t.includes('famíl') || t.includes('famil') || t.includes('sucess')) {
    return Users;
  }
  if (
    t.includes('contrat') ||
    t.includes('imobiliár') ||
    t.includes('consumid')
  ) {
    return FileText;
  }
  const icons = [Briefcase, Scale, Shield, Landmark, FileText, Users];
  return icons[index % icons.length];
}

/**
 * Valida os dados de configuração institucional antes da submissão.
 *
 * @param {Object} dados - Dados institucionais a serem validados
 * @returns {string|null} - Mensagem de erro em caso de validação inválida ou null
 */
export function validarDadosInstitucionais(dados = {}) {
  if (dados.email && dados.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dados.email.trim())) {
      return 'E-mail inválido. Por favor, insira um e-mail no formato correto (ex: contato@escritorio.adv.br).';
    }
  }

  if (dados.telefone && dados.telefone.trim()) {
    const telDigits = String(dados.telefone).replace(/\D/g, '');
    if (telDigits.length < 10 || telDigits.length > 11) {
      return 'Telefone inválido. Informe um número com DDD (10 ou 11 dígitos).';
    }
  }

  if (dados.corPrimaria && dados.corPrimaria.trim()) {
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(dados.corPrimaria.trim())) {
      return 'A cor primária deve ser um código hexadecimal válido (ex: #1B2A4A).';
    }
  }

  if (dados.corSecundaria && dados.corSecundaria.trim()) {
    if (
      !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(dados.corSecundaria.trim())
    ) {
      return 'A cor de acento deve ser um código hexadecimal válido (ex: #B79A63).';
    }
  }

  return null;
}
