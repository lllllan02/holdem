package poker

import (
	"log"
	"math/rand"
)

// 游戏状态常量
const (
	GameStatusWaiting = "waiting" // 等待玩家
	GameStatusPlaying = "playing" // 游戏进行中
)

// 游戏阶段常量
const (
	GamePhasePreFlop        = "preflop"         // 翻牌前
	GamePhaseFlop           = "flop"            // 翻牌
	GamePhaseTurn           = "turn"            // 转牌
	GamePhaseRiver          = "river"           // 河牌
	GamePhaseShowdown       = "showdown"        // 摊牌
	GamePhaseShowdownReveal = "showdown_reveal" // 逐步摊牌
)

// 默认配置常量
const (
	DefaultSmallBlind = 10
	DefaultBigBlind   = 20
	MaxSeats          = 7
	MinPlayers        = 2 // 最少需要2个玩家才能开始游戏
)

type Game struct {
	Players        []Player `json:"players"`
	GameStatus     string   `json:"gameStatus"`     // 使用GameStatus常量
	GamePhase      string   `json:"gamePhase"`      // 当前游戏阶段
	CommunityCards []Card   `json:"communityCards"` // 公共牌
	Pot            int      `json:"pot"`            // 底池
	CurrentBet     int      `json:"currentBet"`     // 当前下注额
	DealerPos      int      `json:"dealerPos"`      // 庄家位置
	SmallBlindPos  int      `json:"smallBlindPos"`  // 小盲注位置
	BigBlindPos    int      `json:"bigBlindPos"`    // 大盲注位置
	CurrentPlayer  int      `json:"currentPlayer"`  // 当前行动玩家
	SmallBlind     int      `json:"smallBlind"`     // 小盲注
	BigBlind       int      `json:"bigBlind"`       // 大盲注
	Deck           []Card   `json:"-"`              // 牌堆（不发送给客户端）
	CountdownTimer int      `json:"countdownTimer"` // 倒计时（秒）
	Spectators     int      `json:"spectators"`     // 观众数量

	// 摊牌相关字段
	ShowdownOrder   []int `json:"showdownOrder"`   // 摊牌顺序（玩家索引）
	CurrentShowdown int   `json:"currentShowdown"` // 当前摊牌的玩家索引
	ShowdownTimer   int   `json:"showdownTimer"`   // 摊牌倒计时

	// 对局记录
	CurrentRound *GameRound `json:"currentRound"` // 当前对局记录，用于结算展示
}

// Card 扑克牌结构
type Card struct {
	Suit  string `json:"suit"`  // 花色: hearts, diamonds, clubs, spades
	Rank  string `json:"rank"`  // 点数: 2-10, J, Q, K, A
	Value int    `json:"value"` // 数值: 2-14 (A=14)
}

