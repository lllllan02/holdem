package main

import (
	"github.com/gin-gonic/gin"
	"github.com/lllllan02/holdem/service"
)

func main() {
	r := gin.Default()

	// 注册路由
	r.GET("/user", service.GetUserHandler)
	r.PUT("/user/name", service.UpdateUserNameHandler)

	// WebSocket 连接
	r.GET("/ws", service.WebSocketHandler)

	r.Run(":8080")
}
