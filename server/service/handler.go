package service

import (
	"log"

	"github.com/gin-gonic/gin"
)

type UpdateNameRequest struct {
	Name string `json:"name" binding:"required"`
}

// GetUserHandler 获取用户信息的处理函数
func GetUserHandler(c *gin.Context) {
	ip := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	log.Printf("[API] GetUser - IP: %s, UserAgent: %s", ip, userAgent)

	user := GetOrCreateUser(ip, userAgent)
	log.Printf("[API] GetUser - 用户: %s", user)
	c.JSON(200, user)
}

// UpdateUserNameHandler 更新用户名的处理函数
func UpdateUserNameHandler(c *gin.Context) {
	var req UpdateNameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	ip := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	log.Printf("[API] UpdateUserName - IP: %s, UserAgent: %s", ip, userAgent)

	// 使用相同的方式获取用户
	id := GetUserID(ip, userAgent)
	user, err := UpdateUserName(id, req.Name)
	if err != nil {
		c.JSON(404, gin.H{"error": err.Error()})
		return
	}

	log.Printf("[API] UpdateUserName - 更新后用户: %s", user)
	c.JSON(200, user)
}
