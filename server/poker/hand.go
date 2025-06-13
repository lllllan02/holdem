package poker

import (
	"sort"
)

// 牌型常量（从小到大）
const (
	HighCard      = 1  // 高牌
	OnePair       = 2  // 一对
	TwoPair       = 3  // 两对
	ThreeOfAKind  = 4  // 三条
	Straight      = 5  // 顺子
	Flush         = 6  // 同花
	FullHouse     = 7  // 葫芦
	FourOfAKind   = 8  // 四条
	StraightFlush = 9  // 同花顺
	RoyalFlush    = 10 // 皇家同花顺
)

// HandRank 牌型结构
type HandRank struct {
	Rank   int   `json:"rank"`   // 牌型等级
	Values []int `json:"values"` // 关键牌值（用于比较）
}

// EvaluateHand 评估7张牌的最佳5张牌组合
func EvaluateHand(cards []Card) HandRank {
	if len(cards) != 7 {
		return HandRank{Rank: HighCard, Values: []int{}}
	}

	// 生成所有可能的5张牌组合
	combinations := generateCombinations(cards, 5)

	var bestHand HandRank
	for _, combo := range combinations {
		hand := evaluateFiveCards(combo)
		if isHandBetter(hand, bestHand) {
			bestHand = hand
		}
	}

	return bestHand
}

// generateCombinations 生成所有可能的5张牌组合
func generateCombinations(cards []Card, r int) [][]Card {
	var result [][]Card
	var current []Card

	var backtrack func(start int)
	backtrack = func(start int) {
		if len(current) == r {
			combo := make([]Card, len(current))
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

// evaluateFiveCards 评估5张牌的牌型
func evaluateFiveCards(cards []Card) HandRank {
	// 按点数排序
	sortedCards := make([]Card, len(cards))
	copy(sortedCards, cards)
	sort.Slice(sortedCards, func(i, j int) bool {
		return sortedCards[i].Value > sortedCards[j].Value
	})

	// 统计点数和花色
	valueCount := make(map[int]int)
	suitCount := make(map[string]int)

	for _, card := range sortedCards {
		valueCount[card.Value]++
		suitCount[card.Suit]++
	}

	// 检查是否是同花
	isFlush := false
	for _, count := range suitCount {
		if count == 5 {
			isFlush = true
			break
		}
	}

	// 检查是否是顺子
	isStraight, straightHigh := checkStraight(sortedCards)

	// 统计相同点数的牌
	var counts []int
	var values []int
	for value, count := range valueCount {
		counts = append(counts, count)
		values = append(values, value)
	}

	// 按出现次数排序
	sort.Slice(values, func(i, j int) bool {
		if valueCount[values[i]] == valueCount[values[j]] {
			return values[i] > values[j] // 相同次数时按点数大小排序
		}
		return valueCount[values[i]] > valueCount[values[j]] // 按出现次数排序
	})

	sort.Ints(counts)
	sort.Sort(sort.Reverse(sort.IntSlice(counts)))

	// 判断牌型
	if isStraight && isFlush {
		if straightHigh == 14 { // A高顺子
			return HandRank{Rank: RoyalFlush, Values: []int{14}}
		}
		return HandRank{Rank: StraightFlush, Values: []int{straightHigh}}
	}

	if counts[0] == 4 {
		// 四条
		return HandRank{Rank: FourOfAKind, Values: values[:2]}
	}

	if counts[0] == 3 && counts[1] == 2 {
		// 葫芦
		return HandRank{Rank: FullHouse, Values: values[:2]}
	}

	if isFlush {
		// 同花
		var flushValues []int
		for _, card := range sortedCards {
			flushValues = append(flushValues, card.Value)
		}
		return HandRank{Rank: Flush, Values: flushValues}
	}

	if isStraight {
		// 顺子
		return HandRank{Rank: Straight, Values: []int{straightHigh}}
	}

	if counts[0] == 3 {
		// 三条
		return HandRank{Rank: ThreeOfAKind, Values: values}
	}

	if counts[0] == 2 && counts[1] == 2 {
		// 两对
		return HandRank{Rank: TwoPair, Values: values}
	}

	if counts[0] == 2 {
		// 一对
		return HandRank{Rank: OnePair, Values: values}
	}

	// 高牌
	var highCardValues []int
	for _, card := range sortedCards {
		highCardValues = append(highCardValues, card.Value)
	}
	return HandRank{Rank: HighCard, Values: highCardValues}
}

// checkStraight 检查是否是顺子
func checkStraight(sortedCards []Card) (bool, int) {
	values := make([]int, len(sortedCards))
	for i, card := range sortedCards {
		values[i] = card.Value
	}

	// 检查普通顺子
	for i := 1; i < len(values); i++ {
		if values[i-1]-values[i] != 1 {
			// 检查A-2-3-4-5顺子
			if i == 4 && values[0] == 14 && values[1] == 5 && values[2] == 4 && values[3] == 3 && values[4] == 2 {
				return true, 5 // A-2-3-4-5顺子，5为最高牌
			}
			return false, 0
		}
	}

	return true, values[0]
}

// isHandBetter 比较两个牌型，返回第一个是否更好
func isHandBetter(hand1, hand2 HandRank) bool {
	if hand1.Rank > hand2.Rank {
		return true
	}
	if hand1.Rank < hand2.Rank {
		return false
	}

	// 相同牌型，比较关键牌值
	for i := 0; i < len(hand1.Values) && i < len(hand2.Values); i++ {
		if hand1.Values[i] > hand2.Values[i] {
			return true
		}
		if hand1.Values[i] < hand2.Values[i] {
			return false
		}
	}

	return false // 完全相同
}

// CompareHands 比较两个牌型，返回1表示hand1更大，-1表示hand2更大，0表示平局
func CompareHands(hand1, hand2 HandRank) int {
	if isHandBetter(hand1, hand2) {
		return 1
	}
	if isHandBetter(hand2, hand1) {
		return -1
	}
	return 0
}

// GetHandName 获取牌型名称
func GetHandName(rank int) string {
	switch rank {
	case RoyalFlush:
		return "皇家同花顺"
	case StraightFlush:
		return "同花顺"
	case FourOfAKind:
		return "四条"
	case FullHouse:
		return "葫芦"
	case Flush:
		return "同花"
	case Straight:
		return "顺子"
	case ThreeOfAKind:
		return "三条"
	case TwoPair:
		return "两对"
	case OnePair:
		return "一对"
	case HighCard:
		return "高牌"
	default:
		return "未知"
	}
}
