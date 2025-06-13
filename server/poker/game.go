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
	GamePhasePreFlop  = "preflop"  // 翻牌前
	GamePhaseFlop     = "flop"     // 翻牌
	GamePhaseTurn     = "turn"     // 转牌
	GamePhaseRiver    = "river"    // 河牌
	GamePhaseShowdown = "showdown" // 摊牌
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
	CurrentPlayer  int      `json:"currentPlayer"`  // 当前行动玩家
	SmallBlind     int      `json:"smallBlind"`     // 小盲注
	BigBlind       int      `json:"bigBlind"`       // 大盲注
	Deck           []Card   `json:"-"`              // 牌堆（不发送给客户端）
	CountdownTimer int      `json:"countdownTimer"` // 倒计时（秒）
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
		Players:        players,
		GameStatus:     GameStatusWaiting,
		GamePhase:      "",
		CommunityCards: make([]Card, 0, 5),
		Pot:            0,
		CurrentBet:     0,
		DealerPos:      -1, // 初始化为-1，表示还未设置庄家
		CurrentPlayer:  -1,
		SmallBlind:     DefaultSmallBlind,
		BigBlind:       DefaultBigBlind,
		Deck:           make([]Card, 0, 52),
		CountdownTimer: 0,
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
	g.GamePhase = GamePhasePreFlop

	// 初始化新一轮游戏
	g.initializeRound()

	return true
}

// EndGame 结束游戏
func (g *Game) EndGame() {
	g.GameStatus = GameStatusWaiting
	g.GamePhase = ""
	g.resetRound()
}

// initializeRound 初始化新一轮游戏
func (g *Game) initializeRound() {
	// 重置底池和下注
	g.Pot = 0
	g.CurrentBet = 0

	// 清空公共牌
	g.CommunityCards = make([]Card, 0, 5)

	// 创建并洗牌
	g.createDeck()
	g.shuffleDeck()

	// 重置所有玩家状态
	for i := range g.Players {
		if !g.Players[i].IsEmpty() {
			g.Players[i].ResetForNewRound()
		}
	}

	// 设置庄家位置（第一局从座位1开始，后续轮转）
	if g.DealerPos == -1 {
		// 第一局游戏，从座位1开始（如果座位1有人），否则找第一个有人的座位
		g.DealerPos = g.findFirstActivePlayer()
		log.Printf("[游戏] 第一局游戏，庄家位置设置为座位%d", g.DealerPos+1)
	} else {
		// 后续游戏，庄家位置轮转到下一个活跃玩家
		oldDealerPos := g.DealerPos
		g.DealerPos = g.getNextActivePlayer(g.DealerPos)
		log.Printf("[游戏] 庄家位置从座位%d轮转到座位%d", oldDealerPos+1, g.DealerPos+1)
	}

	// 发底牌
	g.dealHoleCards()

	// 下盲注
	g.postBlinds()

	// 设置第一个行动玩家
	g.setFirstActionPlayer()
}

