package service

import "log"

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
}

// NewHub 创建一个新的 Hub
func NewHub() *Hub {
	hub := &Hub{
		clients:    make(map[string]*Client),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
	log.Printf("[Hub] 创建新的 Hub 实例\n")
	return hub
}

// Run 启动 hub 的消息处理循环
func (h *Hub) Run() {
	log.Printf("[Hub] Hub 开始运行\n")
	for {
		select {
		case client := <-h.register:
			// 如果已存在相同用户的连接，关闭旧连接
			if oldClient, exists := h.clients[client.user.ID]; exists {
				close(oldClient.send)
				log.Printf("[Hub] 关闭用户旧连接 - %s\n", client.user)
			}
			h.clients[client.user.ID] = client
			log.Printf("[Hub] 新客户端注册 - %s, 当前在线: %d\n",
				client.user, len(h.clients))

		case client := <-h.unregister:
			if _, ok := h.clients[client.user.ID]; ok {
				delete(h.clients, client.user.ID)
				close(client.send)
				log.Printf("[Hub] 客户端注销 - %s, 当前在线: %d\n",
					client.user, len(h.clients))
			}

		case message := <-h.broadcast:
			log.Printf("[Hub] 广播消息 - 长度: %d bytes, 目标客户端数: %d\n",
				len(message), len(h.clients))

			for _, client := range h.clients {
				select {
				case client.send <- message:
					// 消息发送成功
				default:
					close(client.send)
					delete(h.clients, client.user.ID)
					log.Printf("[Hub] 移除无响应客户端 - %s\n", client.user)
				}
			}
		}
	}
}
