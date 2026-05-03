.PHONY: up down restart logs build dev stop stop-dev start

# Démarre tous les conteneurs (postgres + sidecar woob) + le serveur Next.
# Usage : `make start`
start: up dev

# Arrête tout : serveur Next dev + tous les conteneurs.
stop: stop-dev down

# Démarre uniquement les conteneurs (postgres + sidecar).
up:
	docker compose up -d --build

# Arrête tous les conteneurs.
down:
	docker compose down

restart: stop start

# Logs en live (Ctrl+C pour quitter).
logs:
	docker compose logs -f

# Rebuild sans cache (utile si woob/sidecar a changé).
build:
	docker compose build --no-cache sidecar

# Tue tout serveur Next dev qui traîne sur le port 3000, puis relance.
dev: stop-dev
	npm run dev

stop-dev:
	@lsof -ti :3000 | xargs -r kill -9 2>/dev/null || true
	@sleep 1
