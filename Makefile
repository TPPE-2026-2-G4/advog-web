setup:
	@echo "\n\n ⚙️ Configurando o ambiente de desenvolvimento... \n"
	npm install
	cp -n .env.example .env
	docker compose up -d --build
	@echo "\n✅ Ambiente de desenvolvimento configurado com sucesso!"
	@echo "🔗 Portas disponíveis:"
	@echo " - Web: http://localhost:3000"

up:
	@echo "\n\n⚙️ Subindo containers do Docker... \n"
	docker compose up -d --build
	@echo "\n✅ Containers do Docker executados com sucesso! \n"
	@echo "🔗 Portas disponíveis:"
	@echo " - Web: http://localhost:3000"

down:
	@echo "\n\n⚙️ Derrubando containers do Docker... \n"
	docker compose down
	@echo "\n✅ Containers do Docker finalizados com sucesso! \n"

local:
	@echo "\n\n⚙️ Rodando aplicação localmente... \n"
	docker compose down
	npm run dev

test:
	@echo "\n\n⚙️ Rodando testes... \n"
	npm run test --coverage
	@echo "\n✅ Testes executados com sucesso! \n"

local-prod:
	@[ -f .env.producao ] || cp .env.example.production .env.producao
	@if grep -q "<servico>" .env.producao; then \
		echo "\n❌ Edite o .env.producao e informe a URL da API de produção em NEXT_PUBLIC_API_URL.\n"; \
		exit 1; \
	fi
	@echo "\n\n⚙️ Rodando aplicação localmente com a API de produção... \n"
	docker compose stop web
	npm run dev:prod
