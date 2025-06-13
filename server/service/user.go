package service

import (
	"encoding/json"
	"fmt"
	"log"
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
	// 使用规范化后的 IP
	normalizedIP := normalizeIP(u.IP)
	return fmt.Sprintf("%s@%s", name, normalizedIP)
}

var users = make(map[string]*User)
var dataFile = "users.json"

// CleanupUserData 清理和重置用户数据（用于解决历史数据不一致问题）
func CleanupUserData() {
	log.Printf("[用户数据] 清理开始，原有用户数量: %d", len(users))

	// 创建新的用户映射，基于规范化的数据
	newUsers := make(map[string]*User)

	for _, user := range users {
		// 使用规范化的IP重新生成ID
		normalizedIP := normalizeIP(user.IP)
		newID := GetUserID(normalizedIP, user.UserAgent)

		// 更新用户数据
		user.ID = newID
		user.IP = normalizedIP

		// 如果新ID已存在，保留最新的用户数据
		if existingUser, exists := newUsers[newID]; exists {
			if user.CreatedAt.After(existingUser.CreatedAt) {
				newUsers[newID] = user
				log.Printf("[用户数据] 替换重复用户 - 新: %s, 旧: %s", user, existingUser)
			}
		} else {
			newUsers[newID] = user
		}
	}

	users = newUsers
	saveUsers()
	log.Printf("[用户数据] 清理完成，清理后用户数量: %d", len(users))
}

func init() {
	// 尝试加载已存在的用户数据
	data, err := os.ReadFile(dataFile)
	if err == nil {
		json.Unmarshal(data, &users)
		// 清理历史数据以确保一致性
		CleanupUserData()
	}
}

// GetUserID 根据IP和UserAgent生成用户ID
func GetUserID(ip, userAgent string) string {
	// 规范化 IP 地址以确保一致性
	normalizedIP := normalizeIP(ip)
	return fmt.Sprintf("%s:%s", normalizedIP, userAgent)
}

// normalizeIP 规范化 IP 地址
func normalizeIP(ip string) string {
	// 只处理明确的本地地址映射，其他保持原样
	switch ip {
	case "::1":
		return "127.0.0.1" // 将IPv6本地地址统一为IPv4本地地址
	case "localhost":
		return "127.0.0.1"
	default:
		// 对于其他地址，只进行基本清理（移除端口号）
		if strings.Contains(ip, ":") && !strings.Contains(ip, "::") {
			// IPv4 with port，移除端口号
			parts := strings.Split(ip, ":")
			if len(parts) >= 2 {
				return parts[0]
			}
		}
		return ip
	}
}

// generateInitialName 根据IP和浏览器信息生成初始用户名
func generateInitialName(ip, userAgent string) string {
	// 使用规范化后的 IP
	normalizedIP := normalizeIP(ip)

	// 获取IP的最后一段
	var ipEnd string
	if normalizedIP == "127.0.0.1" {
		ipEnd = "local"
	} else if strings.Contains(normalizedIP, ".") {
		// IPv4
		ipParts := strings.Split(normalizedIP, ".")
		ipEnd = ipParts[len(ipParts)-1]
	} else if strings.Contains(normalizedIP, "::") {
		// IPv6
		ipEnd = "v6"
	} else {
		ipEnd = "unknown"
	}

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

// FindUserByUserAgent 根据 UserAgent 查找用户
func FindUserByUserAgent(userAgent string) *User {
	for _, user := range users {
		if user.UserAgent == userAgent {
			return user
		}
	}
	return nil
}

func GetOrCreateUser(ip, userAgent string) *User {
	normalizedIP := normalizeIP(ip)
	id := GetUserID(normalizedIP, userAgent)

	log.Printf("[用户查找] IP: %s -> 规范化IP: %s, UserAgent: %s, ID: %s", ip, normalizedIP, userAgent, id)

	// 首先尝试精确匹配
	if user, ok := users[id]; ok {
		log.Printf("[用户查找] 精确匹配成功 - 用户: %s", user)
		return user
	}

	// 如果精确匹配失败，尝试通过 UserAgent 查找现有用户
	if existingUser := FindUserByUserAgent(userAgent); existingUser != nil {
		log.Printf("[用户查找] 通过UserAgent找到现有用户 - 原用户: %s, 当前请求IP: %s", existingUser, normalizedIP)

		// 更新用户的IP信息为最新的IP
		existingUser.IP = normalizedIP

		// 也在 users map 中用新的 ID 存储这个用户
		users[id] = existingUser
		saveUsers()

		log.Printf("[用户查找] 用户IP已更新 - 更新后用户: %s", existingUser)
		return existingUser
	}

	// 如果没有找到匹配的用户，创建新用户
	user := &User{
		ID:        id,
		Name:      generateInitialName(normalizedIP, userAgent),
		IP:        normalizedIP,
		UserAgent: userAgent,
		CreatedAt: time.Now(),
	}
	users[id] = user
	saveUsers()

	log.Printf("[用户创建] 新用户 - ID: %s, 用户: %s", id, user)
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
