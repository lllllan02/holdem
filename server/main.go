package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/lllllan02/holdem/service"
)

func main() {
	r := gin.Default()

	// 配置可信任的代理，确保 ClientIP 获取的一致性
	r.SetTrustedProxies([]string{"127.0.0.1", "::1", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"})

	// 获取当前工作目录（server目录）
	currentDir, err := os.Getwd()
	if err != nil {
		log.Fatalf("Failed to get current directory: %v", err)
	}

	// 获取项目根目录（当前目录的父目录）
	rootDir := filepath.Dir(currentDir)
	log.Printf("Project root directory: %s", rootDir)

	// 确保上传目录存在
	uploadDir := filepath.Join(rootDir, "uploads", "avatars")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Fatalf("Failed to create upload directory: %v", err)
	}
	log.Printf("Upload directory created: %s", uploadDir)

	// 注册路由
	r.GET("/user", service.GetUserHandler)
	r.PUT("/user/name", service.UpdateUserNameHandler)
	r.PUT("/user/avatar", service.UpdateUserAvatarHandler)
	r.GET("/avatar/:userId", service.GetAvatarHandler)

	// WebSocket 连接
	r.GET("/ws", service.WebSocketHandler)

	log.Printf("Server started")
	r.Run(":8080")
}