// resetRound 重置游戏轮次
func (g *Game) resetRound() {
	g.Pot = 0
	g.CurrentBet = 0
	g.CommunityCards = make([]Card, 0, 5)
	g.DealerPos = -1 // 重置为-1，下次开始游戏时重新设置
	g.CurrentPlayer = -1
	g.Deck = make([]Card, 0, 52)
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

	// 新的盲注逻辑：小盲总是第一个有人的座位，大盲是第二个有人的座位
	occupiedSeats := make([]int, 0)
	for i, player := range g.Players {
		if !player.IsEmpty() && player.Status == PlayerStatusSitting {
			occupiedSeats = append(occupiedSeats, i)
		}
	}

	var smallBlindPos, bigBlindPos int
	if len(occupiedSeats) >= 2 {
		smallBlindPos = occupiedSeats[0] // 第一个有人的座位作为小盲
		bigBlindPos = occupiedSeats[1]   // 第二个有人的座位作为大盲
	} else if len(occupiedSeats) == 1 {
		// 只有一个玩家的情况（理论上不应该发生）
		smallBlindPos = occupiedSeats[0]
		bigBlindPos = occupiedSeats[0]
	} else {
		return // 没有玩家
	}

	log.Printf("[游戏] 玩家数量: %d", playerCount)
	log.Printf("[游戏] 庄家位置: 座位%d (%s)", g.DealerPos+1, g.Players[g.DealerPos].Name)
	log.Printf("[游戏] 小盲位置: 座位%d (%s)", smallBlindPos+1, g.Players[smallBlindPos].Name)
	log.Printf("[游戏] 大盲位置: 座位%d (%s)", bigBlindPos+1, g.Players[bigBlindPos].Name)

	// 小盲注
	if smallBlindPos != -1 {
		g.Players[smallBlindPos].PostBlind(g.SmallBlind)
		g.Pot += g.SmallBlind
		log.Printf("[游戏] %s 下小盲注 %d", g.Players[smallBlindPos].Name, g.SmallBlind)
	}

	// 大盲注
	if bigBlindPos != -1 {
		g.Players[bigBlindPos].PostBlind(g.BigBlind)
		g.Pot += g.BigBlind
		g.CurrentBet = g.BigBlind
		log.Printf("[游戏] %s 下大盲注 %d", g.Players[bigBlindPos].Name, g.BigBlind)
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
	// 检查游戏状态
	if g.GameStatus != GameStatusPlaying {
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
		return false
	}

	// 检查是否轮到该玩家行动
	if g.CurrentPlayer != playerPos {
		return false
	}

	player := &g.Players[playerPos]

	// 检查玩家是否可以行动
	if !player.CanAct() {
		return false
	}

	// 处理不同的行动
	switch action {
	case "fold":
		player.Fold()
	case "call":
		callAmount := g.CurrentBet - player.CurrentBet
		if callAmount > 0 {
			player.Bet(callAmount)
			g.Pot += callAmount
		}
		player.HasActed = true
	case "check":
		// 只有在没有下注时才能过牌
		if g.CurrentBet == player.CurrentBet {
			player.HasActed = true
		} else {
			return false
		}
	case "raise":
		// 加注必须至少比当前下注多一个大盲注
		minRaise := g.CurrentBet + g.BigBlind
		if amount < minRaise {
			return false
		}

		// 检查玩家是否有足够的筹码
		raiseAmount := amount - player.CurrentBet
		if raiseAmount > player.Chips {
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
		return false
	}

	// 移动到下一个玩家
	g.moveToNextPlayer()

	// 检查是否需要进入下一阶段
	if g.isRoundComplete() {
		g.nextPhase()
	}

	return true
}

// moveToNextPlayer 移动到下一个可以行动的玩家
func (g *Game) moveToNextPlayer() {
	startPos := g.CurrentPlayer
	for {
		g.CurrentPlayer = g.getNextActivePlayer(g.CurrentPlayer)

		// 如果回到起始位置或没有找到下一个玩家，说明轮次结束
		if g.CurrentPlayer == startPos || g.CurrentPlayer == -1 {
			g.CurrentPlayer = -1
			break
		}

		player := &g.Players[g.CurrentPlayer]
		if player.CanAct() && player.Status == PlayerStatusSitting {
			break
		}
	}
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
		winner.Chips += g.Pot
		winner.WinAmount = g.Pot
		log.Printf("[游戏] 玩家 %s 获胜，赢得底池 %d", winner.Name, g.Pot)
		return // 不立即结束游戏，让前端显示结果
	}

	// 为所有参与游戏的玩家设置手牌信息（用于前端显示）
	for i := range g.Players {
		player := &g.Players[i]
		if !player.IsEmpty() && len(player.HoleCards) == 2 {
			bestHand := GetBestHand(player, g.CommunityCards)
			// 转换为旧格式以保持兼容性
			oldHandRank := ConvertToOldHandRank(bestHand)
			player.HandRank = &oldHandRank
			log.Printf("[摊牌] 玩家 %s 的牌型: %s (状态: %s)", player.Name, GetHandRankName(bestHand.Rank), player.Status)
		}
	}

	// 使用新的手牌比较算法找出获胜者（只考虑未弃牌的玩家）
	winners := FindWinningHands(activePlayers, g.CommunityCards)

	// 分配底池
	winAmount := g.Pot / len(winners)
	remainder := g.Pot % len(winners)

	for i, winner := range winners {
		amount := winAmount
		if i < remainder {
			amount++ // 余数分给前几个获胜者
		}

		winner.Player.Chips += amount
		winner.Player.WinAmount = amount

		log.Printf("[游戏] 玩家 %s 获胜，赢得 %d 筹码", winner.Player.Name, amount)
	}

	// 不立即结束游戏，让前端显示结果后再结束
}

// CheckAllPlayersReady 检查是否所有玩家都已准备
func (g *Game) CheckAllPlayersReady() bool {
	if g.GameStatus != GameStatusWaiting {
		return false
	}

	sittingPlayers := 0
	readyPlayers := 0

	for _, player := range g.Players {
		if !player.IsEmpty() && player.Status == PlayerStatusSitting {
			sittingPlayers++
			if player.IsReady {
				readyPlayers++
			}
		}
	}

	// 至少需要2个玩家，且所有玩家都已准备
	return sittingPlayers >= MinPlayers && sittingPlayers == readyPlayers
}

// SetPlayerReady 设置玩家准备状态
func (g *Game) SetPlayerReady(userId string, ready bool) bool {
	if g.GameStatus != GameStatusWaiting {
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
			log.Printf("[游戏] 玩家 %s %s", g.Players[i].Name, map[bool]string{true: "已准备", false: "取消准备"}[ready])
			return true
		}
	}

	return false
}

// GetReadyPlayersCount 获取已准备的玩家数量
func (g *Game) GetReadyPlayersCount() (int, int) {
	sittingPlayers := 0
	readyPlayers := 0

	for _, player := range g.Players {
		if !player.IsEmpty() && player.Status == PlayerStatusSitting {
			sittingPlayers++
			if player.IsReady {
				readyPlayers++
			}
		}
	}

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
