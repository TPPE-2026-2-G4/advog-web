# Frontend | Sistema de Gestão Jurídica

Bem-vindo ao repositório de frontend da equipe 4 (TPPE-2026-2)!

Este repositório contém a aplicação **Site Institucional + Sistema de Gestão Jurídica**, responsável pela interface com o usuário da plataforma.

O frontend é construído com [Next.js](https://nextjs.org/) (App Router), [React](https://react.dev/), JavaScript e [Tailwind CSS](https://tailwindcss.com/), seguindo práticas modernas de desenvolvimento web.

## Como acessar o site

A aplicação publicada (versão mais recente da branch `main`) está disponível no [Vercel](https://advog-web.vercel.app/).

---

## Como rodar o projeto localmente

Se você é desenvolvedor da equipe e precisa desenvolver novas funcionalidades ou corrigir bugs, siga os passos abaixo para preparar o seu ambiente local de desenvolvimento.

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 24 ou superior — a versão usada na esteira de CI/CD).
- npm (já incluso na instalação do Node.js).

### Instalação e Execução

1.  **Clone este repositório:**

    ```bash
    git clone https://github.com/TPPE-2026-2-G4/advog-web.git
    cd advog-web
    ```

2.  **Instale as dependências:**

    ```bash
    npm install
    ```

3.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```
    _O site estará disponível em `http://localhost:3000/`. Qualquer alteração nos arquivos de `src/` será refletida no navegador instantaneamente (Hot Reload)._

### Scripts disponíveis

- `npm run dev` — Inicia o servidor de desenvolvimento.
- `npm run build` — Gera a build de produção do Next.js.
- `npm run start` — Inicia a aplicação em modo de produção (após o build).
- `npm run lint` — Executa o ESLint e corrige automaticamente os problemas.
- `npm run format` — Formata o código com o Prettier.
- `npm run commit` — Abre o Commitizen para padronizar as mensagens de commit.

---

## Estrutura do Repositório

- `src/`: Contém todo o código-fonte da aplicação.
  - `src/app/`: Diretório raiz do App Router do Next.js (rotas e layout).
    - `layout.js`: Layout raiz da aplicação (fontes, metadados e estrutura HTML).
    - `page.js`: Página inicial (`/`) da aplicação.
    - `globals.css`: Estilos globais e configuração do Tailwind CSS.
    - `favicon.ico`: Ícone da aplicação.
- `public/`: Arquivos estáticos servidos diretamente (SVGs e imagens).
- `.github/`: Configurações de automação e templates do GitHub.
  - `workflows/prCheck.yml`: Executa a validação de Pull Requests (auditoria de dependências, lint, formatação e build).
  - `pull_request_template.md`: Template padrão para abertura de Pull Requests.
  - `ISSUE_TEMPLATE/fix.yml`: Template para relatar bugs de interface (frontend).
- `package.json`: Definição das dependências, scripts e metadados do projeto.
- `next.config.mjs`: Configuração do Next.js (inclui o React Compiler).
- `eslint.config.mjs`: Configuração do ESLint (integração com Next.js e Prettier).
- `.prettierrc`: Regras de formatação de código (Prettier).
- `commitlint.config.cjs` + `.husky/`: Padronização de mensagens de commit e hooks de pré-commit.
- `postcss.config.mjs`: Configuração do PostCSS (Tailwind CSS).
- `jsconfig.json`: Configuração de paths e aliases (`@/*` → `./src/*`).
- `LICENSE`: Licença do projeto (MIT).

---

## Fluxo de Contribuição (CI/CD)

A branch `main` deste repositório está **protegida**. Nenhuma alteração pode ser enviada diretamente para ela.

Para contribuir com o frontend:

1.  Crie uma nova branch a partir da `main` (ex: `feat/dashboard`).
2.  Faça as alterações necessárias nos arquivos dentro de `src/`.
3.  Abra um **Pull Request (PR)** — utilize o template padrão do repositório.
4.  Aguarde a execução automática dos _checks_ (`prCheck.yml`):
    - **Auditoria de Dependências**: verificação de vulnerabilidades com `npm audit`.
    - **Lint e Formatação**: validação de código com Prettier e ESLint.
    - **Validação de Build**: geração da build de produção do Next.js.
5.  Após a aprovação, realize o Merge. O GitHub Actions validará a branch e o fluxo de implantação seguirá automaticamente.
