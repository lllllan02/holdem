package service

import "path/filepath"

// 数据存储相关常量
var (
	dataDir    = "data"                               // 数据根目录
	dataFile   = filepath.Join(dataDir, "users.json") // 用户数据文件
	avatarsDir = filepath.Join(dataDir, "avatars")    // 头像存储目录
)
