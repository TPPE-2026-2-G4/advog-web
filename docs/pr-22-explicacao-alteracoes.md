# Explicação Técnica das Alterações — PR #22

**Pull Request:** #22 — "[PR | RQN04] Inserção da equipe envolvida no escritório"  
**Repositório:** TPPE-2026-2-G4/advog-web  
**Data de geração:** {{GEN_DATE}}  

## Escopo e metodologia

Este documento descreve **somente as alterações efetivamente realizadas no diff do PR #22** nos arquivos de produção listados no enunciado.

- Arquivos de teste e equivalentes foram excluídos.
- Scripts auxiliares removidos foram excluídos.
- Código não alterado não foi documentado, exceto quando necessário para contextualizar integração.

## 1) Páginas

### 1.1 `src/app/(pages)/(private)/dashboard/page.jsx`

**Tipo:** [NOVO]  
**Função alterada:** `DashboardPage`

- **Responsabilidade:** interceptar acesso à rota `/dashboard` e redirecionar imediatamente para `/equipe`.
- **Fluxo:** ao renderizar o componente de página, executa `redirect('/equipe')` do `next/navigation`.
- **Entradas:** sem props.
- **Saídas/Efeitos:** navegação forçada para `/equipe` (efeito de roteamento no servidor).
- **Fallback/erro:** não há fallback local; a regra é determinística.

### 1.2 `src/app/(pages)/(public)/(landing-page)/page.jsx`

**Tipo:** [MODIFICADO] + [INTEGRAÇÃO]

#### `Home`

- **Carregamento paralelo [INTEGRAÇÃO]:** passou a executar `Promise.all` com três fontes:
  - `buscarDadosInstitucionais()`
  - `listarFuncionarios()`
  - `listarAtuacoes()`
- **Filtro de conteúdo visível [MODIFICADO]:**
  - mantém filtro de áreas visíveis (`exibicaoInstitucional`);
  - adiciona filtro da equipe visível (`visibleTeam = funcionarios.filter(f => f.exibicaoInstitucional)`).
- **Fallback de subtítulo da equipe [NOVO]:** `teamSubtitle` prioriza, em cascata:
  - `institucional.textoEquipe`
  - `institucional.descricaoEquipe`
  - `institucional.sobreEquipe`
  - texto padrão institucional.
- **Renderização da seção “Nossa Equipe” [NOVO]:** renderização condicional apenas quando `visibleTeam.length > 0`.
- **Cálculo de iniciais [INTEGRAÇÃO]:** usa `getLawyerInitials(member.nome)` para avatar textual.
- **Normalização/divisão de cargo [MODIFICADO]:**
  - extrai `cargoRaw` tanto de string quanto objeto (`nome`/`nome_cargo`);
  - divide em `cargoPrimary` e `cargoSecondary` por separadores `·` ou `-`.
- **Fallback de descrição/especialidade/área [NOVO]:** quando não há parte secundária do cargo, tenta, em ordem:
  - `member.cargo.descricao`
  - `member.descricao`
  - `member.especialidade`
  - `member.area`.
- **Formatação de OAB [INTEGRAÇÃO]:** delega para `formatOab(member)` antes de renderizar.
- **Estrutura de seções [MODIFICADO]:**
  - substitui wrapper inline por `styles.pageWrapper`;
  - padroniza blocos com `styles.container`;
  - segmenta semanticamente em “Sobre”, “Áreas de Atuação” e “Nossa Equipe”.

**Entradas:** sem props (página server-side assíncrona).  
**Saídas/Efeitos:** HTML SSR com blocos condicionais por disponibilidade/visibilidade de dados.  
**Fallback/erro:** mantém placeholders existentes para imagem institucional e adiciona fallback textual para subtítulo/campos de equipe.

### 1.3 `src/app/(pages)/(public)/primeiro-acesso/page.jsx`

**Tipo:** [MODIFICADO]  
**Trecho alterado:** campo `numeroOab` no formulário de primeiro acesso.

- **Responsabilidade da mudança:** alinhar entrada de número da OAB com regra de tamanho.
- **Alterações aplicadas:**
  - `placeholder` alterado para `Ex.: 12345`;
  - inclusão de `maxLength={5}`.
- **Efeito:** prevenção de digitação além de 5 caracteres no input do número da OAB.

## 2) Componentes (Navbar / Logout)

### 2.1 `src/components/layout/navbar/LogoutConfirmModal/LogoutConfirmModal.jsx`

**Tipo:** [NOVO]  
**Componente:** `LogoutConfirmModal`

- **Responsabilidade:** confirmar explicitamente a saída da conta antes de encerrar sessão.
- **Props de entrada:**
  - `isOpen` (controle de visibilidade);
  - `onClose` (cancelamento/fechamento);
  - `onConfirm` (confirmação de logout);
  - `isLoggingOut` (bloqueio de interação durante processamento).
- **Fluxo:**
  1. retorna `null` quando `isOpen` é falso (renderização condicional);
  2. renderiza `Modal` com `preventClose={isLoggingOut}`;
  3. botão “Cancelar” chama `onClose`;
  4. botão “Confirmar e sair” chama `onConfirm`.
