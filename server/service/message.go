package service

import "github.com/lllllan02/holdem/poker"

// WebSocket消息类型
type MessageType string

const (
	// 服务器发送给客户端的消息类型
	MSG_GAME_STATE    MessageType = "game_state"
	MSG_PLAYER_ACTION MessageType = "player_action"
	MSG_GAME_UPDATE   MessageType = "game_update"
	MSG_ERROR         MessageType = "error"

	// 客户端发送给服务器的消息类型
	MSG_SIT_DOWN   MessageType = "sit_down"
	MSG_LEAVE_SEAT MessageType = "leave_seat"
	MSG_START_GAME MessageType = "start_game"
	MSG_FOLD       MessageType = "fold"
	MSG_CALL       MessageType = "call"
	MSG_RAISE      MessageType = "raise"
	MSG_CHECK      MessageType = "check"
)

// WebSocket消息结构
type WSMessage struct {
	Type MessageType `json:"type"`
	Data interface{} `json:"data"`
}

// 游戏状态消息数据
type GameStateData struct {
	Game *poker.Game `json:"game"`
}

// 玩家行动消息数据
type PlayerActionData struct {
	Action string `json:"action"`
	Amount int    `json:"amount"`
}

// 错误消息数据
type ErrorData struct {
	Message string `json:"message"`
}
