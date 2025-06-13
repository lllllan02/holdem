package service

import (
	"log"

	"github.com/lllllan02/holdem/poker"
)

// Hub 维护活跃的客户端集合并广播消息
type Hub struct {
	// 所有活跃的客户端，key 是用户 ID
	clients map[string]*Client

	// 广播消息的通道
	broadcast chan []byte

	// 注册请求通道
	register chan *Client

	// 注销请求通道
	unregister chan *Client

	// 游戏实例
	game *poker.Game
}

// NewHub 创建一个新的 Hub
func NewHub() *Hub {
	hub := &Hub{
		clients:    make(map[string]*Client),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		game:       poker.NewGame(),
	}
	log.Printf("[Hub] 创建新的 Hub 实例\n")
	return hub
}

// broadcastGameState 广播游戏状态给所有客户端
func (h *Hub) broadcastGameState() {
	log.Printf("[Hub] 广播游戏状态更新, 目标客户端数: %d\n", len(h.clients))

	// 为每个客户端单独发送定制的游戏状态
	for _, client := range h.clients {
		client.sendGameState()
	}
}

// Run 启动 hub 的消息处理循环
func (h *Hub) Run() {
	log.Printf("[Hub] Hub 开始运行\n")
	for {
		select {
		case client := <-h.register:
			// 如果已存在相同用户的连接，安全关闭旧连接
			if oldClient, exists := h.clients[client.user.ID]; exists {
				h.safeCloseClient(oldClient)
				log.Printf("[Hub] 关闭用户旧连接 - %s\n", client.user)
			}
			h.clients[client.user.ID] = client
			log.Printf("[Hub] 新客户端注册 - %s, 当前在线: %d\n",
				client.user, len(h.clients))

		case client := <-h.unregister:
			if _, ok := h.clients[client.user.ID]; ok {
				delete(h.clients, client.user.ID)
				h.safeCloseClient(client)
				log.Printf("[Hub] 客户端注销 - %s, 当前在线: %d\n",
					client.user, len(h.clients))
			}

		case message := <-h.broadcast:
			log.Printf("[Hub] 广播消息 - 长度: %d bytes, 目标客户端数: %d\n",
				len(message), len(h.clients))

			for userID, client := range h.clients {
				select {
				case client.send <- message:
					// 消息发送成功
				default:
					// 客户端通道已满或已关闭，移除客户端
					delete(h.clients, userID)
					h.safeCloseClient(client)
					log.Printf("[Hub] 移除无响应客户端 - %s\n", client.user)
				}
			}
		}
	}
}

// safeCloseClient 安全地关闭客户端连接
func (h *Hub) safeCloseClient(client *Client) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[Hub] 关闭客户端时发生panic - %s, 错误: %v\n", client.user, r)
		}
	}()

	// 尝试关闭通道，如果已经关闭会panic，我们捕获它
	func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[Hub] 客户端通道已经关闭 - %s\n", client.user)
			}
		}()
		close(client.send)
		log.Printf("[Hub] 安全关闭客户端通道 - %s\n", client.user)
	}()
}
