# Frontend | Sistema de Gestão Jurídica

Bem-vindo ao repositório de frontend da equipe 4 (TPPE-2026-2)!

Este repositório contém a aplicação **Site Institucional + Sistema de Gestão Jurídica**, responsável pela interface com o usuário da plataforma.

O frontend é construído com [Next.js 16](https://nextjs.org/) (App Router + React Compiler), [React 19](https://react.dev/), JavaScript, CSS Modules e [Tailwind CSS 4](https://tailwindcss.com/), utilizando [Vitest](https://vitest.dev/) e [Testing Library](https://testing-library.com/) para testes automatizados parametrizados e de integração.

## Como acessar o site

A aplicação publicada (versão mais recente da branch `main`) está disponível no [Vercel](https://advog-web.vercel.app/).

---

## Módulos e Funcionalidades

### Área Pública (`(public)`)

- **Landing Page Institucional (`/`)**: Apresentação dinâmica do escritório (história, áreas de atuação visíveis, equipe de advogados com OAB/especialidades) e formulário público de **Solicitação de Atendimento**.
- **Autenticação (`/login`)**: Login com validação de credenciais, persistência de sessão (`sessionStorage`, `localStorage` e cookies) e feedback de conclusão de cadastro.
- **Primeiro Acesso (`/primeiro-acesso`)**: Conclusão de cadastro de novos membros via token de convite, com suporte a profissionais com OAB (UF + número) e estagiários.

### Área Privada (`(private)`)

- **Layout Privado e Controle de Rotas (`proxy.js`)**: Redirecionamento automático de rotas protegidas, menu lateral (`Sidebar`), barra superior (`Navbar`), menu do usuário (`UserMenu`) e confirmação de encerramento de sessão (`LogoutConfirmModal`).
- **Clientes / CRM (`/clientes`)**: Listagem com indicadores, filtros combinados (busca textual por nome/CPF/CNPJ/e-mail, etapa/status e autocomplete de responsável), cadastro, visualização de detalhes, edição e exclusão.
- **Equipe e Permissões (`/equipe`)**: Gestão de funcionários e cargos, controle de status de acesso, atribuição granular de permissões (`PermissionChecklist`) e indicadores da equipe.
- **Controle Financeiro (`/financas`)**: Cards de resumo financeiro (entradas, saídas, saldo realizado e pendente), tabela paginada com filtros por período/categoria/tipo/status, alternância rápida de status e modal de lançamentos com autocomplete e criação/exclusão de categorias.
- **Casos e Processos (`/processos`)**: Gerenciamento de processos jurídicos com formatação e validação do número CNJ, controle de prazos (dias restantes/atraso), filtros avançados e paginação.
- **Customização do Site Institucional (`/site`)**: Painel administrativo dividido em 5 abas (**Identidade Visual**, **Conteúdo**, **Áreas de Atuação**, **Equipe** e **Cores**) com upload de imagens (logotipo, banner hero e seção sobre) e **Modal de Pré-visualização (`PreviewModal`)** em tempo real.

---

## Como rodar o projeto localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 24 ou superior — a versão usada na esteira de CI/CD).
- npm (já incluso na instalação do Node.js).

### Instalação e Execução

1.  **Clone este repositório:**

    ```bash
    git clone https://github.com/TPPE-2026-2-G4/advog-web.git
    cd advog-web
    ```

2.  **Configure as variáveis de ambiente (opcional):**

    Copie o arquivo `.env.example` para `.env.local` (por padrão a aplicação aponta para `http://localhost:8000` caso `NEXT_PUBLIC_API_URL` não esteja definida).

3.  **Instale as dependências:**

    ```bash
    npm ci
    ```

4.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```
    _O site estará disponível em `http://localhost:3000/`. Qualquer alteração nos arquivos de `src/` será refletida no navegador instantaneamente (Hot Reload)._

### Execução com Docker

Para executar a aplicação em um container com a configuração de produção, é necessário ter [Docker](https://www.docker.com/) e Docker Compose instalados.

```bash
docker compose up --build
```

O serviço ficará disponível em `http://localhost:3000/`. Para interromper e remover o container, execute:

```bash
docker compose down
```

O `Dockerfile` utiliza um build em múltiplas etapas: instala as dependências, gera a build do Next.js e inicia somente a aplicação compilada.

---

## Scripts e Suíte de Testes

### Scripts disponíveis

- `npm run dev` — Inicia o servidor de desenvolvimento.
- `npm run build` — Gera a build de produção do Next.js.
- `npm run start` — Inicia a aplicação em modo de produção (após o build).
- `npm run test` — Executa os testes do Vitest em modo de observação (watch).
- `npm run test:param` — Executa apenas as **78 suítes de testes unitários/parametrizados** (exclui os arquivos `.integration.test.*`).
- `npm run test:param:coverage` — Executa as suítes parametrizadas/unitárias e valida a cobertura isolada (`> 90%`).
- `npm run test:integration` — Executa exclusivamente as **9 suítes de testes de integração** (`.integration.test.jsx`).
- `npm run test:integration:coverage` — Executa as suítes de integração e valida a cobertura atingida pelos fluxos integrados (`> 90%`).
- `npm run test:coverage` — Executa todas as **87 suítes** (parametrizadas + integração) e gera o relatório completo de cobertura.
- `npm run lint` — Executa o ESLint e corrige automaticamente os problemas.
- `npm run format` — Formata o código com o Prettier.
- `npm run commit` — Abre o Commitizen para padronizar as mensagens de commit.

### Arquitetura de Testes

O projeto adota duas camadas complementares de testes automatizados com **Vitest** e **React Testing Library**, ambas exigindo cobertura mínima de **90%** de linhas, funções e statements (e **85%** de branches) configurada em `vitest.config.mts`:

1.  **Testes Unitários Parametrizados (`*.test.js` / `*.test.jsx` — 78 suítes):**
    - Utilizam `it.each` / `test.each` orientados a tabelas de dados (classes de equivalência e valores-limite) para validar funções utilitárias (`src/utils/`), serviços HTTP (`src/services/`), hooks customizados (`src/hooks/`), contextos (`src/contexts/`), constantes (`src/constants/`), componentes de UI (`src/components/`) e páginas (`src/app/`).
    - Cobertura atual isolada: **~98.8% de linhas**.
2.  **Testes de Integração de Frontend (`*.integration.test.jsx` — 9 suítes):**
    - Testam a comunicação ponta a ponta dentro do frontend (**Página / Componente → Hook → Utils → Service → `global.fetch`**), sem mockar camadas internas da aplicação:
      - `atendimento.integration.test.jsx` (Landing Page + Solicitação de Atendimento)
      - `login.integration.test.jsx` (Fluxo de Login + Sessão + Redirecionamento)
      - `primeiro-acesso.integration.test.jsx` (Fluxo de Primeiro Acesso com e sem OAB)
      - `layout.integration.test.jsx` (Layout Privado, Sidebar, Navbar, UserMenu, Logout e Proxy)
      - `clientes.integration.test.jsx` (Fluxo completo de Clientes / CRM)
      - `equipe.integration.test.jsx` (Fluxo completo de Equipe, Cargos e Permissões)
      - `financas.integration.test.jsx` (Fluxo completo de Controle Financeiro e Categorias)
      - `processos.integration.test.jsx` (Fluxo completo de Processos Jurídicos e Filtros)
      - `site.integration.test.jsx` (Fluxo completo de Customização do Site Institucional e Prévia)
    - Cobertura atual isolada: **~98.0% de linhas**.

---

## Estrutura do Repositório

- `src/`: Contém todo o código-fonte e testes da aplicação.
  - `src/app/`: Rotas e layouts do App Router do Next.js.
    - `(pages)/(public)/`: Rotas públicas (`(landing-page)`, `login`, `primeiro-acesso`).
    - `(pages)/(private)/`: Rotas protegidas (`dashboard`, `clientes`, `equipe`, `financas`, `processos`, `site` e `layout.jsx`).
    - `layout.jsx` e `globals.css`: Layout raiz, fontes e estilos globais.
  - `src/components/`: Componentes reutilizáveis e específicos de domínio.
    - `features/`: Componentes de negócio organizados por módulo (`atendimento`, `clientes`, `equipe`, `financas`, `processos`).
    - `layout/`: Componentes estruturais (`auth`, `navbar`, `sidebar`, `LogoutConfirmModal`).
    - `ui/`: Componentes visuais genéricos e abas de configuração (`LoadingDots`, `Modal`, `StatCard`, `site/`).
  - `src/constants/`: Mapeamentos e constantes de permissões (`permissions.js`).
  - `src/contexts/`: Contexto global de autenticação (`AuthContext.jsx`).
  - `src/hooks/`: Hooks customizados de estado e regras de negócio (`useAuth`, `useClientes`, `useEquipe`, `useFinancas`, `useFirstLogin`, `useInstitucional`, `useLogin`, `useProcessos`, `useSolicitarAtendimento`).
  - `src/services/`: Clientes HTTP de comunicação com a API backend (`api`, `atuacoes`, `auth`, `cargos`, `clientes`, `financas`, `funcionarios`, `institucional`, `processos`, `solicitacoes`).
  - `src/utils/`: Formatadores, máscaras, normalizadores e validadores puros (`authSession`, `cliente`, `financas`, `funcionario`, `institucional`, `processo`).
  - `src/proxy.js`: Middleware de proteção de rotas privadas e redirecionamento de sessão.
- `public/`: Arquivos estáticos servidos diretamente (SVGs e imagens).
- `.github/`: Configurações de automação e templates do GitHub.
  - `workflows/prCheck.yml`: Executa a validação de Pull Requests (auditoria de dependências, lint, formatação e build).
  - `workflows/test.yml`: Executa em paralelo os jobs **Testes Parametrizados [Coverage > 90%]** e **Testes de Integração [Coverage > 90%]**.
  - `pull_request_template.md`: Template padrão para abertura de Pull Requests.
  - `ISSUE_TEMPLATE/fix.yml`: Template para relatar bugs de interface (frontend).
- `package.json`: Definição das dependências, scripts e metadados do projeto.
- `Dockerfile` e `compose.yml`: Containerização da aplicação para produção.
- `vitest.config.mts` e `vitest.setup.js`: Configuração do ambiente de testes (JSDOM) e limites de cobertura (v8).
- `eslint.config.mjs` e `.prettierrc`: Padronização de lint e formatação de código.
- `commitlint.config.cjs` + `.husky/`: Padronização de commits (Conventional Commits) e hooks de pré-commit.

---

## Fluxo de Contribuição (CI/CD)

A branch `main` deste repositório está **protegida**. Nenhuma alteração pode ser enviada diretamente para ela.

Para contribuir com o frontend:

1.  Crie uma nova branch a partir da `main` (ex: `feat/dashboard`).
2.  Faça as alterações necessárias nos arquivos dentro de `src/`.
3.  Abra um **Pull Request (PR)** — utilize o template padrão do repositório.
4.  Aguarde a execução automática dos _checks_ (`prCheck.yml` e `test.yml`):
    - **Auditoria de Dependências**: verificação de vulnerabilidades com `npm audit`.
    - **Lint e Formatação**: validação de código com Prettier e ESLint.
    - **Validação de Build**: geração da build de produção do Next.js.
    - **Testes Parametrizados [Coverage > 90%]**: execução de `npm run test:param:coverage`.
    - **Testes de Integração [Coverage > 90%]**: execução de `npm run test:integration:coverage`.
5.  Após a aprovação, realize o Merge. O GitHub Actions validará a branch e o fluxo de implantação seguirá automaticamente.
