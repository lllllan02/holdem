# 清理占用的端口
.PHONY: clean
clean:
	@echo "Cleaning port 8080..."
	@lsof -ti:8080 | xargs kill -9 2>/dev/null || echo "Port 8080 is not in use"

# 运行后端服务
.PHONY: server
server:
	cd server && go run main.go

.PHONY: mod
mod:
	cd server && go mod tidy

# 运行前端服务
.PHONY: client
client:
	cd client && npx vite --host 0.0.0.0 --port 5173

# 运行所有服务
.PHONY: dev
dev: clean-port
	@make server & make client &