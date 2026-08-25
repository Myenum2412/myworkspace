.PHONY: help install build dev test lint clean docker-up docker-down deploy backup restore migrate logs health monitor

SHELL := /bin/bash

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-24s\033[0m %s\n", $$1, $$2}'

# ── Development ──
install: ## Install all dependencies
	cd backend && npm ci
	cd frontend && npm ci

dev: ## Start development servers
	@echo "Starting development environment..."
	@./start.sh

build: ## Build frontend and backend
	cd backend && npm run build
	cd frontend && npm run build

test: ## Run all tests
	cd backend && npm run test:all

test-unit: ## Run unit tests only
	cd backend && npm run test:unit

test-integration: ## Run integration tests only
	cd backend && npm run test:integration

lint: ## Run linter and type check
	cd backend && npx tsc --noEmit
	cd frontend && npx tsc --noEmit

clean: ## Clean all build artifacts
	rm -rf backend/dist frontend/.next
	rm -rf node_modules backend/node_modules frontend/node_modules

validate-env: ## Validate environment variables
	@bash scripts/validate-env.sh

# ── Docker ──
docker-up: ## Start production Docker stack
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

docker-down: ## Stop production Docker stack
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down

docker-build: ## Build production Docker images
	docker compose -f docker-compose.yml -f docker-compose.prod.yml build

docker-logs: ## Tail Docker logs
	docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

docker-restart: ## Restart production Docker stack
	docker compose -f docker-compose.yml -f docker-compose.prod.yml restart

# ── Deployment ──
deploy: ## Deploy to production (zero-downtime)
	@bash scripts/zero-downtime-deploy.sh

rollback: ## Rollback to previous release
	@bash scripts/rollback.sh

verify: ## Verify deployment health
	@bash scripts/verify-deployment.sh

# ── Database ──
migrate: ## Run pending database migrations
	@bash scripts/migrate.sh

seed: ## Seed database
	cd backend && npm run db:seed

backup: ## Create database backup
	@bash scripts/backup-db.sh

restore: ## Restore database from backup
	@echo "Usage: make restore FILE=<backup-file>"
	@bash scripts/restore-db.sh $(FILE)

# ── Monitoring ──
health: ## Check application health
	@curl -s http://localhost:4000/api/health | python3 -m json.tool

metrics: ## Fetch Prometheus metrics
	@curl -s http://localhost:4000/api/metrics | head -50

logs-backend: ## Tail backend logs
	docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend

logs-frontend: ## Tail frontend logs
	docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f frontend

# ── Maintenance ──
rotate-logs: ## Rotate all application logs
	@bash scripts/rotate-logs.sh

prune: ## Docker system prune
	docker system prune -f

status: ## Show all service statuses
	@echo "=== Backend Health ==="
	@curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health || echo "unreachable"
	@echo ""
	@echo "=== Frontend Health ==="
	@curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "unreachable"
	@echo ""
	@echo "=== Docker Containers ==="
	@docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
	@echo ""
	@echo "=== Disk Usage ==="
	@df -h / | tail -1
