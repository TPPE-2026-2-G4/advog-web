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
