
# 运行后端服务
.PHONY: server
server:
	cd server && go run main.go &

# 运行前端服务
.PHONY: client
client:
	cd client && npm run dev &

# 运行所有服务
.PHONY: dev
dev: server client