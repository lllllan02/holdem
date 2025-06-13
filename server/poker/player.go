package poker

// 默认配置常量
const (
	DefaultChips = 1000
)

// 玩家状态常量
const (
	PlayerStatusEmpty   = "empty"   // 空座位
	PlayerStatusSitting = "sitting" // 已落座
	PlayerStatusPlaying = "playing" // 游戏中
	PlayerStatusFolded  = "folded"  // 已弃牌
	PlayerStatusAllIn   = "allin"   // 全下
)

type Player struct {
	UserId string `json:"userId"`
	Name   string `json:"name"`
	Status string `json:"status"` // 使用上面定义的常量
	Chips  int    `json:"chips"`
}

// NewPlayer 创建一个新的空座位玩家
func NewPlayer() Player {
	return Player{
		UserId: "",
		Name:   "",
		Status: PlayerStatusEmpty,
		Chips:  0,
	}
}

// NewSittingPlayer 创建一个已落座的玩家
func NewSittingPlayer(userId, name string) Player {
	return Player{
		UserId: userId,
		Name:   name,
		Status: PlayerStatusSitting,
		Chips:  DefaultChips,
	}
}

// IsEmpty 检查座位是否为空
func (p *Player) IsEmpty() bool {
	return p.Status == PlayerStatusEmpty || p.UserId == ""
}

// Reset 重置座位为空状态
func (p *Player) Reset() {
	p.UserId = ""
	p.Name = ""
	p.Status = PlayerStatusEmpty
	p.Chips = 0
}

// SitDown 玩家落座
func (p *Player) SitDown(userId, name string) {
	p.UserId = userId
	p.Name = name
	p.Status = PlayerStatusSitting
	p.Chips = DefaultChips
}