func NewGame() *Game {
	// 初始化7个座位，每个座位都有完整的Player结构
	players := make([]Player, MaxSeats)
	for i := 0; i < MaxSeats; i++ {
		players[i] = NewPlayer()
	}

	return &Game{
		Players:         players,
		GameStatus:      GameStatusWaiting,
		GamePhase:       "",
		CommunityCards:  make([]Card, 0, 5),
		Pot:             0,
		CurrentBet:      0,
		DealerPos:       -1, // 初始化为-1，表示还未设置庄家
		SmallBlindPos:   -1, // 初始化为-1，表示还未设置小盲注位置
		BigBlindPos:     -1, // 初始化为-1，表示还未设置大盲注位置
		CurrentPlayer:   -1,
		SmallBlind:      DefaultSmallBlind,
		BigBlind:        DefaultBigBlind,
		Deck:            make([]Card, 0, 52),
		CountdownTimer:  0,
		ShowdownOrder:   make([]int, 0),
		CurrentShowdown: -1,
		ShowdownTimer:   0,
		CurrentRound:    nil,
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
	// 检查游戏状态
	if g.GameStatus != GameStatusWaiting && g.GamePhase != GamePhaseShowdown {
		log.Printf("[游戏] 无法开始游戏 - 游戏状态不是等待状态或摊牌阶段: %s", g.GameStatus)
		return false
	}

	// 检查玩家数量
	sittingPlayers := 0
	readyPlayers := 0
	for _, player := range g.Players {
		if !player.IsEmpty() && player.Chips > 0 {
			sittingPlayers++
			if player.IsReady {
				readyPlayers++
			}
		}
	}

	// 检查是否满足开始条件
	canStart := sittingPlayers >= MinPlayers && sittingPlayers == readyPlayers
	log.Printf("[游戏] 检查是否可以开始游戏 - 总玩家数=%d，已准备玩家数=%d，可以开始=%t",
		sittingPlayers, readyPlayers, canStart)
	return canStart
}

// StartGame 开始新一轮游戏
func (g *Game) StartGame() bool {
	if !g.CanStartGame() {
		return false
	}

	log.Printf("[游戏] 开始新一轮游戏")

	// 重置游戏状态
	g.GameStatus = GameStatusPlaying
	g.GamePhase = GamePhasePreFlop
	g.Pot = 0
	g.CurrentBet = 0
	g.CommunityCards = make([]Card, 0)
	g.ShowdownOrder = make([]int, 0)
	g.CurrentShowdown = -1
	g.ShowdownTimer = 0
	g.CurrentRound = nil // 清空当前对局记录

	// 重置所有玩家的游戏状态
	for i := range g.Players {
		if !g.Players[i].IsEmpty() {
			// 清空上一局的所有信息
			g.Players[i].HoleCards = make([]Card, 0)  // 清空手牌
			g.Players[i].CurrentBet = 0               // 清空当前下注
			g.Players[i].TotalBet = 0                 // 清空总下注
			g.Players[i].HandRank = nil               // 清空牌型
			g.Players[i].WinAmount = 0                // 清空赢得金额
			g.Players[i].HasActed = false             // 重置行动状态
			g.Players[i].Status = PlayerStatusSitting // 重置为坐下状态
			g.Players[i].IsReady = false              // 重置准备状态
		}
	}

	// 创建并洗牌
	g.createDeck()
	g.shuffleDeck()

	// 确定庄家位置
	g.setDealer()

	// 轮换大小盲注位置（如果不是第一局）
	if g.SmallBlindPos != -1 && g.BigBlindPos != -1 {
		// 找到下一个有效的小盲注位置（从当前小盲注位置开始）
		nextSmallBlindPos := g.getNextActivePlayer(g.SmallBlindPos)
		if nextSmallBlindPos != -1 {
			// 找到下一个有效的大盲注位置（从新的小盲注位置开始）
			nextBigBlindPos := g.getNextActivePlayer(nextSmallBlindPos)
			if nextBigBlindPos != -1 {
				g.SmallBlindPos = nextSmallBlindPos
				g.BigBlindPos = nextBigBlindPos
				log.Printf("[游戏] 轮换盲注位置 - 新小盲：座位%d (%s), 新大盲：座位%d (%s)",
					g.SmallBlindPos+1, g.Players[g.SmallBlindPos].Name,
					g.BigBlindPos+1, g.Players[g.BigBlindPos].Name)
			}
		}
	}

	// 发手牌
	g.dealHoleCards()

	// 收取盲注
	g.postBlinds()

	// 设置第一个行动玩家（从大盲注后面第一个玩家开始）
	g.setFirstActionPlayer()

	log.Printf("[游戏] 游戏初始化完成，等待玩家行动")
	return true
}

// EndGame 结束游戏
func (g *Game) EndGame() {
	g.GameStatus = GameStatusWaiting
	g.GamePhase = ""

	// 轮换大小盲注位置
	if g.SmallBlindPos != -1 && g.BigBlindPos != -1 {
		// 找到下一个有效的小盲注位置（从当前小盲注位置开始）
		nextSmallBlindPos := g.getNextActivePlayer(g.SmallBlindPos)
		if nextSmallBlindPos != -1 {
			// 找到下一个有效的大盲注位置（从新的小盲注位置开始）
			nextBigBlindPos := g.getNextActivePlayer(nextSmallBlindPos)
			if nextBigBlindPos != -1 {
				g.SmallBlindPos = nextSmallBlindPos
				g.BigBlindPos = nextBigBlindPos
				log.Printf("[游戏] 轮换盲注位置 - 新小盲：座位%d (%s), 新大盲：座位%d (%s)",
					g.SmallBlindPos+1, g.Players[g.SmallBlindPos].Name,
					g.BigBlindPos+1, g.Players[g.BigBlindPos].Name)
			}
		}
	}

	g.resetRound()
}

// resetRound 重置游戏轮次
func (g *Game) resetRound() {
	g.Pot = 0
	g.CurrentBet = 0
	g.CommunityCards = make([]Card, 0, 5)
	g.DealerPos = -1 // 重置为-1，下次开始游戏时重新设置
	g.CurrentPlayer = -1
	g.Deck = make([]Card, 0, 52)
	// 不重置 SmallBlindPos 和 BigBlindPos，这样它们可以在游戏之间保持
}

// createDeck 创建标准52张牌
func (g *Game) createDeck() {
	suits := []string{"hearts", "diamonds", "clubs", "spades"}
	ranks := []string{"2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"}
	values := []int{2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14}

	g.Deck = make([]Card, 0, 52)
	for _, suit := range suits {
		for i, rank := range ranks {
			g.Deck = append(g.Deck, Card{
				Suit:  suit,
				Rank:  rank,
				Value: values[i],
			})
		}
	}
}

// shuffleDeck 洗牌
func (g *Game) shuffleDeck() {
	for i := len(g.Deck) - 1; i > 0; i-- {
		j := rand.Intn(i + 1)
		g.Deck[i], g.Deck[j] = g.Deck[j], g.Deck[i]
	}
}

// dealCard 发一张牌
func (g *Game) dealCard() Card {
	if len(g.Deck) == 0 {
		return Card{} // 空牌，理论上不应该发生
	}
	card := g.Deck[0]
	g.Deck = g.Deck[1:]
	return card
}

// dealHoleCards 给每个玩家发底牌
func (g *Game) dealHoleCards() {
	// 每个玩家发2张底牌
	for round := 0; round < 2; round++ {
		for i := range g.Players {
			if !g.Players[i].IsEmpty() && g.Players[i].Status == PlayerStatusSitting {
				card := g.dealCard()
				g.Players[i].HoleCards = append(g.Players[i].HoleCards, card)
			}
		}
	}
}

// postBlinds 下盲注
func (g *Game) postBlinds() {
	playerCount := g.GetSittingPlayersCount()

	// 获取所有有人的座位
	occupiedSeats := make([]int, 0)
	for i, player := range g.Players {
		if !player.IsEmpty() && player.Status == PlayerStatusSitting {
			occupiedSeats = append(occupiedSeats, i)
		}
	}

	// 如果是第一局游戏（大小盲注位置都是-1）
	if g.SmallBlindPos == -1 || g.BigBlindPos == -1 {
		if len(occupiedSeats) >= 2 {
			g.SmallBlindPos = occupiedSeats[0] // 第一个有人的座位作为小盲
			g.BigBlindPos = occupiedSeats[1]   // 第二个有人的座位作为大盲
		} else if len(occupiedSeats) == 1 {
			// 只有一个玩家的情况（理论上不应该发生）
			g.SmallBlindPos = occupiedSeats[0]
			g.BigBlindPos = occupiedSeats[0]
		} else {
			return // 没有玩家
		}
	}

	log.Printf("[游戏] 玩家数量: %d", playerCount)
	log.Printf("[游戏] 庄家位置: 座位%d (%s)", g.DealerPos+1, g.Players[g.DealerPos].Name)
	log.Printf("[游戏] 小盲位置: 座位%d (%s)", g.SmallBlindPos+1, g.Players[g.SmallBlindPos].Name)
	log.Printf("[游戏] 大盲位置: 座位%d (%s)", g.BigBlindPos+1, g.Players[g.BigBlindPos].Name)

	// 小盲注
	if g.SmallBlindPos != -1 {
		g.Players[g.SmallBlindPos].PostBlind(g.SmallBlind)
		g.Pot += g.SmallBlind
		log.Printf("[游戏] %s 下小盲注 %d", g.Players[g.SmallBlindPos].Name, g.SmallBlind)
	}

	// 大盲注
	if g.BigBlindPos != -1 {
		g.Players[g.BigBlindPos].PostBlind(g.BigBlind)
		g.Pot += g.BigBlind
		g.CurrentBet = g.BigBlind
		log.Printf("[游戏] %s 下大盲注 %d", g.Players[g.BigBlindPos].Name, g.BigBlind)
	}
}

// setFirstActionPlayer 设置翻牌前第一个行动玩家
func (g *Game) setFirstActionPlayer() {
	playerCount := g.GetSittingPlayersCount()

	// 获取所有有人的座位
	occupiedSeats := make([]int, 0)
	for i, player := range g.Players {
		if !player.IsEmpty() && player.Status == PlayerStatusSitting {
			occupiedSeats = append(occupiedSeats, i)
		}
	}

	if len(occupiedSeats) < 2 {
		return // 玩家不足
	}

	if playerCount == 2 {
		// 2人游戏：小盲注玩家先行动
		g.CurrentPlayer = occupiedSeats[0] // 小盲位置
		log.Printf("[游戏] 翻牌前，2人游戏，小盲注玩家先行动：座位%d (%s)", g.CurrentPlayer+1, g.Players[g.CurrentPlayer].Name)
	} else {
		// 3人以上：大盲注后的第一个玩家先行动
		bigBlindPos := occupiedSeats[1] // 大盲位置
		// 找到大盲后的下一个玩家
		nextPlayerIndex := -1
		for i, seat := range occupiedSeats {
			if seat == bigBlindPos && i+1 < len(occupiedSeats) {
				nextPlayerIndex = i + 1
				break
			}
		}
		// 如果大盲是最后一个玩家，则从第一个玩家开始
		if nextPlayerIndex == -1 {
			nextPlayerIndex = 0
		}

		g.CurrentPlayer = occupiedSeats[nextPlayerIndex]
		log.Printf("[游戏] 翻牌前，%d人游戏，大盲注后第一个玩家先行动：座位%d (%s)", playerCount, g.CurrentPlayer+1, g.Players[g.CurrentPlayer].Name)
	}
}

// setFirstActionPlayerPostFlop 设置翻牌后第一个行动玩家（从小盲注开始）
func (g *Game) setFirstActionPlayerPostFlop() {
	// 获取所有有人的座位
	occupiedSeats := make([]int, 0)
	for i, player := range g.Players {
		if !player.IsEmpty() && player.Status == PlayerStatusSitting {
			occupiedSeats = append(occupiedSeats, i)
		}
	}

	if len(occupiedSeats) < 2 {
		return // 玩家不足
	}

	// 翻牌后总是从小盲注玩家开始行动
	g.CurrentPlayer = occupiedSeats[0] // 小盲位置
	log.Printf("[游戏] 翻牌后，小盲注玩家先行动：座位%d (%s)", g.CurrentPlayer+1, g.Players[g.CurrentPlayer].Name)
}

// findFirstActivePlayer 找到第一个活跃玩家位置（优先从座位1开始）
func (g *Game) findFirstActivePlayer() int {
	// 优先从座位1开始（索引0），找到序号最小的有人座位
	for i := 0; i < len(g.Players); i++ {
		if !g.Players[i].IsEmpty() && g.Players[i].Status == PlayerStatusSitting {
			log.Printf("[游戏] 找到第一个活跃玩家：座位%d (%s)", i+1, g.Players[i].Name)
			return i
		}
	}
	return -1
}

// getNextActivePlayer 获取下一个活跃玩家位置
func (g *Game) getNextActivePlayer(currentPos int) int {
	if currentPos == -1 {
		return -1
	}

	for i := 1; i < len(g.Players); i++ {
		nextPos := (currentPos + i) % len(g.Players)
		if !g.Players[nextPos].IsEmpty() && g.Players[nextPos].Status == PlayerStatusSitting {
			return nextPos
		}
	}

	return -1
}

// PlayerAction 处理玩家行动
func (g *Game) PlayerAction(userId string, action string, amount int) bool {
	log.Printf("[游戏] 开始处理玩家行动 - 玩家ID: %s, 行动: %s, 金额: %d", userId, action, amount)

	// 检查游戏状态
	if g.GameStatus != GameStatusPlaying {
		log.Printf("[游戏] 游戏状态错误: %s", g.GameStatus)
		return false
	}

	// 找到玩家位置
	playerPos := -1
	for i, player := range g.Players {
		if player.UserId == userId && !player.IsEmpty() {
			playerPos = i
			break
		}
	}

	if playerPos == -1 {
		log.Printf("[游戏] 未找到玩家: %s", userId)
		return false
	}

	// 检查是否轮到该玩家行动
	if g.CurrentPlayer != playerPos {
		log.Printf("[游戏] 不是该玩家的行动轮次 - 当前玩家: %d, 行动玩家: %d", g.CurrentPlayer+1, playerPos+1)
		return false
	}

	player := &g.Players[playerPos]

	// 检查玩家是否可以行动
	if !player.CanAct() {
		log.Printf("[游戏] 玩家无法行动 - 状态: %s, HasActed: %v", player.Status, player.HasActed)
		return false
	}

	// 处理不同的行动
	switch action {
	case "fold":
		log.Printf("[游戏] 玩家 %s (座位%d) 执行弃牌", player.Name, playerPos+1)
		player.Fold()
	case "call":
		callAmount := g.CurrentBet - player.CurrentBet
		if callAmount > 0 {
			if callAmount > player.Chips {
				log.Printf("[游戏] 玩家筹码不足以跟注 - 需要: %d, 拥有: %d", callAmount, player.Chips)
				return false
			}
			player.Bet(callAmount)
			g.Pot += callAmount
		}
	case "check":
		// 只有在没有下注时才能过牌
		if g.CurrentBet == player.CurrentBet {
			player.HasActed = true
		} else {
			log.Printf("[游戏] 无法过牌 - 当前注: %d, 玩家注: %d", g.CurrentBet, player.CurrentBet)
			return false
		}
	case "raise":
		// 加注必须至少比当前下注多一个大盲注
		minRaise := g.CurrentBet + g.BigBlind
		if amount < minRaise {
			log.Printf("[游戏] 加注金额不足 - 最小加注: %d, 实际加注: %d", minRaise, amount)
			return false
		}

		// 检查玩家是否有足够的筹码
		raiseAmount := amount - player.CurrentBet
		if raiseAmount > player.Chips {
			log.Printf("[游戏] 玩家筹码不足以加注 - 需要: %d, 拥有: %d", raiseAmount, player.Chips)
			return false
		}

		player.Bet(raiseAmount)
		g.Pot += raiseAmount
		g.CurrentBet = amount

		// 重置其他玩家的行动状态（除了已弃牌的）
		for i := range g.Players {
			if i != playerPos && !g.Players[i].IsEmpty() && g.Players[i].Status != PlayerStatusFolded {
				g.Players[i].HasActed = false
			}
		}
	default:
		log.Printf("[游戏] 无效的行动类型: %s", action)
		return false
	}

	// 标记玩家已经行动
	player.HasActed = true
	log.Printf("[游戏] 玩家行动成功，移动到下一个玩家")

	// 移动到下一个玩家
	g.moveToNextPlayer()

	// 检查是否需要进入下一阶段
	if g.isRoundComplete() {
		log.Printf("[游戏] 当前轮次结束，进入下一阶段")
		g.nextPhase()
	}

	return true
}

// moveToNextPlayer 移动到下一个可以行动的玩家
func (g *Game) moveToNextPlayer() {
	startPos := g.CurrentPlayer
	log.Printf("[游戏] 开始寻找下一个玩家，当前玩家位置: %d", startPos+1)

	// 计算活跃玩家数量
	activePlayers := 0
	for _, player := range g.Players {
		if !player.IsEmpty() && player.Status != PlayerStatusFolded {
			activePlayers++
		}
	}

	// 如果只剩一个活跃玩家，直接进入摊牌阶段
	if activePlayers <= 1 {
		g.CurrentPlayer = -1
		log.Printf("[游戏] 只剩一个活跃玩家，准备进入摊牌阶段")
		return
	}

	// 寻找下一个可以行动的玩家
	for i := 1; i <= len(g.Players); i++ {
		nextPos := (startPos + i) % len(g.Players)
		player := &g.Players[nextPos]

		// 跳过空座位和已弃牌的玩家
		if player.IsEmpty() || player.Status == PlayerStatusFolded {
			continue
		}

		// 检查玩家是否可以行动
		if player.CanAct() {
			g.CurrentPlayer = nextPos
			log.Printf("[游戏] 找到下一个可行动玩家: %s (座位%d)", player.Name, nextPos+1)
			return
		} else {
			log.Printf("[游戏] 玩家 %s (座位%d) 不能行动 - 状态: %s, HasActed: %v",
				player.Name, nextPos+1, player.Status, player.HasActed)
		}
	}

	// 如果没有找到可以行动的玩家，说明本轮结束
	g.CurrentPlayer = -1
	log.Printf("[游戏] 本轮结束，没有更多可行动玩家")
}

// isRoundComplete 检查当前轮次是否完成
func (g *Game) isRoundComplete() bool {
	activePlayers := 0
	actedPlayers := 0

	for _, player := range g.Players {
		if !player.IsEmpty() && player.Status != PlayerStatusFolded {
			activePlayers++
			if player.HasActed || player.Status == PlayerStatusAllIn {
				actedPlayers++
			}
		}
	}

	// 所有活跃玩家都已行动，或者只剩一个玩家
	return actedPlayers == activePlayers || activePlayers <= 1
}

// nextPhase 进入下一个游戏阶段
func (g *Game) nextPhase() {
	log.Printf("[游戏] 当前阶段: %s, 检查是否应该直接摊牌", g.GamePhase)

	// 检查是否应该直接进入摊牌阶段
	if g.shouldGoToShowdown() {
		log.Printf("[游戏] 满足直接摊牌条件，跳过剩余阶段")
		// 先发完所有公共牌
		g.dealRemainingCards()
		// 直接进入摊牌
		g.GamePhase = GamePhaseShowdown
		g.showdown()
		return
	}

	log.Printf("[游戏] 继续正常游戏流程，进入下一阶段")

	// 重置所有玩家的行动状态和当前下注
	for i := range g.Players {
		if !g.Players[i].IsEmpty() && g.Players[i].Status != PlayerStatusFolded {
			g.Players[i].HasActed = false
			g.Players[i].CurrentBet = 0
		}
	}

	g.CurrentBet = 0

	switch g.GamePhase {
	case GamePhasePreFlop:
		g.GamePhase = GamePhaseFlop
		g.dealFlop()
	case GamePhaseFlop:
		g.GamePhase = GamePhaseTurn
		g.dealTurn()
	case GamePhaseTurn:
		g.GamePhase = GamePhaseRiver
		g.dealRiver()
	case GamePhaseRiver:
		g.GamePhase = GamePhaseShowdown
		g.showdown()
	default:
		// 游戏结束，重新开始
		g.EndGame()
		return
	}

	// 设置第一个行动玩家（翻牌后从小盲注开始）
	g.setFirstActionPlayerPostFlop()
}

// dealFlop 发翻牌（3张公共牌）
func (g *Game) dealFlop() {
	// 烧掉一张牌
	g.dealCard()

	// 发3张翻牌
	for i := 0; i < 3; i++ {
		card := g.dealCard()
		g.CommunityCards = append(g.CommunityCards, card)
	}
}

// dealTurn 发转牌（第4张公共牌）
func (g *Game) dealTurn() {
	// 烧掉一张牌
	g.dealCard()

	// 发转牌
	card := g.dealCard()
	g.CommunityCards = append(g.CommunityCards, card)
}

// dealRiver 发河牌（第5张公共牌）
func (g *Game) dealRiver() {
	// 烧掉一张牌
	g.dealCard()

	// 发河牌
	card := g.dealCard()
	g.CommunityCards = append(g.CommunityCards, card)
}

// showdown 摊牌阶段
func (g *Game) showdown() {
	// 收集所有未弃牌的玩家
	var activePlayers []*Player
	for i := range g.Players {
		player := &g.Players[i]
		if !player.IsEmpty() && player.Status != PlayerStatusFolded {
			activePlayers = append(activePlayers, player)
		}
	}

	// 如果只有一个玩家，直接获胜
	if len(activePlayers) == 1 {
		winner := activePlayers[0]
		winAmount := g.Pot

		// 创建获胜者信息
		winnerHand := PlayerHand{
			Player: winner,
			Hand:   &Hand{Rank: HighCardRank}, // 使用高牌作为默认牌型
		}
		winners := []PlayerHand{winnerHand}
		winAmounts := []int{winAmount}

		// 创建并保存对局记录
		g.CurrentRound = CreateGameRecord(g, winners, winAmounts)
		if err := SaveGameRecord(g.CurrentRound); err != nil {
			log.Printf("[警告] 保存对局记录失败: %v", err)
		}

		// 更新玩家状态
		winner.Chips += winAmount
		winner.WinAmount = winAmount
		winner.HoleCards = make([]Card, 0) // 清空手牌，这样就不会显示
		winner.HandRank = nil

		// 设置游戏状态
		g.GamePhase = GamePhaseShowdown
		g.GameStatus = GameStatusWaiting
		g.CurrentPlayer = -1
		g.DealerPos = -1
		g.CountdownTimer = -1
		g.ShowdownTimer = -1
		g.CurrentShowdown = -1
		g.ShowdownOrder = nil

		// 重置所有玩家的准备状态
		for i := range g.Players {
			if !g.Players[i].IsEmpty() {
				g.Players[i].IsReady = false
				g.Players[i].Status = PlayerStatusSitting
				g.Players[i].HasActed = false
			}
		}

		log.Printf("[游戏] 玩家 %s 通过弃牌获胜，赢得底池 %d", winner.Name, winAmount)
		return
	}

	// 启动逐步摊牌流程
	g.startShowdownReveal()
}

// startShowdownReveal 开始逐步摊牌流程
func (g *Game) startShowdownReveal() {
	log.Printf("[摊牌] 开始逐步摊牌流程")

	// 切换到逐步摊牌阶段
	g.GamePhase = GamePhaseShowdownReveal

	// 确定摊牌顺序：从小盲位开始，按座位顺序
	g.ShowdownOrder = make([]int, 0)

	// 找到小盲位
	smallBlindPos := -1
	for i, player := range g.Players {
		if !player.IsEmpty() && player.Status != PlayerStatusFolded {
			// 简化逻辑：从第一个未弃牌的玩家开始
			if smallBlindPos == -1 {
				smallBlindPos = i
			}
		}
	}

	// 从小盲位开始，按座位顺序添加所有未弃牌的玩家
	if smallBlindPos != -1 {
		for i := 0; i < MaxSeats; i++ {
			pos := (smallBlindPos + i) % MaxSeats
			player := &g.Players[pos]
			if !player.IsEmpty() && player.Status != PlayerStatusFolded {
				g.ShowdownOrder = append(g.ShowdownOrder, pos)
				log.Printf("[摊牌] 添加玩家 %s (座位%d) 到摊牌顺序", player.Name, pos+1)
			}
		}
	}

	// 开始逐步摊牌，不使用倒计时
	g.CurrentShowdown = -1 // 初始化为-1，第一次AdvanceShowdown会变成0
	g.ShowdownTimer = 0    // 不使用倒计时

	log.Printf("[摊牌] 摊牌顺序初始化完成，共%d个玩家", len(g.ShowdownOrder))
}

// NextShowdownReveal 进行下一个玩家的摊牌
func (g *Game) NextShowdownReveal() {
	if g.CurrentShowdown >= 0 && g.CurrentShowdown < len(g.ShowdownOrder) {
		// 为当前玩家计算手牌
		playerIndex := g.ShowdownOrder[g.CurrentShowdown]
		player := &g.Players[playerIndex]

		if len(player.HoleCards) == 2 {
			bestHand := GetBestHand(player, g.CommunityCards)
			oldHandRank := ConvertToOldHandRank(bestHand)
			player.HandRank = &oldHandRank
			log.Printf("[摊牌] 玩家 %s 摊牌: %s", player.Name, GetHandRankName(bestHand.Rank))
		}
	}
}

// AdvanceShowdown 推进到下一个摊牌玩家
func (g *Game) AdvanceShowdown() {
	// 移动到下一个玩家
	g.CurrentShowdown++

	// 检查是否所有玩家都已摊牌
	if g.CurrentShowdown >= len(g.ShowdownOrder) {
		// 所有玩家都已摊牌，计算获胜者
		log.Printf("[摊牌] 所有玩家摊牌完成，准备结算")
		g.finishShowdown()
	} else {
		// 还有玩家需要摊牌，记录下一个玩家
		playerIndex := g.ShowdownOrder[g.CurrentShowdown]
		log.Printf("[摊牌] 下一个玩家: %s (座位%d)", g.Players[playerIndex].Name, playerIndex+1)
		// 为下一个玩家摊牌
		g.NextShowdownReveal()
	}
}

// finishShowdown 完成摊牌阶段
func (g *Game) finishShowdown() {
	log.Printf("[摊牌] 所有玩家摊牌完成，计算获胜者")

	// 收集所有未弃牌的玩家
	var activePlayers []*Player
	for _, playerIndex := range g.ShowdownOrder {
		player := &g.Players[playerIndex]
		activePlayers = append(activePlayers, player)
	}

	log.Printf("[摊牌] 活跃玩家数量: %d", len(activePlayers))
	if len(activePlayers) == 0 {
		log.Printf("[摊牌] 警告：没有活跃玩家，跳过摊牌")
		return
	}

	// 使用新的手牌比较算法找出获胜者
	winners := FindWinningHands(activePlayers, g.CommunityCards)

	// 检查是否有获胜者，防止除零错误
	if len(winners) == 0 {
		log.Printf("[摊牌] 警告：没有找到获胜者，跳过底池分配")
		return
	}

	// 分配底池
	winAmount := g.Pot / len(winners)
	remainder := g.Pot % len(winners)

	// 计算每个获胜者的赢得金额
	winAmounts := make([]int, len(winners))
	for i := range winners {
		winAmounts[i] = winAmount
		if i < remainder {
			winAmounts[i]++ // 余数分给前几个获胜者
		}
	}

	// 创建对局记录
	g.CurrentRound = CreateGameRecord(g, winners, winAmounts)

	// 保存对局记录
	if err := SaveGameRecord(g.CurrentRound); err != nil {
		log.Printf("[警告] 保存对局记录失败: %v", err)
	}

	// 分配筹码给获胜者
	for i, winner := range winners {
		winner.Player.Chips += winAmounts[i]
		winner.Player.WinAmount = winAmounts[i]
		log.Printf("[游戏] 玩家 %s 获胜，赢得 %d 筹码", winner.Player.Name, winAmounts[i])
	}

	// 切换到摊牌阶段并设置游戏状态为等待
	g.GamePhase = GamePhaseShowdown
	g.GameStatus = GameStatusWaiting

	// 重置游戏相关状态
	g.CurrentPlayer = -1
	g.DealerPos = -1 // 重置庄家位置，下一局会重新选择
	g.CountdownTimer = -1
	g.ShowdownTimer = -1
	g.CurrentShowdown = -1
	g.ShowdownOrder = nil

	// 重置所有玩家的准备状态和相关信息
	for i := range g.Players {
		if !g.Players[i].IsEmpty() {
			g.Players[i].IsReady = false
			g.Players[i].Status = PlayerStatusSitting
			g.Players[i].HasActed = false
			// 不要清空手牌、牌型和赢得金额，这些需要在结算面板中显示
			// 这些信息会在玩家准备或开始新一局时清空
		}
	}

	log.Printf("[游戏] 摊牌阶段结束，等待玩家准备下一局")
}

// CheckAllPlayersReady 检查是否所有玩家都已准备
func (g *Game) CheckAllPlayersReady() bool {
	// 只有在等待状态或摊牌阶段才能检查准备状态
	if g.GameStatus != GameStatusWaiting && g.GamePhase != GamePhaseShowdown {
		return false
	}

	sittingPlayers := 0
	readyPlayers := 0

	// 统计所有有筹码的玩家
	for _, player := range g.Players {
		if !player.IsEmpty() && player.Chips > 0 {
			sittingPlayers++
			if player.IsReady {
				readyPlayers++
			}
		}
	}

	log.Printf("[游戏] 检查准备状态：阶段=%s, 总玩家数=%d，已准备玩家数=%d", g.GamePhase, sittingPlayers, readyPlayers)

	// 至少需要2个玩家，且所有玩家都已准备
	return sittingPlayers >= MinPlayers && sittingPlayers == readyPlayers
}

// SetPlayerReady 设置玩家准备状态
func (g *Game) SetPlayerReady(userId string, ready bool) bool {
	// 检查游戏状态
	if g.GameStatus == GameStatusPlaying && g.GamePhase != GamePhaseShowdown {
		log.Printf("[游戏] 游戏进行中且不在摊牌阶段，无法设置准备状态")
		return false
	}

	for i := range g.Players {
		if g.Players[i].UserId == userId && !g.Players[i].IsEmpty() {
			// 检查玩家是否有筹码，没有筹码的玩家不能准备
			if ready && g.Players[i].Chips <= 0 {
				log.Printf("[游戏] 玩家 %s 筹码不足，无法准备游戏", g.Players[i].Name)
				return false
			}

			g.Players[i].IsReady = ready

			// 如果是准备状态，且不在摊牌阶段，清空玩家的相关信息
			if ready && g.GamePhase != GamePhaseShowdown {
				g.Players[i].HoleCards = make([]Card, 0)  // 清空手牌
				g.Players[i].CurrentBet = 0               // 清空当前下注
				g.Players[i].TotalBet = 0                 // 清空总下注
				g.Players[i].HandRank = nil               // 清空牌型
				g.Players[i].WinAmount = 0                // 清空赢得金额
				g.Players[i].HasActed = false             // 重置行动状态
				g.Players[i].Status = PlayerStatusSitting // 重置为坐下状态
			}

			// 如果在摊牌阶段，保持玩家的手牌和牌型信息，直到新一局开始
			if g.GamePhase == GamePhaseShowdown {
				// 只更新准备状态，不清空其他信息
				log.Printf("[游戏] 摊牌阶段，玩家 %s 准备状态更新为 %v，保留结算信息", g.Players[i].Name, ready)
			}

			log.Printf("[游戏] 玩家 %s %s", g.Players[i].Name, map[bool]string{true: "已准备", false: "取消准备"}[ready])
			return true
		}
	}

	log.Printf("[游戏] 未找到玩家 %s", userId)
	return false
}

// GetReadyPlayersCount 获取已准备的玩家数量
func (g *Game) GetReadyPlayersCount() (int, int) {
	sittingPlayers := 0
	readyPlayers := 0

	// 统一统计逻辑：只统计有筹码的玩家
	for _, player := range g.Players {
		if !player.IsEmpty() && player.Chips > 0 {
			sittingPlayers++
			if player.IsReady {
				readyPlayers++
			}
		}
	}

	log.Printf("[游戏] 准备状态统计：阶段=%s, 总玩家数=%d，已准备玩家数=%d", g.GamePhase, sittingPlayers, readyPlayers)
	return readyPlayers, sittingPlayers
}

// shouldGoToShowdown 检查是否应该直接进入摊牌阶段
func (g *Game) shouldGoToShowdown() bool {
	activePlayers := 0
	allInPlayers := 0
	playersWithChips := 0

	for _, player := range g.Players {
		if !player.IsEmpty() && player.Status != PlayerStatusFolded {
			activePlayers++
			if player.Status == PlayerStatusAllIn {
				allInPlayers++
			} else if player.Status == PlayerStatusSitting && player.Chips > 0 {
				playersWithChips++
			}
			log.Printf("[摊牌检查] 玩家 %s: 状态=%s, 筹码=%d", player.Name, player.Status, player.Chips)
		}
	}

	shouldShowdown := activePlayers <= 1 || playersWithChips <= 1
	log.Printf("[摊牌检查] 活跃玩家=%d, 全下玩家=%d, 有筹码玩家=%d, 应该摊牌=%t",
		activePlayers, allInPlayers, playersWithChips, shouldShowdown)

	// 只有在以下情况下才直接摊牌：
	// 1. 只剩一个玩家（其他都弃牌了）
	// 2. 只有一个玩家还有筹码，其他都全下了
	// 3. 所有玩家都全下了
	return shouldShowdown
}

// dealRemainingCards 发完剩余的公共牌
func (g *Game) dealRemainingCards() {
	switch g.GamePhase {
	case GamePhasePreFlop:
		// 发翻牌
		g.dealCard() // 烧牌
		for i := 0; i < 3; i++ {
			card := g.dealCard()
			g.CommunityCards = append(g.CommunityCards, card)
		}
		fallthrough
	case GamePhaseFlop:
		// 发转牌
		g.dealCard() // 烧牌
		card := g.dealCard()
		g.CommunityCards = append(g.CommunityCards, card)
		fallthrough
	case GamePhaseTurn:
		// 发河牌
		g.dealCard() // 烧牌
		card := g.dealCard()
		g.CommunityCards = append(g.CommunityCards, card)
	}
}

// setDealer 设置庄家位置
func (g *Game) setDealer() {
	if g.DealerPos == -1 {
		// 第一局游戏，选择第一个有玩家的位置作为庄家
		g.DealerPos = g.findFirstActivePlayer()
		log.Printf("[游戏] 第一局游戏，庄家位置设置为座位%d", g.DealerPos+1)
	} else {
		// 之后的每一局，庄家位置向后移动一位
		oldDealerPos := g.DealerPos
		g.DealerPos = g.getNextActivePlayer(g.DealerPos)
		log.Printf("[游戏] 庄家位置从座位%d轮转到座位%d", oldDealerPos+1, g.DealerPos+1)
	}
}
