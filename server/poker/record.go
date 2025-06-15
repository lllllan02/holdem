package poker

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"
)

const (
	// 游戏记录保存目录
	recordDir = "data/game_records"
)

// GameRound 记录一局游戏的信息
type GameRound struct {
	RoundID        string              `json:"roundId"`        // 对局ID
	StartTime      int64               `json:"startTime"`      // 开始时间
	EndTime        int64               `json:"endTime"`        // 结束时间
	DealerPos      int                 `json:"dealerPos"`      // 庄家位置
	SmallBlindPos  int                 `json:"smallBlindPos"`  // 小盲位置
	BigBlindPos    int                 `json:"bigBlindPos"`    // 大盲位置
	Pot            int                 `json:"pot"`            // 总底池
	CommunityCards []Card              `json:"communityCards"` // 公共牌
	Players        []PlayerRoundInfo   `json:"players"`        // 玩家信息
	Winners        []PlayerWinningInfo `json:"winners"`        // 获胜者信息
}

// PlayerRoundInfo 记录一局游戏中玩家的信息
type PlayerRoundInfo struct {
	UserId     string `json:"userId"`     // 用户ID
	Name       string `json:"name"`       // 玩家名称
	Position   int    `json:"position"`   // 座位位置
	InitChips  int    `json:"initChips"`  // 初始筹码
	FinalChips int    `json:"finalChips"` // 最终筹码
	TotalBet   int    `json:"totalBet"`   // 总下注
	Status     string `json:"status"`     // 最终状态
	HoleCards  []Card `json:"holeCards"`  // 手牌
	HandRank   string `json:"handRank"`   // 牌型
}

// PlayerWinningInfo 记录获胜者信息
type PlayerWinningInfo struct {
	UserId    string `json:"userId"`    // 用户ID
	Name      string `json:"name"`      // 玩家名称
	Position  int    `json:"position"`  // 座位位置
	WinAmount int    `json:"winAmount"` // 赢得金额
	HandRank  string `json:"handRank"`  // 获胜牌型
	HoleCards []Card `json:"holeCards"` // 手牌
}

// CreateGameRecord 从游戏状态创建对局记录
func CreateGameRecord(g *Game, winners []PlayerHand, winAmounts []int) *GameRound {
	now := time.Now()
	gameRound := &GameRound{
		RoundID:        now.Format("150405"), // 使用时分秒作为对局ID
		StartTime:      now.Unix(),
		EndTime:        now.Unix(),
		DealerPos:      g.DealerPos,
		SmallBlindPos:  -1, // 这里可以不记录，因为已经结束了
		BigBlindPos:    -1, // 这里可以不记录，因为已经结束了
		Pot:            g.Pot,
		CommunityCards: g.CommunityCards,
		Players:        make([]PlayerRoundInfo, 0),
		Winners:        make([]PlayerWinningInfo, 0),
	}

	// 记录所有玩家信息
	for i, player := range g.Players {
		if !player.IsEmpty() {
			playerInfo := PlayerRoundInfo{
				UserId:     player.UserId,
				Name:       player.Name,
				Position:   i,
				InitChips:  player.Chips, // 这里用最终筹码，因为我们没有记录初始筹码
				FinalChips: player.Chips,
				TotalBet:   player.TotalBet,
				Status:     player.Status,
				HoleCards:  player.HoleCards,
				HandRank:   "",
			}
			if player.HandRank != nil {
				playerInfo.HandRank = GetHandRankName(HandRankType(player.HandRank.Rank))
			}
			gameRound.Players = append(gameRound.Players, playerInfo)
		}
	}

	// 记录获胜者信息
	for i, winner := range winners {
		winnerInfo := PlayerWinningInfo{
			UserId:    winner.Player.UserId,
			Name:      winner.Player.Name,
			Position:  -1, // 先设置为-1，下面会更新
			WinAmount: winAmounts[i],
			HandRank:  GetHandRankName(winner.Hand.Rank),
			HoleCards: winner.Player.HoleCards,
		}

		// 更新位置信息
		for i := range g.Players {
			if g.Players[i].UserId == winner.Player.UserId {
				winnerInfo.Position = i
				break
			}
		}

		gameRound.Winners = append(gameRound.Winners, winnerInfo)
	}

	return gameRound
}

