package poker

// 游戏状态常量
const (
	GameStatusWaiting = "waiting" // 等待玩家
)

// 游戏轮次常量
const (
	RoundPreflop  = "preflop"  // 翻牌前
	RoundFlop     = "flop"     // 翻牌
	RoundTurn     = "turn"     // 转牌
	RoundRiver    = "river"    // 河牌
	RoundShowdown = "showdown" // 摊牌
)

// 默认配置常量
const (
	DefaultSmallBlind = 10
	DefaultBigBlind   = 20
	MaxSeats          = 7
)

type Game struct {
	Players    []Player `json:"players"`
	GameStatus string   `json:"gameStatus"` // 使用GameStatus常量
}

func NewGame() *Game {
	// 初始化7个座位，每个座位都有完整的Player结构
	players := make([]Player, MaxSeats)
	for i := 0; i < MaxSeats; i++ {
		players[i] = NewPlayer()
	}

	return &Game{
		Players:    players,
		GameStatus: GameStatusWaiting,
	}
}
