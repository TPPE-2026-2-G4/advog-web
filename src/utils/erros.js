export const MENSAGEM_ERRO_PADRAO =
  'Algo deu errado. Tente novamente em instantes.';

const MENSAGEM_REDE =
  'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
const MENSAGEM_SERVIDOR =
  'O servidor encontrou um problema. Tente novamente em instantes.';
const MENSAGEM_RESPOSTA_INVALIDA =
  'O servidor enviou uma resposta inesperada. Tente novamente em instantes.';
const MENSAGEM_SESSAO = 'Sua sessão expirou. Faça login novamente.';
const MENSAGEM_PERMISSAO = 'Você não tem permissão para realizar esta ação.';
const MENSAGEM_NAO_ENCONTRADO = 'Não encontramos o que você procurava.';
const MENSAGEM_MUITAS_TENTATIVAS =
  'Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.';

// Mensagens inteiras (sem contexto de campo) que devem ser substituídas.
const MENSAGENS_COMPLETAS = [
  [
    /failed to fetch|networkerror|network request failed|load failed|fetch failed|network error/i,
    MENSAGEM_REDE,
  ],
  [
    /unexpected token|is not valid json|unexpected end of json|json\.parse/i,
    MENSAGEM_RESPOSTA_INVALIDA,
  ],
  [
    /internal server error|bad gateway|service unavailable|gateway time-?out|^http 5\d\d|status (code )?5\d\d/i,
    MENSAGEM_SERVIDOR,
  ],
  [
    /not authenticated|unauthorized|could not validate credentials|invalid token|token (has )?expired/i,
    MENSAGEM_SESSAO,
  ],
  [/forbidden|not enough permissions|permission denied/i, MENSAGEM_PERMISSAO],
  [/^not found$|^http 404/i, MENSAGEM_NAO_ENCONTRADO],
  [/too many requests|rate limit|^http 429/i, MENSAGEM_MUITAS_TENTATIVAS],
];

// Trechos de mensagens de validação do backend (Pydantic), traduzidos in loco
// para preservar o prefixo "Campo: ..." que alguns serviços adicionam.
const TRECHOS_VALIDACAO = [
  [/value error,\s*/i, ''],
  [/field required|\bmissing\b/i, 'campo obrigatório'],
  [
    /string should have at most (\d+) characters?/i,
    'use no máximo $1 caracteres',
  ],
  [
    /string should have at least (\d+) characters?/i,
    'use no mínimo $1 caracteres',
  ],
  [
    /(the )?(value is not a valid email address|email address is not valid|not a valid email)[^.]*/i,
    'informe um e-mail válido',
  ],
  [
    /input should be a valid (date ?time|date)[^.]*/i,
    'informe uma data válida',
  ],
  [
    /input should be a valid (integer|number)[^.]*/i,
    'informe um número válido',
  ],
  [
    /input should be greater than or equal to (\S+)/i,
    'o valor deve ser no mínimo $1',
  ],
  [/input should be greater than (\S+)/i, 'o valor deve ser maior que $1'],
  [
    /input should be less than or equal to (\S+)/i,
    'o valor deve ser no máximo $1',
  ],
  [/input should be less than (\S+)/i, 'o valor deve ser menor que $1'],
  [/input should be [^.]*/i, 'valor inválido'],
  [
    /(none is not an allowed value|input should be a valid (string|boolean|list|dictionary)[^.]*)/i,
    'valor inválido',
  ],
];

const PARECE_TECNICA =
  /\[object |\b(TypeError|ReferenceError|SyntaxError|Exception|Traceback|undefined|stack trace|ECONN\w+|ENOTFOUND)\b|\bnull\b.*\b(property|properties|of)\b/i;

const PARECE_INGLES_TECNICO =
  /\b(should|must be|is not|is required|invalid|cannot|could not|failed|error|not allowed|the|and|was|were|while|happened|unexpected|unable|please)\b/i;

function extrairTexto(entrada) {
  if (entrada == null) return '';
  if (typeof entrada === 'string') return entrada;
  if (entrada instanceof Error) return entrada.message || '';
  if (typeof entrada?.message === 'string') return entrada.message;
  if (typeof entrada?.detail === 'string') return entrada.detail;
  return '';
}

function capitalizar(texto) {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

/**
 * Converte erros técnicos (rede, HTTP, validação do backend em inglês, exceções
 * do JavaScript) em mensagens curtas e amigáveis em português. Mensagens que já
 * são legíveis (as que o backend escreve em português) passam sem alteração.
 */
export function mensagemAmigavel(entrada, fallback = MENSAGEM_ERRO_PADRAO) {
  const texto = extrairTexto(entrada).trim();
  if (!texto) return fallback;

  for (const [padrao, mensagem] of MENSAGENS_COMPLETAS) {
    if (padrao.test(texto)) return mensagem;
  }

  if (PARECE_TECNICA.test(texto)) return fallback;

  let traduzido = texto;
  for (const [padrao, substituicao] of TRECHOS_VALIDACAO) {
    traduzido = traduzido.replace(padrao, substituicao);
  }

  // Sobrou texto em inglês que não sabemos traduzir: melhor a mensagem padrão.
  if (traduzido === texto && PARECE_INGLES_TECNICO.test(texto)) return fallback;
  if (traduzido !== texto && PARECE_INGLES_TECNICO.test(traduzido)) {
    return fallback;
  }

  return capitalizar(traduzido.trim());
}