- **Saídas/Efeitos:** callbacks de controle e confirmação; estado visual de carregamento.
- **Fallback/erro:** quando `isLoggingOut=true`, desabilita fechar/cancelar/confirmar e troca label por `<LoadingDots />`.

### 2.2 `src/components/layout/navbar/userMenu.jsx`

**Tipo:** [MODIFICADO] + [INTEGRAÇÃO]

#### `emptySubscribe`
- **Responsabilidade [NOVO]:** fornecer subscribe no-op para `useSyncExternalStore` e evitar mismatch de hidratação.

#### `UserMenu`
- **Estado novo/modificado:**
  - mantém `isOpen`;
  - adiciona `isLogoutModalOpen` (controle do modal);
  - adiciona `isLoggedOut` (estado local pós-confirmação).
- **Hidratação [MODIFICADO]:** usa `useSyncExternalStore` para distinguir render de cliente (`mounted`).
- **Integração com autenticação [INTEGRAÇÃO]:**
  - consome `AuthContext` (`auth?.user`, `auth?.logout`);
  - fallback para `getCurrentUser()` quando necessário.
- **Abertura/fechamento do modal [NOVO]:**
  - `handleOpenLogoutModal()` fecha dropdown e abre modal;
  - `handleCloseLogoutModal()` fecha modal.
- **Confirmação de logout [MODIFICADO/INTEGRAÇÃO]:** `handleConfirmLogout()`:
  1. fecha modal;
  2. marca `isLoggedOut`;
  3. executa `auth.logout()` quando disponível, senão `clearAuthSession()`;
  4. redireciona com `router.push('/login')`.
- **Derivação dos dados do usuário [MODIFICADO]:** `activeUser`, `userName`, `userRole`, `userEmail` com fallbacks para formatos alternativos de payload.
- **Saídas/Efeitos:** controle visual do menu, abertura do modal e encerramento de sessão com navegação.

## 3) Autenticação e Controle de Acesso

### 3.1 `src/contexts/AuthContext.jsx`

**Tipo:** [MODIFICADO] + [INTEGRAÇÃO]

#### `AuthProvider`
- **Sincronização por evento `storage` [NOVO]:**
  - registra listener que recalcula usuário via `getCurrentUser()`;
  - mantém estado de autenticação sincronizado entre abas/janelas.

#### `login`
- **Persistência adicional [MODIFICADO]:** além de `localStorage/sessionStorage`, grava cookie:
  - `access_token=<token>; path=/; max-age=86400; SameSite=Lax`.
- **Integração [INTEGRAÇÃO]:** viabiliza leitura do token por camadas que dependem de cookie (proxy/middleware).

#### `logout`
- **Delegação [MODIFICADO]:** substitui remoção manual por `clearAuthSession()` centralizada.

### 3.2 `src/hooks/useFirstLogin.js`

**Tipo:** [MODIFICADO]  
**Hook/função alterada:** fluxo de envio no primeiro acesso.

- **Mudança principal:** valida existência de `token` **antes** da validação de senha/confirmar senha.
- **Comportamento:** sem token válido, interrompe envio e define erro orientando uso do link recebido por e-mail.
- **Efeito:** evita chamadas de API sem credencial de primeiro acesso.

### 3.3 `src/proxy.js`

**Tipo:** [NOVO]

#### `proxy(request)`
- **Responsabilidade:** guarda de rota baseada na presença de cookie `access_token`.
- **Fluxo:**
  1. sem token e fora de `/login` → redireciona para `/login`;
  2. com token em `/login` → redireciona para `/equipe`;
  3. caso contrário → `NextResponse.next()`.
- **Entradas:** objeto `request` da camada de proxy.
- **Saídas/Efeitos:** respostas de redirecionamento/continuidade.

#### `config.matcher`
- **Mudança [NOVO]:** define proteção explícita para `/dashboard`, `/equipe`, `/financas`, `/processos`, `/site` e `/login`.

## 4) Serviços e Utilitários

### 4.1 `src/services/auth.js`

**Tipo:** [MODIFICADO]

#### `login(email, senha)`
- **Tratamento de erro [MODIFICADO]:** prioriza `errorData.detail` quando string; mantém fallback para `errorData.message`.

#### `firstLogin(...)`
- **Compatibilidade de contrato [MODIFICADO]:** aceita variantes de campos:
  - UF: `uf_oab` ou `uf`
  - número: `numero_oab` ou `numeroOab`
- **Tratamento de erro estruturado [NOVO]:**
  - se `detail` for lista, mapeia erros por campo;
  - mensagens específicas para `numero_oab` (5 dígitos) e `uf_oab` (2 letras);
  - concatena mensagens restantes quando aplicável.

### 4.2 `src/services/funcionarios.js`

**Tipo:** [MODIFICADO] + [INTEGRAÇÃO]

