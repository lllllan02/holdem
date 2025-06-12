package service

import (
	"log"
	"time"

	"github.com/gorilla/websocket"
)

// Client 代表一个 WebSocket 客户端连接
type Client struct {
	// 所属的 Hub
	hub *Hub

	// 关联的用户信息
	user *User

	// 发送消息的通道
	send chan []byte

	// WebSocket 连接
	conn *websocket.Conn

	// 连接建立时间
	connectedAt time.Time
}

// writePump 将消息从 channel 写入 WebSocket 连接
func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
		log.Printf("[WS] 写入协程结束 - %s\n", c.user)
	}()

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				// Hub 已关闭发送通道
				log.Printf("[WS] 发送通道关闭 - %s\n", c.user)
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			err := c.conn.WriteMessage(websocket.TextMessage, message)
			if err != nil {
				log.Printf("[WS] 写入消息失败 - %s, 错误: %v\n", c.user, err)
				return
			}
			log.Printf("[WS] 消息已发送 - %s, 长度: %d bytes\n", c.user, len(message))

		case <-ticker.C:
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("[WS] 发送 PING 失败 - %s, 错误: %v\n", c.user, err)
				return
			}
			log.Printf("[WS] PING 已发送 - %s\n", c.user)
		}
	}
}

// readPump 从 WebSocket 连接读取消息并发送到 hub
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
		log.Printf("[WS] 读取协程结束 - %s, 连接持续时间: %v\n",
			c.user, time.Since(c.connectedAt))
	}()

	c.connectedAt = time.Now()
	log.Printf("[WS] 开始读取消息 - %s\n", c.user)

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WS] 读取消息错误 - %s, 错误: %v\n", c.user, err)
			}
			break
		}

		log.Printf("[WS] 收到消息 - %s, 长度: %d bytes\n", c.user, len(message))
		c.hub.broadcast <- message
	}
}
