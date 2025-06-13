package poker

import (
	"log"
	"sort"
)

// 比较结果常量
type Comparison int

const (
	LessThan    Comparison = -1
	EqualTo     Comparison = 0
	GreaterThan Comparison = 1
)

// 牌点数常量（用于比较）
type CardRank int

const (
	Two   CardRank = 2
	Three CardRank = 3
	Four  CardRank = 4
	Five  CardRank = 5
	Six   CardRank = 6
	Seven CardRank = 7
	Eight CardRank = 8
	Nine  CardRank = 9
	Ten   CardRank = 10
	Jack  CardRank = 11
	Queen CardRank = 12
	King  CardRank = 13
	Ace   CardRank = 14
)

// 牌型等级常量（重新定义以保持一致性）
type HandRankType int

const (
	HighCardRank      HandRankType = 1
	OnePairRank       HandRankType = 2
	TwoPairRank       HandRankType = 3
	ThreeOfAKindRank  HandRankType = 4
	StraightRank      HandRankType = 5
	FlushRank         HandRankType = 6
	FullHouseRank     HandRankType = 7
	FourOfAKindRank   HandRankType = 8
	StraightFlushRank HandRankType = 9
	RoyalFlushRank    HandRankType = 10
)

// Hand 结构体表示一副扑克手牌
type Hand struct {
	Rank        HandRankType // 牌型等级
	TieBreakers []CardRank   // 用于平局判定的牌点数列表
}

// PlayerHand 结构体表示玩家和其手牌的组合
type PlayerHand struct {
	Hand   *Hand
	Player *Player
}

// 将现有Card转换为CardRank
func cardToRank(card Card) CardRank {
	return CardRank(card.Value)
}

// 将现有Card数组转换为内部使用的Card数组
type InternalCard struct {
	Rank CardRank
	Suit string
}

func convertCards(cards []Card) []InternalCard {
	result := make([]InternalCard, len(cards))
	for i, card := range cards {
		result[i] = InternalCard{
			Rank: cardToRank(card),
			Suit: card.Suit,
		}
	}
	return result
}

// ByCard 实现了牌的排序接口
type ByCard []InternalCard

func (c ByCard) Len() int           { return len(c) }
func (c ByCard) Swap(i, j int)      { c[i], c[j] = c[j], c[i] }
func (c ByCard) Less(i, j int) bool { return c[i].Rank < c[j].Rank }

// CompareLess 方法比较当前手牌是否小于另一副手牌
func (h *Hand) CompareLess(otherHand *Hand) bool {
	if h.Rank < otherHand.Rank {
		return true
	}

	if h.Rank > otherHand.Rank {
		return false
	}

	// 只有在相同牌型的情况下才比较平局判定值
	for i := range h.TieBreakers {
		if h.TieBreakers[i] < otherHand.TieBreakers[i] {
			return true
		}
		if h.TieBreakers[i] > otherHand.TieBreakers[i] {
			return false
		}
	}
	return false
}

// ByHand 实现了手牌的排序接口
type ByHand []Hand

func (h ByHand) Len() int           { return len(h) }
func (h ByHand) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h ByHand) Less(i, j int) bool { return h[i].CompareLess(&h[j]) }

// IsHand 是一个函数类型，用于检查特定的牌型
type IsHand func(cs [5]InternalCard) *Hand

// FindWinningHands 方法找出拥有最佳手牌的玩家
func FindWinningHands(players []*Player, communityCards []Card) []PlayerHand {
	winners := make([]PlayerHand, 0)

	// 找出拥有相同牌型的玩家
	for _, player := range players {
		if len(winners) == 0 {
			// 如果还没有赢家，将当前玩家设为默认赢家
			winners = append(winners, PlayerHand{Hand: GetBestHand(player, communityCards), Player: player})
		} else {
			bestHand := GetBestHand(player, communityCards)
			winningHand := winners[0].Hand
			result := CompareHand(bestHand, winningHand)
			if result == GreaterThan {
				// 如果找到更好的手牌，将当前玩家设为唯一赢家
				winners = []PlayerHand{
					{Hand: bestHand, Player: player},
				}
			} else if result == EqualTo {
				// 如果是平局，玩家将共享奖池
				winners = append(winners, PlayerHand{Hand: bestHand, Player: player})
			}
		}
	}
	// 按玩家筹码数排序
	sort.SliceStable(winners, func(i, j int) bool {
		return winners[i].Player.Chips < winners[j].Player.Chips
	})
	return winners
}

