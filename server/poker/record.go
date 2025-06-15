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

// GetGameRecords 获取指定日期的所有对局记录
func GetGameRecords(date time.Time) ([]*GameRound, error) {
	dateDir := filepath.Join(recordDir, date.Format("2006-01-02"))

	// 如果目录不存在，返回空记录
	if _, err := os.Stat(dateDir); os.IsNotExist(err) {
		return []*GameRound{}, nil
	}

	// 读取目录下的所有文件
	files, err := os.ReadDir(dateDir)
	if err != nil {
		return nil, fmt.Errorf("读取记录目录失败: %v", err)
	}

	var records []*GameRound
	for _, file := range files {
		if file.IsDir() || filepath.Ext(file.Name()) != ".json" {
			continue
		}

		// 读取文件内容
		data, err := os.ReadFile(filepath.Join(dateDir, file.Name()))
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

		records = append(records, &record)
	}

	return records, nil
}
