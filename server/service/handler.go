package service

import (
	"fmt"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lllllan02/holdem/poker"
)

type UpdateNameRequest struct {
	Name string `json:"name" binding:"required"`
}

type GetGameRecordsRequest struct {
	Days  int `form:"days"`  // 查询最近几天的记录
	Limit int `form:"limit"` // 限制返回的记录数量
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

// UpdateUserAvatarHandler 更新用户头像的处理函数
func UpdateUserAvatarHandler(c *gin.Context) {
	ip := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	log.Printf("[API] UpdateUserAvatar - IP: %s, UserAgent: %s", ip, userAgent)

	// 获取用户ID
	id := GetUserID(ip, userAgent)
	log.Printf("[API] UpdateUserAvatar - 用户ID: %s", id)

	// 获取上传的文件
	file, err := c.FormFile("avatar")
	if err != nil {
		log.Printf("[API] UpdateUserAvatar - 获取文件失败: %v", err)
		c.JSON(400, gin.H{"error": "No file uploaded"})
		return
	}
	log.Printf("[API] UpdateUserAvatar - 文件名: %s, 大小: %d bytes", file.Filename, file.Size)

	// 验证文件类型
	if !isValidImageFile(file) {
		log.Printf("[API] UpdateUserAvatar - 无效的文件类型: %s", filepath.Ext(file.Filename))
		c.JSON(400, gin.H{"error": "Invalid file type. Only images are allowed"})
		return
	}

	// 保存文件
	if err := saveAvatarFile(id, file, c); err != nil {
		log.Printf("[API] UpdateUserAvatar - 保存文件失败: %v", err)
		c.JSON(500, gin.H{"error": "Failed to save avatar"})
		return
	}

	// 获取用户信息
	user := GetOrCreateUser(ip, userAgent)
	c.JSON(200, user)
}

// isValidImageFile 检查文件是否为有效的图片文件
func isValidImageFile(file *multipart.FileHeader) bool {
	// 获取文件扩展名
	ext := strings.ToLower(filepath.Ext(file.Filename))
	// 允许的图片扩展名
	validExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
	}
	return validExts[ext]
}

// saveAvatarFile 保存头像文件
func saveAvatarFile(userID string, file *multipart.FileHeader, c *gin.Context) error {
	// 获取项目根目录（从当前工作目录向上两级）
	currentDir, err := os.Getwd()
	if err != nil {
		log.Printf("[API] saveAvatarFile - 获取工作目录失败: %v", err)
		return fmt.Errorf("failed to get current directory: %v", err)
	}

	// 如果当前在 server 目录，需要回到项目根目录
	if strings.HasSuffix(currentDir, "server") {
		currentDir = filepath.Dir(currentDir)
	} else if strings.HasSuffix(currentDir, "service") {
		// 如果在 service 目录，需要回到项目根目录
		currentDir = filepath.Dir(filepath.Dir(currentDir))
	}
	log.Printf("[API] saveAvatarFile - 项目根目录: %s", currentDir)

	// 创建用户专属的头像目录
	uploadDir := filepath.Join(currentDir, "uploads", "avatars", userID)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Printf("[API] saveAvatarFile - 创建目录失败: %v", err)
		return fmt.Errorf("failed to create upload directory: %v", err)
	}
	log.Printf("[API] saveAvatarFile - 上传目录: %s", uploadDir)

	// 获取文件扩展名并确保是小写
	ext := strings.ToLower(filepath.Ext(file.Filename))
	// 使用 avatar 作为固定文件名
	filename := fmt.Sprintf("avatar%s", ext)
	// 完整的文件路径
	filePath := filepath.Join(uploadDir, filename)
	log.Printf("[API] saveAvatarFile - 文件将保存到: %s", filePath)

	// 如果存在旧文件，先删除目录下的所有文件
	files, err := os.ReadDir(uploadDir)
	if err == nil {
		for _, f := range files {
			oldPath := filepath.Join(uploadDir, f.Name())
			if err := os.Remove(oldPath); err != nil {
				log.Printf("[API] saveAvatarFile - 删除旧文件失败: %v", err)
				return fmt.Errorf("failed to remove old file: %v", err)
			}
			log.Printf("[API] saveAvatarFile - 已删除旧文件: %s", oldPath)
		}
	}

	// 保存文件
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		log.Printf("[API] saveAvatarFile - 保存文件失败: %v", err)
		return fmt.Errorf("failed to save file: %v", err)
	}

	// 验证文件是否成功保存
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		log.Printf("[API] saveAvatarFile - 文件保存失败，文件不存在: %s", filePath)
		return fmt.Errorf("file was not saved successfully")
	}
	log.Printf("[API] saveAvatarFile - 文件保存成功")

	return nil
}

// GetAvatarHandler 获取用户头像的处理函数
func GetAvatarHandler(c *gin.Context) {
	userId := c.Param("userId")
	if userId == "" {
		c.JSON(400, gin.H{"error": "User ID is required"})
		return
	}

	avatarPath, err := GetUserAvatar(userId)
	if err != nil {
		log.Printf("[API] GetAvatar - 获取头像失败: %v", err)
		c.JSON(404, gin.H{"error": "Avatar not found"})
		return
	}

	c.File(avatarPath)
}

// GetGameRecordsHandler 获取历史对局记录的处理函数
func GetGameRecordsHandler(c *gin.Context) {
	var req GetGameRecordsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request parameters"})
		return
	}

	log.Printf("[API] GetGameRecords - 请求参数: days=%d, limit=%d", req.Days, req.Limit)

	// 获取历史对局记录
	records, err := poker.GetRecentGameRecords(req.Days, req.Limit)
	if err != nil {
		log.Printf("[API] GetGameRecords - 获取记录失败: %v", err)
		c.JSON(500, gin.H{"error": "Failed to get game records"})
		return
	}

	log.Printf("[API] GetGameRecords - 获取到 %d 条记录", len(records))
	c.JSON(200, gin.H{
		"total":   len(records),
		"records": records,
	})
}
