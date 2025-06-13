package service

import (
	"encoding/json"
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

// sendGameState 发送当前游戏状态给客户端
func (c *Client) sendGameState() {
	gameStateMsg := WSMessage{
		Type: MSG_GAME_STATE,
		Data: GameStateData{
			Game: c.hub.game,
		},
	}

	messageBytes, err := json.Marshal(gameStateMsg)
	if err != nil {
		log.Printf("[WS] 序列化游戏状态失败 - %s, 错误: %v\n", c.user, err)
		return
	}

	select {
	case c.send <- messageBytes:
		log.Printf("[WS] 游戏状态已发送 - %s\n", c.user)
	default:
		log.Printf("[WS] 发送游戏状态失败，通道已满 - %s\n", c.user)
	}
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
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WS] 读取消息错误 - %s, 错误: %v\n", c.user, err)
			}
			break
		}

		log.Printf("[WS] 收到消息 - %s, 长度: %d bytes\n", c.user, len(messageBytes))

		// 解析消息
		var message WSMessage
		if err := json.Unmarshal(messageBytes, &message); err != nil {
			log.Printf("[WS] 解析消息失败 - %s, 错误: %v\n", c.user, err)
			continue
		}

		// 处理消息
		c.handleClientMessage(message)
	}
}

// handleClientMessage 处理客户端发送的消息
func (c *Client) handleClientMessage(message WSMessage) {
	log.Printf("[WS] 处理消息 - %s, 类型: %s\n", c.user, message.Type)

	switch message.Type {
	case MSG_SIT_DOWN:
		c.handleSitDown(message.Data)
	case MSG_LEAVE_SEAT:
		c.handleLeaveSeat(message.Data)
	default:
		log.Printf("[WS] 未知消息类型 - %s, 类型: %s\n", c.user, message.Type)
	}
}

// handleSitDown 处理落座请求
func (c *Client) handleSitDown(data interface{}) {
	dataMap, ok := data.(map[string]interface{})
	if !ok {
		log.Printf("[WS] 落座数据格式错误 - %s\n", c.user)
		return
	}

	seatId, ok := dataMap["seatId"].(float64)
	if !ok {
		log.Printf("[WS] 座位ID格式错误 - %s\n", c.user)
		return
	}

	seatIndex := int(seatId) - 1 // 转换为数组索引
	if seatIndex < 0 || seatIndex >= len(c.hub.game.Players) {
		log.Printf("[WS] 座位ID超出范围 - %s, 座位: %d\n", c.user, int(seatId))
		return
	}

	// 检查座位是否已被占用
	currentPlayer := &c.hub.game.Players[seatIndex]
	if !currentPlayer.IsEmpty() {
		log.Printf("[WS] 座位已被占用 - %s, 座位: %d, 占用者: %s\n", c.user, int(seatId), currentPlayer.Name)
		return
	}

	// 检查用户是否已经坐在其他座位
	for i, player := range c.hub.game.Players {
		if player.UserId == c.user.ID && !player.IsEmpty() {
			log.Printf("[WS] 用户已在其他座位 - %s, 当前座位: %d\n", c.user, i+1)
			return
		}
	}

	// 落座 - 使用SitDown方法
	currentPlayer.SitDown(c.user.ID, c.user.Name)

	log.Printf("[WS] 用户落座成功 - %s, 座位: %d\n", c.user, int(seatId))

	// 广播游戏状态更新
	c.hub.broadcastGameState()
}

// handleLeaveSeat 处理离开座位请求
func (c *Client) handleLeaveSeat(data interface{}) {
	dataMap, ok := data.(map[string]interface{})
	if !ok {
		log.Printf("[WS] 离开座位数据格式错误 - %s\n", c.user)
		return
	}

	seatId, ok := dataMap["seatId"].(float64)
	if !ok {
		log.Printf("[WS] 座位ID格式错误 - %s\n", c.user)
		return
	}

	seatIndex := int(seatId) - 1 // 转换为数组索引
	if seatIndex < 0 || seatIndex >= len(c.hub.game.Players) {
		log.Printf("[WS] 座位ID超出范围 - %s, 座位: %d\n", c.user, int(seatId))
		return
	}

	// 检查是否是用户自己的座位
	currentPlayer := &c.hub.game.Players[seatIndex]
	if currentPlayer.UserId != c.user.ID {
		log.Printf("[WS] 不能离开他人座位 - %s, 座位: %d, 占用者: %s\n", c.user, int(seatId), currentPlayer.Name)
		return
	}

	// 重置座位为空状态 - 使用Reset方法
	currentPlayer.Reset()

	log.Printf("[WS] 用户离开座位成功 - %s, 座位: %d\n", c.user, int(seatId))

	// 广播游戏状态更新
	c.hub.broadcastGameState()
}
