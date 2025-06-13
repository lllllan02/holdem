package service

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/gorilla/websocket"
	"github.com/lllllan02/holdem/poker"
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
	// 创建游戏状态的副本，用于隐藏其他玩家的手牌
	gameStateCopy := *c.hub.game
	playersCopy := make([]poker.Player, len(c.hub.game.Players))

	// 复制玩家数据，隐藏其他玩家的手牌
	for i, player := range c.hub.game.Players {
		playersCopy[i] = player

		// 如果不是当前用户，隐藏手牌
		if player.UserId != c.user.ID {
			playersCopy[i].HoleCards = make([]poker.Card, len(player.HoleCards))
			// 保留手牌数量但不显示内容
			for j := range player.HoleCards {
				playersCopy[i].HoleCards[j] = poker.Card{} // 空牌
			}
		}
	}

	gameStateCopy.Players = playersCopy

	gameStateMsg := WSMessage{
		Type: MSG_GAME_STATE,
		Data: GameStateData{
			Game: &gameStateCopy,
		},
	}

	messageBytes, err := json.Marshal(gameStateMsg)
	if err != nil {
		log.Printf("[WS] 序列化游戏状态失败 - %s, 错误: %v\n", c.user, err)
		return
	}

	// 使用defer和recover来捕获panic
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[WS] 发送游戏状态时发生panic - %s, 错误: %v\n", c.user, r)
		}
	}()

	select {
	case c.send <- messageBytes:
		log.Printf("[WS] 游戏状态已发送 - %s\n", c.user)
	default:
		log.Printf("[WS] 发送游戏状态失败，通道已满或已关闭 - %s\n", c.user)
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
	case MSG_START_GAME:
		c.handleStartGame()
	case MSG_FOLD:
		c.handlePlayerAction("fold", message.Data)
	case MSG_CALL:
		c.handlePlayerAction("call", message.Data)
	case MSG_RAISE:
		c.handlePlayerAction("raise", message.Data)
	case MSG_CHECK:
		c.handlePlayerAction("check", message.Data)
	default:
		log.Printf("[WS] 未知消息类型 - %s, 类型: %s\n", c.user, message.Type)
	}
}

// handleSitDown 处理落座请求
func (c *Client) handleSitDown(data interface{}) {
	// 检查游戏状态，游戏进行中不允许新玩家落座
	if c.hub.game.GameStatus == "playing" {
		log.Printf("[WS] 游戏进行中不允许落座 - %s\n", c.user)

		// 发送错误消息给客户端
		errorMsg := WSMessage{
			Type: MSG_ERROR,
			Data: ErrorData{
				Message: "游戏进行中不能落座",
			},
		}

		messageBytes, err := json.Marshal(errorMsg)
		if err != nil {
			log.Printf("[WS] 序列化错误消息失败 - %s, 错误: %v\n", c.user, err)
			return
		}

		select {
		case c.send <- messageBytes:
			log.Printf("[WS] 错误消息已发送 - %s\n", c.user)
		default:
			log.Printf("[WS] 发送错误消息失败，通道已满 - %s\n", c.user)
		}
		return
	}

	// 解析座位ID
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
	// 检查游戏状态，游戏进行中不允许离座
	if c.hub.game.GameStatus == "playing" {
		log.Printf("[WS] 游戏进行中不允许离座 - %s\n", c.user)

		// 发送错误消息给客户端
		errorMsg := WSMessage{
			Type: MSG_ERROR,
			Data: ErrorData{
				Message: "游戏进行中不能离座",
			},
		}

		messageBytes, err := json.Marshal(errorMsg)
		if err != nil {
			log.Printf("[WS] 序列化错误消息失败 - %s, 错误: %v\n", c.user, err)
			return
		}

		select {
		case c.send <- messageBytes:
			log.Printf("[WS] 错误消息已发送 - %s\n", c.user)
		default:
			log.Printf("[WS] 发送错误消息失败，通道已满 - %s\n", c.user)
		}
		return
	}

	// 解析座位ID
	dataMap, ok := data.(map[string]interface{})
	if !ok {
		log.Printf("[WS] 离开座位数据格式错误 - %s\n", c.user)
		return
	}

	seatIdFloat, ok := dataMap["seatId"].(float64)
	if !ok {
		log.Printf("[WS] 座位ID格式错误 - %s\n", c.user)
		return
	}

	seatId := int(seatIdFloat)
	log.Printf("[WS] 处理离开座位请求 - %s, 座位: %d\n", c.user, seatId)

	// 检查座位索引是否有效
	if seatId < 1 || seatId > len(c.hub.game.Players) {
		log.Printf("[WS] 无效的座位ID - %s, 座位: %d\n", c.user, seatId)
		return
	}

	// 转换为数组索引（座位1对应索引0）
	seatIndex := seatId - 1
	player := &c.hub.game.Players[seatIndex]

	// 检查该座位是否是当前用户占用的
	if player.IsEmpty() || player.UserId != c.user.ID {
		log.Printf("[WS] 座位不是当前用户占用 - %s, 座位: %d, 座位用户: %s\n", c.user, seatId, player.UserId)
		return
	}

	// 重置座位
	player.Reset()
	log.Printf("[WS] 玩家离开座位成功 - %s, 座位: %d\n", c.user, seatId)

	// 广播游戏状态更新
	c.hub.broadcastGameState()
}