// SaveGameRecord 保存对局记录到文件
func SaveGameRecord(record *GameRound) error {
	if record == nil {
		return nil
	}

	// 创建记录目录
	now := time.Now()
	dateDir := filepath.Join(recordDir, now.Format("2006-01-02"))
	if err := os.MkdirAll(dateDir, 0755); err != nil {
		return fmt.Errorf("创建记录目录失败: %v", err)
	}

	filename := filepath.Join(dateDir, fmt.Sprintf("%s.json", now.Format("150405")))

	// 将记录转换为JSON
	data, err := json.MarshalIndent(record, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化对局记录失败: %v", err)
	}

	// 写入文件
	if err := os.WriteFile(filename, data, 0644); err != nil {
		return fmt.Errorf("写入对局记录失败: %v", err)
	}

	log.Printf("[游戏] 对局记录已保存到文件: %s", filename)
	return nil
}

// GetRecentGameRecords 获取最近的游戏记录
// days 参数指定要获取最近几天的记录，默认为 7 天
// limit 参数指定最多返回多少条记录，默认为 50 条
func GetRecentGameRecords(days int, limit int) ([]*GameRound, error) {
	if days <= 0 {
		days = 7
	}
	if limit <= 0 {
		limit = 50
	}

	log.Printf("[记录] 开始获取最近 %d 天的记录，最多 %d 条", days, limit)

	// 获取当前工作目录
	currentDir, err := os.Getwd()
	if err != nil {
		log.Printf("[记录] 获取工作目录失败: %v", err)
		return nil, fmt.Errorf("获取工作目录失败: %v", err)
	}
	log.Printf("[记录] 当前工作目录: %s", currentDir)

	var allRecords []*GameRound
	now := time.Now()

	// 遍历最近几天的记录
	for i := 0; i < days; i++ {
		date := now.AddDate(0, 0, -i)
		dateDir := filepath.Join(currentDir, recordDir, date.Format("2006-01-02"))
		log.Printf("[记录] 检查日期目录: %s", dateDir)

		// 如果目录不存在，继续下一天
		if _, err := os.Stat(dateDir); os.IsNotExist(err) {
			log.Printf("[记录] 目录不存在: %s", dateDir)
			continue
		}

		// 读取目录下的所有文件
		files, err := os.ReadDir(dateDir)
		if err != nil {
			log.Printf("[警告] 读取记录目录失败: %v", err)
			continue
		}
		log.Printf("[记录] 找到 %d 个文件", len(files))

		// 处理每个记录文件
		for _, file := range files {
			if file.IsDir() || filepath.Ext(file.Name()) != ".json" {
				continue
			}
			filePath := filepath.Join(dateDir, file.Name())
			log.Printf("[记录] 处理文件: %s", filePath)

			// 读取文件内容
			data, err := os.ReadFile(filePath)
			if err != nil {
				log.Printf("[警告] 读取记录文件失败: %v", err)
				continue
			}

			// 解析JSON
			var record GameRound
			if err := json.Unmarshal(data, &record); err != nil {
				log.Printf("[警告] 解析记录文件失败: %v", err)
				continue
			}

			allRecords = append(allRecords, &record)
			log.Printf("[记录] 成功读取记录: %s", record.RoundID)

			// 如果已经达到限制数量，提前返回
			if len(allRecords) >= limit {
				log.Printf("[记录] 已达到限制数量 %d，提前返回", limit)
				return allRecords[:limit], nil
			}
		}
	}

	log.Printf("[记录] 总共读取到 %d 条记录", len(allRecords))
	return allRecords, nil
}
