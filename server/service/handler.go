package service

import (
	"github.com/gin-gonic/gin"
)

type UpdateNameRequest struct {
	Name string `json:"name" binding:"required"`
}

// GetUserHandler 获取用户信息的处理函数
func GetUserHandler(c *gin.Context) {
	user := GetOrCreateUser(c.ClientIP(), c.GetHeader("User-Agent"))
	c.JSON(200, user)
}

// UpdateUserNameHandler 更新用户名的处理函数
func UpdateUserNameHandler(c *gin.Context) {
	var req UpdateNameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	// 使用相同的方式获取用户
	id := GetUserID(c.ClientIP(), c.GetHeader("User-Agent"))
	user, err := UpdateUserName(id, req.Name)
	if err != nil {
		c.JSON(404, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, user)
}