// handleStartGame 处理开始游戏请求
func (c *Client) handleStartGame() {
	// 检查游戏是否可以开始
	if !c.hub.game.CanStartGame() {
		log.Printf("[WS] 游戏无法开始 - %s, 当前状态: %s, 玩家数: %d\n",
			c.user, c.hub.game.GameStatus, c.hub.game.GetSittingPlayersCount())

		// 发送错误消息给客户端
		errorMsg := WSMessage{
			Type: MSG_ERROR,
			Data: ErrorData{
				Message: "游戏无法开始，需要至少2个玩家",
			},
		}

		messageBytes, err := json.Marshal(errorMsg)
		if err != nil {
			log.Printf("[WS] 序列化错误消息失败 - %s, 错误: %v\n", c.user, err)
			return
		}

		select {
		case c.send <- messageBytes:
			log.Printf("[WS] 错误消息已发送 - %s\n", c.user)
		default:
			log.Printf("[WS] 发送错误消息失败，通道已满 - %s\n", c.user)
		}
		return
	}

	// 开始游戏
	if c.hub.game.StartGame() {
		log.Printf("[WS] 游戏开始成功 - %s, 玩家数: %d\n",
			c.user, c.hub.game.GetSittingPlayersCount())

		// 广播游戏状态更新
		c.hub.broadcastGameState()
	} else {
		log.Printf("[WS] 游戏开始失败 - %s\n", c.user)
	}
}

// handlePlayerAction 处理玩家行动消息
func (c *Client) handlePlayerAction(action string, data interface{}) {
	log.Printf("[WS] 处理玩家行动 - %s, 行动: %s\n", c.user, action)

	// 解析行动数据
	amount := 0
	if data != nil {
		if dataMap, ok := data.(map[string]interface{}); ok {
			if amountFloat, ok := dataMap["amount"].(float64); ok {
				amount = int(amountFloat)
			}
		}
	}

	// 检查游戏状态
	if c.hub.game.GameStatus != "playing" {
		c.sendError("游戏未开始")
		return
	}

	// 找到玩家位置
	playerPos := -1
	for i, player := range c.hub.game.Players {
		if player.UserId == c.user.ID && !player.IsEmpty() {
			playerPos = i
			break
		}
	}

	if playerPos == -1 {
		c.sendError("您未在游戏中")
		return
	}

	// 检查是否轮到该玩家行动
	if c.hub.game.CurrentPlayer != playerPos {
		c.sendError("还没轮到您行动")
		return
	}

	player := &c.hub.game.Players[playerPos]

	// 检查玩家是否可以行动
	if !player.CanAct() {
		c.sendError("您当前无法行动")
		return
	}

	// 验证具体行动
	var errorMsg string
	switch action {
	case "call":
		callAmount := c.hub.game.CurrentBet - player.CurrentBet
		if callAmount > player.Chips {
			errorMsg = "筹码不足以跟注"
		}
	case "check":
		if c.hub.game.CurrentBet != player.CurrentBet {
			errorMsg = "有人下注，无法过牌"
		}
	case "raise":
		minRaise := c.hub.game.CurrentBet + c.hub.game.BigBlind
		if amount < minRaise {
			errorMsg = fmt.Sprintf("加注金额至少需要 %d", minRaise)
		} else {
			raiseAmount := amount - player.CurrentBet
			if raiseAmount > player.Chips {
				errorMsg = "筹码不足以加注"
			}
		}
	}

	if errorMsg != "" {
		c.sendError(errorMsg)
		return
	}

	// 调用游戏逻辑处理玩家行动
	success := c.hub.game.PlayerAction(c.user.ID, action, amount)

	if !success {
		log.Printf("[WS] 玩家行动失败 - %s, 行动: %s\n", c.user, action)
		c.sendError("行动失败，请重试")
		return
	}

	log.Printf("[WS] 玩家行动成功 - %s, 行动: %s, 金额: %d\n", c.user, action, amount)

	// 广播游戏状态更新
	c.hub.broadcastGameState()
}

// sendError 发送错误消息的辅助方法
func (c *Client) sendError(message string) {
	errorMsg := WSMessage{
		Type: MSG_ERROR,
		Data: ErrorData{
			Message: message,
		},
	}

	messageBytes, err := json.Marshal(errorMsg)
	if err != nil {
		log.Printf("[WS] 序列化错误消息失败 - %s, 错误: %v\n", c.user, err)
		return
	}

	select {
	case c.send <- messageBytes:
		log.Printf("[WS] 错误消息已发送 - %s: %s\n", c.user, message)
	default:
		log.Printf("[WS] 发送错误消息失败，通道已满 - %s\n", c.user)
	}
}
