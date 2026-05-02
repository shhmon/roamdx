PORT ?= 3001
TOKEN ?= changeme

.PHONY: dev start stop restart logs status install typecheck build clean

# Development
dev:
	@chmod +x node_modules/.pnpm/node-pty@1.1.0/node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper 2>/dev/null || true
	PORT=$(PORT) ROAMDX_TOKEN=$(TOKEN) npx tsx apps/server/src/index.ts

# Background
start:
	@chmod +x node_modules/.pnpm/node-pty@1.1.0/node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper 2>/dev/null || true
	@lsof -ti:$(PORT) | xargs kill 2>/dev/null || true
	@sleep 1
	PORT=$(PORT) ROAMDX_TOKEN=$(TOKEN) npx tsx apps/server/src/index.ts > /tmp/roamdx.log 2>&1 & echo $$! > /tmp/roamdx.pid
	@sleep 2
	@curl -sf http://localhost:$(PORT)/api/status && echo "\nroamdx running on http://localhost:$(PORT)" || echo "failed to start"

stop:
	@lsof -ti:$(PORT) | xargs kill 2>/dev/null && echo "stopped" || echo "not running"
	@rm -f /tmp/roamdx.pid

restart: stop start

logs:
	@tail -f /tmp/roamdx.log

status:
	@curl -sf http://localhost:$(PORT)/api/status && echo "" || echo "not running"

# Setup
install:
	pnpm install
	@chmod +x node_modules/.pnpm/node-pty@1.1.0/node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper 2>/dev/null || true

typecheck:
	cd apps/server && npx tsc --noEmit

build:
	cd apps/server && npx tsup

clean:
	rm -rf node_modules apps/server/node_modules packages/shared/node_modules pnpm-lock.yaml dist
