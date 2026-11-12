import { TIPOS_NOTIFICACAO } from '@/constants/notificacoes';

const TIPOS_NOTIFICACAO_SET = new Set(TIPOS_NOTIFICACAO);

export const isTipoNotificacao = (tipo) =>
  typeof tipo === 'string' && TIPOS_NOTIFICACAO_SET.has(tipo);

export const normalizarNotificacao = (notificacao) => ({
  ...notificacao,
  tipo: isTipoNotificacao(notificacao?.tipo) ? notificacao.tipo : 'SISTEMA',
  link_destino:
    typeof notificacao?.link_destino === 'string'
      ? notificacao.link_destino
      : null,
});

const ROTA_INTERNA = /^\/(?![\/\\])/;

export const resolverLinkDestino = (linkDestino) =>
  typeof linkDestino === 'string' && ROTA_INTERNA.test(linkDestino)
    ? linkDestino
    : null;

const formatadorRelativo = new Intl.RelativeTimeFormat('pt-BR', {
  numeric: 'always',
});

const UNIDADES_TEMPO = [
  ['ano', 'year', 31536000],
  ['mês', 'month', 2592000],
  ['dia', 'day', 86400],
  ['hora', 'hour', 3600],
  ['minuto', 'minute', 60],
  ['segundo', 'second', 1],
];

export const formatarDataRelativa = (valor, agora = new Date()) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'data desconhecida';

  const diferenca = (data.getTime() - agora.getTime()) / 1000;
  const [, unidadeFormatada, segundos] =
    UNIDADES_TEMPO.find(([, , limite]) => Math.abs(diferenca) >= limite) ??
    UNIDADES_TEMPO[UNIDADES_TEMPO.length - 1];

  return formatadorRelativo.format(
    Math.round(diferenca / segundos),
    unidadeFormatada
  );
};

export const formatarDataCompleta = (valor) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Data desconhecida';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(data);
};
