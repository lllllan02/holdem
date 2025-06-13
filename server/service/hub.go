package service

import (
	"log"
	"time"

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

	// 倒计时相关
	countdownTicker *time.Ticker
	countdownDone   chan bool

	// 摊牌定时器相关
	showdownTicker *time.Ticker
	showdownDone   chan bool
}

// NewHub 创建一个新的 Hub
func NewHub() *Hub {
	hub := &Hub{
		clients:       make(map[string]*Client),
		broadcast:     make(chan []byte),
		register:      make(chan *Client),
		unregister:    make(chan *Client),
		game:          poker.NewGame(),
		countdownDone: make(chan bool, 1),
		showdownDone:  make(chan bool, 1),
	}
	log.Printf("[Hub] 创建新的 Hub 实例\n")
	return hub
}

// broadcastGameState 广播游戏状态给所有客户端
func (h *Hub) broadcastGameState() {
	log.Printf("[Hub] 广播游戏状态更新, 目标客户端数: %d\n", len(h.clients))

	// 检查是否需要启动摊牌定时器
	if h.game.GamePhase == "showdown_reveal" && h.showdownTicker == nil {
		log.Printf("[Hub] 检测到摊牌阶段，启动摊牌定时器")
		h.startShowdownTimer()
	}

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

// startCountdown 开始倒计时
func (h *Hub) startCountdown() {
	// 先停止之前的倒计时
	if h.countdownTicker != nil {
		h.countdownTicker.Stop()
		h.countdownTicker = nil
		log.Printf("[Hub] 停止之前的倒计时")
	}

	log.Printf("[Hub] 开始倒计时，初始值: 3")
	h.game.CountdownTimer = 3
	h.broadcastGameState()

	// 创建新的 done 通道
	h.countdownDone = make(chan bool, 1)

	// 使用 ticker 而不是 timer 来确保每秒都触发
	h.countdownTicker = time.NewTicker(time.Second)

	go func() {
		ticker := h.countdownTicker
		done := h.countdownDone

		defer func() {
			if ticker != nil {
				ticker.Stop()
			}
			log.Printf("[Hub] 倒计时协程结束")
		}()

		for {
			select {
			case <-ticker.C:
				h.game.CountdownTimer--
				log.Printf("[Hub] 倒计时更新: %d", h.game.CountdownTimer)
				h.broadcastGameState()

				if h.game.CountdownTimer <= 0 {
					// 倒计时结束，开始游戏
					log.Printf("[Hub] 倒计时结束，开始游戏")
					h.game.CountdownTimer = -1 // 设置为-1表示倒计时已结束
					if h.game.StartGame() {
						log.Printf("[Hub] 游戏自动开始成功")
					}
					h.broadcastGameState()
					return
				}
			case <-done:
				log.Printf("[Hub] 倒计时被取消")
				return
			}
		}
	}()
}

// cancelCountdown 取消倒计时
func (h *Hub) cancelCountdown() {
	if h.countdownTicker != nil {
		h.countdownTicker.Stop()
		h.countdownTicker = nil
		log.Printf("[Hub] 停止倒计时 ticker")
	}

	// 发送取消信号（非阻塞）
	if h.countdownDone != nil {
		select {
		case h.countdownDone <- true:
			log.Printf("[Hub] 发送倒计时取消信号")
		default:
			log.Printf("[Hub] 倒计时取消信号通道已满或已关闭")
		}
	}

	if h.game.CountdownTimer > 0 {
		h.game.CountdownTimer = -1 // 设置为-1表示倒计时已取消
		log.Printf("[Hub] 倒计时已重置为-1")
	}
}

// startShowdownTimer 开始摊牌定时器
func (h *Hub) startShowdownTimer() {
	// 先停止之前的摊牌定时器
	if h.showdownTicker != nil {
		h.showdownTicker.Stop()
		h.showdownTicker = nil
		log.Printf("[Hub] 停止之前的摊牌定时器")
	}

	log.Printf("[Hub] 开始摊牌定时器，每1秒推进一次")

	// 创建新的 done 通道
	h.showdownDone = make(chan bool, 1)

	// 使用 ticker 来定时推进摊牌
	h.showdownTicker = time.NewTicker(1 * time.Second) // 每1秒推进一次

	go func() {
		ticker := h.showdownTicker
		done := h.showdownDone

		defer func() {
			if ticker != nil {
				ticker.Stop()
			}
			log.Printf("[Hub] 摊牌定时器协程结束")
		}()

		for {
			select {
			case <-ticker.C:
				// 检查是否还在摊牌阶段
				if h.game.GamePhase == "showdown_reveal" {
					log.Printf("[Hub] 定时器触发，推进下一个摊牌")
					h.game.AdvanceShowdown()
					h.broadcastGameState()

					// 检查是否摊牌已完成（游戏阶段已改变）
					if h.game.GamePhase != "showdown_reveal" {
						log.Printf("[Hub] 摊牌阶段结束，停止定时器")
						h.cancelShowdownTimer()
						return
					}
				} else {
					// 摊牌结束，停止定时器
					log.Printf("[Hub] 摊牌阶段结束，停止定时器")
					h.cancelShowdownTimer()
					return
				}
			case <-done:
				log.Printf("[Hub] 摊牌定时器被取消")
				return
			}
		}
	}()
}

// cancelShowdownTimer 取消摊牌定时器
func (h *Hub) cancelShowdownTimer() {
	if h.showdownTicker != nil {
		h.showdownTicker.Stop()
		h.showdownTicker = nil
		log.Printf("[Hub] 停止摊牌定时器 ticker")
	}

	// 发送取消信号（非阻塞）
	if h.showdownDone != nil {
		select {
		case h.showdownDone <- true:
			log.Printf("[Hub] 发送摊牌定时器取消信号")
		default:
			log.Printf("[Hub] 摊牌定时器取消信号通道已满或已关闭")
		}
	}
}
