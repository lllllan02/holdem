package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/lllllan02/holdem/service"
)

func main() {
	r := gin.Default()

	// 配置可信任的代理，确保 ClientIP 获取的一致性
	r.SetTrustedProxies([]string{"127.0.0.1", "::1", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"})

	// 注册路由
	r.GET("/user", service.GetUserHandler)
	r.PUT("/user/name", service.UpdateUserNameHandler)
	r.PUT("/user/avatar", service.UpdateUserAvatarHandler)
	r.GET("/avatar/:userId", service.GetAvatarHandler)
	r.GET("/game/records", service.GetGameRecordsHandler)

	// WebSocket 连接
	r.GET("/ws", service.WebSocketHandler)

	log.Printf("Server started")
	r.Run(":8080")
}
