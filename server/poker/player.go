package poker

// 玩家状态常量
const (
	PlayerStatusEmpty   = "empty"   // 空座位
	PlayerStatusSitting = "sitting" // 已落座
	PlayerStatusFolded  = "folded"  // 已弃牌
	PlayerStatusAllIn   = "allin"   // 全下
)

// 默认配置常量
const (
	DefaultChips = 1000
)

type Player struct {
	UserId     string    `json:"userId"`
	Name       string    `json:"name"`
	Status     string    `json:"status"`
	Chips      int       `json:"chips"`
	HoleCards  []Card    `json:"holeCards"`  // 底牌（只发给玩家自己）
	CurrentBet int       `json:"currentBet"` // 当前轮下注额
	TotalBet   int       `json:"totalBet"`   // 本局总下注额
	HasActed   bool      `json:"hasActed"`   // 本轮是否已行动
	HandRank   *HandRank `json:"handRank"`   // 牌型（摊牌时显示）
	WinAmount  int       `json:"winAmount"`  // 本局赢得的金额
}

// NewPlayer 创建一个新的空座位玩家
func NewPlayer() Player {
	return Player{
		UserId:     "",
		Name:       "",
		Status:     PlayerStatusEmpty,
		Chips:      0,
		HoleCards:  make([]Card, 0, 2),
		CurrentBet: 0,
		TotalBet:   0,
		HasActed:   false,
		HandRank:   nil,
		WinAmount:  0,
	}
}

// NewSittingPlayer 创建一个已落座的玩家
func NewSittingPlayer(userId, name string) Player {
	return Player{
		UserId:    userId,
		Name:      name,
		Status:    PlayerStatusSitting,
		Chips:     DefaultChips,
		HandRank:  nil,
		WinAmount: 0,
	}
}

// IsEmpty 检查座位是否为空
func (p *Player) IsEmpty() bool {
	return p.Status == PlayerStatusEmpty
}

// Reset 重置玩家为空座位状态
func (p *Player) Reset() {
	p.UserId = ""
	p.Name = ""
	p.Status = PlayerStatusEmpty
	p.Chips = 0
	p.HoleCards = make([]Card, 0, 2)
	p.CurrentBet = 0
	p.TotalBet = 0
	p.HasActed = false
	p.HandRank = nil
	p.WinAmount = 0
}

// SitDown 玩家落座
func (p *Player) SitDown(userId, name string) {
	p.UserId = userId
	p.Name = name
	p.Status = PlayerStatusSitting
	p.Chips = DefaultChips
	p.HoleCards = make([]Card, 0, 2)
	p.CurrentBet = 0
	p.TotalBet = 0
	p.HasActed = false
	p.HandRank = nil
	p.WinAmount = 0
}

// ResetForNewRound 为新一轮游戏重置玩家状态
func (p *Player) ResetForNewRound() {
	if p.Status == PlayerStatusSitting || p.Status == PlayerStatusFolded || p.Status == PlayerStatusAllIn {
		p.Status = PlayerStatusSitting
	}
	p.HoleCards = make([]Card, 0, 2)
	p.CurrentBet = 0
	p.TotalBet = 0
	p.HasActed = false
	p.HandRank = nil
	p.WinAmount = 0
}

// Bet 玩家下注
func (p *Player) Bet(amount int) bool {
	if amount > p.Chips {
		// 全下
		amount = p.Chips
		p.Status = PlayerStatusAllIn
	}

	p.Chips -= amount
	p.CurrentBet += amount
	p.TotalBet += amount
	p.HasActed = true

	return true
}

// PostBlind 玩家下盲注（不设置HasActed标志）
func (p *Player) PostBlind(amount int) bool {
	if amount > p.Chips {
		// 全下
		amount = p.Chips
		p.Status = PlayerStatusAllIn
	}

	p.Chips -= amount
	p.CurrentBet += amount
	p.TotalBet += amount
	// 注意：下盲注不设置HasActed = true

	return true
}

// Fold 玩家弃牌
func (p *Player) Fold() {
	p.Status = PlayerStatusFolded
	p.HasActed = true
}

// CanAct 检查玩家是否可以行动
func (p *Player) CanAct() bool {
	// 玩家必须是坐着状态，且没有弃牌或全下
	if p.Status != PlayerStatusSitting {
		return false
	}

	// 如果玩家已经主动行动过了，就不能再行动
	// 注意：下盲注不算主动行动
	return !p.HasActed
}
