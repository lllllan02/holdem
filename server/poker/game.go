package poker

// 游戏状态常量
const (
	GameStatusWaiting = "waiting" // 等待玩家
	GameStatusPlaying = "playing" // 游戏进行中
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
	MinPlayers        = 2 // 最少需要2个玩家才能开始游戏
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

// GetSittingPlayersCount 获取已落座的玩家数量
func (g *Game) GetSittingPlayersCount() int {
	count := 0
	for _, player := range g.Players {
		if !player.IsEmpty() {
			count++
		}
	}
	return count
}

// CanStartGame 检查是否可以开始游戏
func (g *Game) CanStartGame() bool {
	return g.GameStatus == GameStatusWaiting && g.GetSittingPlayersCount() >= MinPlayers
}

// StartGame 开始游戏
func (g *Game) StartGame() bool {
	if !g.CanStartGame() {
		return false
	}

	g.GameStatus = GameStatusPlaying
	// TODO: 这里后续可以添加发牌、设置盲注等逻辑
	return true
}

// EndGame 结束游戏
func (g *Game) EndGame() {
	g.GameStatus = GameStatusWaiting
	// TODO: 这里后续可以添加结算、重置等逻辑
}