// CompareHand 方法比较两副手牌的大小
func CompareHand(a *Hand, b *Hand) Comparison {
	if a.Rank > b.Rank {
		return GreaterThan
	}

	if a.Rank < b.Rank {
		return LessThan
	}

	// 当两副手牌牌型相同时，使用平局判定规则
	// 由于不同牌型的平局判定规则不同，需要分别处理
	for i := range a.TieBreakers {
		if a.TieBreakers[i] < b.TieBreakers[i] {
			return LessThan
		}
		if a.TieBreakers[i] > b.TieBreakers[i] {
			return GreaterThan
		}
	}

	return EqualTo
}

// GetBestHand 方法获取玩家的最佳手牌组合
func GetBestHand(player *Player, communityCards []Card) *Hand {
	// 收集所有可用的牌：2张手牌 + 5张公共牌
	allCards := make([]Card, 0, 7)
	allCards = append(allCards, player.HoleCards...)
	allCards = append(allCards, communityCards...)

	// 调试日志
	log.Printf("[调试] 玩家 %s 的所有牌: %d张", player.Name, len(allCards))
	for i, card := range allCards {
		log.Printf("[调试] 牌%d: %s %s (值:%d)", i+1, card.Rank, card.Suit, card.Value)
	}

	// 如果牌数不足7张，返回高牌
	if len(allCards) < 7 {
		log.Printf("[调试] 牌数不足7张，返回高牌")
		return &Hand{Rank: HighCardRank, TieBreakers: []CardRank{}}
	}

	// 转换为内部格式
	internalCards := convertCards(allCards)

	// 找出所有可能的5张牌组合
	cardCombos := FindCardCombinations(0, 3, internalCards)
	log.Printf("[调试] 生成了 %d 种组合", len(cardCombos))

	var cardHand [5]InternalCard
	var bestHand *Hand
	for i, cs := range cardCombos {
		copy(cardHand[:], cs)
		currentHand := CheckHand(cardHand)
		log.Printf("[调试] 组合%d: 牌型=%d", i+1, currentHand.Rank)

		if bestHand == nil {
			// 如果是第一个组合，设为默认最佳手牌
			bestHand = currentHand
		} else {
			result := CompareHand(currentHand, bestHand)
			if result == GreaterThan {
				// 如果当前组合更好，更新最佳手牌
				bestHand = currentHand
			}
		}
	}

	log.Printf("[调试] 玩家 %s 最佳牌型: %d (%s)", player.Name, bestHand.Rank, GetHandRankName(bestHand.Rank))
	return bestHand
}

// FindCardCombinations 方法找出所有可能的牌组合
// 使用更简单的递归算法生成C(7,5)=21种组合
func FindCardCombinations(startIndex int, endIndex int, cs []InternalCard) [][]InternalCard {
	return generateInternalCombinations(cs, 5)
}

// generateInternalCombinations 生成从cards中选择r张牌的所有组合
func generateInternalCombinations(cards []InternalCard, r int) [][]InternalCard {
	var result [][]InternalCard
	var current []InternalCard

	var backtrack func(start int)
	backtrack = func(start int) {
		if len(current) == r {
			combo := make([]InternalCard, len(current))
			copy(combo, current)
			result = append(result, combo)
			return
		}

		for i := start; i < len(cards); i++ {
			current = append(current, cards[i])
			backtrack(i + 1)
			current = current[:len(current)-1]
		}
	}

	backtrack(0)
	return result
}