#### `excluirFuncionario(funcionarioId)`
- **Mudança:** passa a incluir header `Authorization: ****** **quando** houver token (`getAccessToken()`).

#### `mudarAcessoFuncionario(funcionarioId)`
- **Mudança:** mesmo comportamento de inclusão opcional de ****** no `PATCH`.

**Efeito de integração:** mantém compatibilidade com endpoints que exigem autenticação sem quebrar cenários sem token.

### 4.3 `src/utils/authSession.js`

**Tipo:** [MODIFICADO] + [NOVO]

#### `parseJwtPayload(token)`
- **Função nova:** decodifica payload JWT com tratamento defensivo (token inválido/formato inesperado).

#### `getCurrentUser()`
- **Mudanças principais:**
  - continua lendo `current_user` do storage;
  - valida consistência entre email do storage e email do JWT;
  - em divergência, limpa `current_user` inconsistente;
  - quando não há usuário persistido mas há token com email, deriva usuário mínimo (`funcionario_id`, `email`, `nome`, `cargo`).
- **Efeito:** reduz sessão “fantasma” e melhora recuperação de usuário a partir do token.

#### `clearAuthSession()`
- **Função nova:** centraliza limpeza de sessão em `localStorage`, `sessionStorage` e cookie `access_token` (expiração retroativa).

### 4.4 `src/utils/funcionario.js`

**Tipo:** [NOVO]

#### `formatOab(memberOrUf, maybeNumero)`
- **Responsabilidade:** normalizar e formatar número de OAB para múltiplos formatos de entrada.
- **Entradas suportadas:**
  - objeto de membro (várias chaves possíveis de UF e número);
  - assinatura direta (`uf`, `numero`).
- **Fluxo de normalização:**
  1. resolve UF e número de chaves alternativas;
  2. remove prefixos redundantes (`OAB`, `OAB/`);
  3. quando número é numérico puro (>=4 dígitos), aplica separador de milhar `pt-BR`;
  4. retorna `OAB/UF número` (com UF) ou `OAB número` (sem UF).
- **Fallback:** retorna string vazia quando dados mínimos não existem.

## 5) Estilos (apenas CSS alterado)

### 5.1 `src/app/(pages)/(public)/(landing-page)/page.module.css`

**Tipo:** [MODIFICADO]

- **Layout macro [NOVO]:**
  - `.pageWrapper` define ocupação vertical total;
  - `.sobreSection`, `.areasSection`, `.equipeSection` separam visualmente blocos da landing page.
- **Container [MODIFICADO]:** `.container` passa a padronizar tipografia base (`var(--font-inter)`) além de largura/padding.
- **Áreas de atuação [MODIFICADO]:** reorganização para encaixe no novo container/seção.
- **Equipe [NOVO]:** classes para composição da seção:
  - títulos/subtítulos (`.sectionTitle`, `.sectionSubtitle`);
  - grade e cartões (`.teamGrid`, `.teamCard`, hover);
  - avatar e metadados (`.teamAvatar`, `.teamName`, `.teamRolePrimary`, `.teamRoleSecondary`, `.teamOab`).
- **Propósito visual/responsivo:** introduzir bloco institucional da equipe com leitura centralizada, cartões responsivos em grid e hierarquia tipográfica consistente.

### 5.2 `src/components/layout/navbar/LogoutConfirmModal/LogoutConfirmModal.module.css`

**Tipo:** [NOVO]

- **Estrutura visual do modal:** `.modal`, `.header`, `.body`, `.footer`.
- **Semântica de ação:**
  - ícone e destaque de risco para logout (`.iconWrapper`, tons de vermelho);
  - botões distintos para cancelar/confirmar (`.cancelButton`, `.confirmButton`) com estados hover e disabled.
- **Responsividade mobile (`@media max-width: 480px`):**
  - reduz paddings;
  - empilha ações em coluna reversa;
  - botões passam a ocupar largura total.

## 6) Fluxos integrados finais

### 6.1 Autenticação e sessão

1. **Primeiro acesso/login** valida token e credenciais (`useFirstLogin`, `services/auth`).
2. Em login bem-sucedido, token é persistido também em **cookie** (`AuthContext.login`).
3. **Proxy** usa cookie para proteger rotas privadas e evitar acesso indevido a `/login` com sessão ativa.
4. **UserMenu** deriva usuário de `AuthContext/getCurrentUser`, abre modal de confirmação e dispara logout.
5. **clearAuthSession** limpa storage + cookie, finalizando sessão de forma centralizada.

### 6.2 Landing page institucional

1. `Home` busca dados em paralelo: institucional + funcionários + atuações.
2. Aplica filtros de visibilidade para áreas e equipe.
3. Monta seção “Nossa Equipe” com fallback textual e normalização de cargo.
4. Formata OAB com `formatOab` para exibição padronizada.

## Nota metodológica final

A documentação foi produzida a partir do **diff do PR #22** e restringe-se aos arquivos de produção alterados solicitados. Testes, arquivos removidos auxiliares e qualquer conteúdo não relacionado foram intencionalmente excluídos.
