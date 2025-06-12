package service

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,                                       // 读缓冲区大小
	WriteBufferSize: 1024,                                       // 写缓冲区大小
	CheckOrigin:     func(r *http.Request) bool { return true }, // 仅用于测试，生产环境需要proper的源检查
}

// 全局 hub 实例
var globalHub = NewHub()

func init() {
	// 启动 hub
	go globalHub.Run()
}

// WebSocketHandler 处理 WebSocket 连接
func WebSocketHandler(c *gin.Context) {
	// 获取用户信息
	user := GetOrCreateUser(c.ClientIP(), c.GetHeader("User-Agent"))
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未能识别用户"})
		return
	}

	log.Printf("[WS] 收到连接请求 - %s\n", user)

	// 升级 HTTP 连接为 WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[WS] 升级连接失败 - %s, 错误: %v\n", user, err)
		return
	}

	// 创建新的客户端
	client := &Client{
		hub:  globalHub,
		user: user,
		send: make(chan []byte, 256),
		conn: conn,
	}

	// 注册客户端到 hub
	client.hub.register <- client

	// 启动读写协程
	go client.writePump()
	go client.readPump()

	log.Printf("[WS] 连接建立成功 - %s, 当前在线人数: %d\n", user, len(globalHub.clients))
}