// CheckHand 方法检查玩家的手牌组合，判断牌型
func CheckHand(cs [5]InternalCard) *Hand {
	// 按照从大到小的顺序检查可能的牌型
	possibleHands := []IsHand{
		IsRoyalFlush,    // 皇家同花顺
		IsStraightFlush, // 同花顺
		IsFourOfAKind,   // 四条
		IsFullHouse,     // 葫芦
		IsFlush,         // 同花
		IsStraight,      // 顺子
		IsThreeOfAKind,  // 三条
		IsTwoPair,       // 两对
		IsOnePair,       // 一对
		IsHighCard,      // 高牌
	}

	var hand *Hand

	// 从高到低检查每种牌型，返回第一个匹配的结果
	for _, isHand := range possibleHands {
		hand = isHand(cs)
		if hand != nil {
			break
		}
	}
	return hand
}

// IsRoyalFlush 检查是否是皇家同花顺
func IsRoyalFlush(cs [5]InternalCard) *Hand {
	straightFlush := IsStraightFlush(cs)

	if straightFlush == nil {
		return nil
	}

	if straightFlush.TieBreakers[0] != Ace {
		return nil
	}

	return &Hand{
		Rank:        RoyalFlushRank,
		TieBreakers: []CardRank{},
	}
}

// IsStraightFlush 检查是否是同花顺
func IsStraightFlush(cs [5]InternalCard) *Hand {
	flush := IsFlush(cs)
	straight := IsStraight(cs)

	if flush == nil || straight == nil {
		return nil
	}

	return &Hand{
		Rank:        StraightFlushRank,
		TieBreakers: straight.TieBreakers,
	}
}

// IsFourOfAKind 检查是否是四条
func IsFourOfAKind(cs [5]InternalCard) *Hand {
	rankCount := make(map[CardRank]int)
	for _, c := range cs {
		rankCount[c.Rank]++
	}

	isHand := false
	handStrength := Two
	kicker := Two

	for rank, count := range rankCount {
		if count == 4 {
			isHand = true
			handStrength = rank
		}

		if count == 1 {
			kicker = rank
		}
	}

	if isHand == false {
		return nil
	}

	return &Hand{
		Rank:        FourOfAKindRank,
		TieBreakers: []CardRank{handStrength, kicker},
	}
}

// IsFullHouse 检查是否是葫芦
func IsFullHouse(cs [5]InternalCard) *Hand {
	threeOfAKind := IsThreeOfAKind(cs)
	pair := IsOnePair(cs)
	if threeOfAKind == nil || pair == nil {
		return nil
	}

	handStrength := threeOfAKind.TieBreakers[0]
	kicker := pair.TieBreakers[0]

	return &Hand{
		Rank:        FullHouseRank,
		TieBreakers: []CardRank{handStrength, kicker},
	}
}

// IsFlush 检查是否是同花
func IsFlush(cs [5]InternalCard) *Hand {
	suit := cs[0].Suit
	for _, c := range cs {
		if c.Suit != suit {
			return nil
		}
	}

	sort.Sort(sort.Reverse(ByCard(cs[:])))
	tieBreakers := make([]CardRank, len(cs))
	for i := range cs {
		tieBreakers[i] = cs[i].Rank
	}

	return &Hand{
		Rank:        FlushRank,
		TieBreakers: tieBreakers,
	}
}

// IsStraight 检查是否是顺子
func IsStraight(cs [5]InternalCard) *Hand {
	sort.Sort(ByCard(cs[:]))

	// Handle Ace-5 edge case first
	if cs[0].Rank == Two && cs[1].Rank == Three && cs[2].Rank == Four && cs[3].Rank == Five && cs[4].Rank == Ace {
		return &Hand{
			Rank:        StraightRank,
			TieBreakers: []CardRank{Five},
		}
	}

	for i := 0; i < len(cs)-1; i++ {
		if cs[i].Rank+1 != cs[i+1].Rank {
			return nil
		}
	}
	// Tiebreaker is the high card for the straight
	handStrength := cs[4].Rank
	return &Hand{
		Rank:        StraightRank,
		TieBreakers: []CardRank{handStrength},
	}
}

