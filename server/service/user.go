package service

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"
)

// User 用户信息结构
type User struct {
	ID        string    `json:"id"`         // 用户唯一标识
	Name      string    `json:"name"`       // 用户名
	IP        string    `json:"ip"`         // IP地址
	UserAgent string    `json:"user_agent"` // 浏览器信息
	CreatedAt time.Time `json:"created_at"` // 首次访问时间
}

// String 实现 Stringer 接口
func (u *User) String() string {
	// 如果用户有名字，就用名字；否则用 ID 的前 8 位
	name := u.Name
	if name == "" {
		name = u.ID[:8]
	}
	return fmt.Sprintf("%s@%s", name, u.IP)
}

var users = make(map[string]*User)
var dataFile = "users.json"

func init() {
	// 尝试加载已存在的用户数据
	data, err := os.ReadFile(dataFile)
	if err == nil {
		json.Unmarshal(data, &users)
	}
}

// GetUserID 根据IP和UserAgent生成用户ID
func GetUserID(ip, userAgent string) string {
	return fmt.Sprintf("%s:%s", ip, userAgent)
}

// generateInitialName 根据IP和浏览器信息生成初始用户名
func generateInitialName(ip, userAgent string) string {
	// 获取IP的最后一段
	ipParts := strings.Split(ip, ".")
	ipEnd := ipParts[len(ipParts)-1]

	// 获取浏览器类型
	browser := "Unknown"
	if strings.Contains(userAgent, "Chrome") {
		browser = "Chrome"
	} else if strings.Contains(userAgent, "Firefox") {
		browser = "Firefox"
	} else if strings.Contains(userAgent, "Safari") {
		browser = "Safari"
	} else if strings.Contains(userAgent, "Edge") {
		browser = "Edge"
	}

	// 生成形如 "Player_Chrome_192" 的用户名
	return fmt.Sprintf("Player_%s_%s", browser, ipEnd)
}

func GetOrCreateUser(ip, userAgent string) *User {
	id := GetUserID(ip, userAgent)

	if user, ok := users[id]; ok {
		return user
	}

	user := &User{
		ID:        id,
		Name:      generateInitialName(ip, userAgent),
		IP:        ip,
		UserAgent: userAgent,
		CreatedAt: time.Now(),
	}
	users[id] = user
	saveUsers()

	return user
}

// UpdateUserName 更新用户名
func UpdateUserName(id, name string) (*User, error) {
	user, exists := users[id]
	if !exists {
		return nil, fmt.Errorf("user not found")
	}

	user.Name = name
	saveUsers()
	return user, nil
}

// saveUsers 保存用户数据到文件
func saveUsers() {
	if data, err := json.MarshalIndent(users, "", "  "); err == nil {
		os.WriteFile(dataFile, data, 0644)
	}
}
