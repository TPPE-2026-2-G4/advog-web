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