// IsThreeOfAKind 检查是否是三条
func IsThreeOfAKind(cs [5]InternalCard) *Hand {
	sort.Sort(sort.Reverse(ByCard(cs[:])))

	rankCount := make(map[CardRank]int)
	for _, c := range cs {
		rankCount[c.Rank]++
	}

	isHand := false
	tieBreakers := make([]CardRank, 0)
	for rank, count := range rankCount {
		if count == 3 {
			isHand = true
			tieBreakers = append(tieBreakers, rank)
		}
	}

	if isHand == false {
		return nil
	}

	// Add kickers
	for _, c := range cs {
		if rankCount[c.Rank] != 3 {
			tieBreakers = append(tieBreakers, c.Rank)
		}
	}

	return &Hand{
		Rank:        ThreeOfAKindRank,
		TieBreakers: tieBreakers,
	}
}

// IsTwoPair 检查是否是两对
func IsTwoPair(cs [5]InternalCard) *Hand {
	rankCount := make(map[CardRank]int)
	for _, c := range cs {
		rankCount[c.Rank]++
	}

	pairs := 0
	tieBreakers := make([]CardRank, 0)
	for rank, count := range rankCount {
		if count == 2 {
			pairs++
			tieBreakers = append(tieBreakers, rank)
		}
	}

	if pairs != 2 {
		return nil
	}

	// Swap pairs so that the highest pair comes first
	if tieBreakers[0] < tieBreakers[1] {
		tempCard := tieBreakers[0]
		tieBreakers[0] = tieBreakers[1]
		tieBreakers[1] = tempCard
	}

	// Add kicker
	for _, c := range cs {
		if rankCount[c.Rank] != 2 {
			tieBreakers = append(tieBreakers, c.Rank)
		}
	}

	return &Hand{
		Rank:        TwoPairRank,
		TieBreakers: tieBreakers,
	}
}

// IsOnePair 检查是否是一对
func IsOnePair(cs [5]InternalCard) *Hand {
	sort.Sort(sort.Reverse(ByCard(cs[:])))

	rankCount := make(map[CardRank]int)
	for _, c := range cs {
		rankCount[c.Rank]++
	}

	pairs := 0
	tieBreakers := make([]CardRank, 0)
	for rank, count := range rankCount {
		if count == 2 {
			pairs++
			tieBreakers = append(tieBreakers, rank)
		}
	}

	if pairs != 1 {
		return nil
	}

	for _, c := range cs {
		if rankCount[c.Rank] != 2 {
			tieBreakers = append(tieBreakers, c.Rank)
		}
	}

	return &Hand{
		Rank:        OnePairRank,
		TieBreakers: tieBreakers,
	}
}

// IsHighCard 检查高牌
func IsHighCard(cs [5]InternalCard) *Hand {
	sort.Sort(sort.Reverse(ByCard(cs[:])))

	tieBreakers := make([]CardRank, len(cs))
	for i := range cs {
		tieBreakers[i] = cs[i].Rank
	}

	return &Hand{
		Rank:        HighCardRank,
		TieBreakers: tieBreakers,
	}
}

// GetHandRankName 获取牌型名称（兼容现有系统）
func GetHandRankName(rank HandRankType) string {
	switch rank {
	case RoyalFlushRank:
		return "皇家同花顺"
	case StraightFlushRank:
		return "同花顺"
	case FourOfAKindRank:
		return "四条"
	case FullHouseRank:
		return "葫芦"
	case FlushRank:
		return "同花"
	case StraightRank:
		return "顺子"
	case ThreeOfAKindRank:
		return "三条"
	case TwoPairRank:
		return "两对"
	case OnePairRank:
		return "一对"
	case HighCardRank:
		return "高牌"
	default:
		return "未知"
	}
}

// ConvertToOldHandRank 将新的Hand转换为旧的HandRank格式（兼容性）
func ConvertToOldHandRank(hand *Hand) HandRank {
	values := make([]int, len(hand.TieBreakers))
	for i, tb := range hand.TieBreakers {
		values[i] = int(tb)
	}

	return HandRank{
		Rank:   int(hand.Rank),
		Values: values,
	}
}
