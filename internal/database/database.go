package database

import (
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// ---- Models ----

type Server struct {
	ID        int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	Name      string    `json:"name" gorm:"not null"`
	Host      string    `json:"host" gorm:"not null"`
	Port      int       `json:"port" gorm:"default:22"`
	GroupID   int64     `json:"group_id" gorm:"default:0;index"`
	Status    string    `json:"status" gorm:"default:unknown"`
	LastCheck time.Time `json:"last_check"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ServerGroup struct {
	ID          int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	Name        string    `json:"name" gorm:"uniqueIndex;not null"`
	Description string    `json:"description"`
	PromptID    int64     `json:"prompt_id" gorm:"default:0"`
	CreatedAt   time.Time `json:"created_at"`
}

type Prompt struct {
	ID        int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	Name      string    `json:"name" gorm:"not null"`
	Content   string    `json:"content" gorm:"not null"`
	Category  string    `json:"category" gorm:"default:general"`
	IsBuiltin bool      `json:"is_builtin" gorm:"default:false"`
	GroupID   int64     `json:"group_id" gorm:"default:0"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type OperationLog struct {
	ID        int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	ServerID  int64     `json:"server_id" gorm:"not null;index"`
	AgentID   string    `json:"agent_id"`
	Action    string    `json:"action" gorm:"not null"`
	ToolName  string    `json:"tool_name"`
	Input     string    `json:"input"`
	Output    string    `json:"output"`
	Status    string    `json:"status" gorm:"default:pending"`
	Duration  int64     `json:"duration_ms" gorm:"column:duration_ms"`
	CreatedAt time.Time `json:"created_at"`
}

type LearningRecord struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	ServerID   int64     `json:"server_id" gorm:"default:0"`
	Problem    string    `json:"problem" gorm:"not null;index"`
	Solution   string    `json:"solution" gorm:"not null"`
	Success    bool      `json:"success" gorm:"default:false"`
	Confidence float64   `json:"confidence" gorm:"default:0.5;index"`
	TimesUsed  int       `json:"times_used" gorm:"default:0"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type Setting struct {
	Key       string    `json:"key" gorm:"primaryKey"`
	Value     string    `json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ---- Database ----

type Database struct {
	db *gorm.DB
}

func New(dbPath string) (*Database, error) {
	gormCfg := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	}

	gdb, err := gorm.Open(sqlite.Open(dbPath+"?_journal_mode=WAL&_busy_timeout=5000"), gormCfg)
	if err != nil {
		return nil, err
	}

	d := &Database{db: gdb}
	if err := d.migrate(); err != nil {
		return nil, err
	}

	return d, nil
}

func (d *Database) Close() error {
	sqlDB, err := d.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

func (d *Database) migrate() error {
	return d.db.AutoMigrate(
		&ServerGroup{},
		&Server{},
		&Prompt{},
		&OperationLog{},
		&LearningRecord{},
		&Setting{},
	)
}

// ---- Server CRUD ----

func (d *Database) CreateServer(s *Server) error {
	return d.db.Create(s).Error
}

func (d *Database) GetServer(id int64) (*Server, error) {
	var s Server
	err := d.db.First(&s, id).Error
	return &s, err
}

func (d *Database) ListServers() ([]Server, error) {
	var servers []Server
	err := d.db.Order("id").Find(&servers).Error
	return servers, err
}

func (d *Database) UpdateServer(s *Server) error {
	return d.db.Save(s).Error
}

func (d *Database) DeleteServer(id int64) error {
	return d.db.Delete(&Server{}, id).Error
}

func (d *Database) UpdateServerStatus(id int64, status string) error {
	return d.db.Model(&Server{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":     status,
		"last_check": time.Now(),
	}).Error
}

// ---- ServerGroup CRUD ----

func (d *Database) CreateGroup(g *ServerGroup) error {
	return d.db.Create(g).Error
}

func (d *Database) GetGroup(id int64) (*ServerGroup, error) {
	var g ServerGroup
	err := d.db.First(&g, id).Error
	return &g, err
}

func (d *Database) ListGroups() ([]ServerGroup, error) {
	var groups []ServerGroup
	err := d.db.Order("id").Find(&groups).Error
	return groups, err
}

func (d *Database) UpdateGroup(g *ServerGroup) error {
	return d.db.Save(g).Error
}

func (d *Database) DeleteGroup(id int64) error {
	return d.db.Delete(&ServerGroup{}, id).Error
}

// ---- Prompt CRUD ----

func (d *Database) CreatePrompt(p *Prompt) error {
	return d.db.Create(p).Error
}

func (d *Database) GetPrompt(id int64) (*Prompt, error) {
	var p Prompt
	err := d.db.First(&p, id).Error
	return &p, err
}

func (d *Database) ListPrompts() ([]Prompt, error) {
	var prompts []Prompt
	err := d.db.Order("id").Find(&prompts).Error
	return prompts, err
}

func (d *Database) UpdatePrompt(p *Prompt) error {
	return d.db.Save(p).Error
}

func (d *Database) DeletePrompt(id int64) error {
	return d.db.Delete(&Prompt{}, id).Error
}

func (d *Database) GetPromptsByGroup(groupID int64) ([]Prompt, error) {
	var prompts []Prompt
	err := d.db.Where("group_id = ? OR group_id = 0", groupID).Order("id").Find(&prompts).Error
	return prompts, err
}

// ---- OperationLog CRUD ----

func (d *Database) CreateOperationLog(l *OperationLog) error {
	return d.db.Create(l).Error
}

func (d *Database) UpdateOperationLog(l *OperationLog) error {
	return d.db.Save(l).Error
}

func (d *Database) ListOperationLogs(serverID int64, limit, offset int) ([]OperationLog, error) {
	var logs []OperationLog
	q := d.db.Order("created_at DESC").Limit(limit).Offset(offset)
	if serverID > 0 {
		q = q.Where("server_id = ?", serverID)
	}
	err := q.Find(&logs).Error
	return logs, err
}

func (d *Database) GetOperationLog(id int64) (*OperationLog, error) {
	var l OperationLog
	err := d.db.First(&l, id).Error
	return &l, err
}

// ---- LearningRecord CRUD ----

func (d *Database) CreateLearningRecord(l *LearningRecord) error {
	return d.db.Create(l).Error
}

func (d *Database) FindSimilarLearning(problem string, limit int) ([]LearningRecord, error) {
	var records []LearningRecord
	err := d.db.Where("success = ? AND problem LIKE ?", true, "%"+problem+"%").
		Order("confidence DESC, times_used DESC").Limit(limit).Find(&records).Error
	return records, err
}

func (d *Database) IncrementLearningUse(id int64) error {
	return d.db.Model(&LearningRecord{}).Where("id = ?", id).
		UpdateColumn("times_used", gorm.Expr("times_used + 1")).Error
}

func (d *Database) ListLearningRecords(limit, offset int) ([]LearningRecord, error) {
	var records []LearningRecord
	err := d.db.Order("confidence DESC, times_used DESC").Limit(limit).Offset(offset).Find(&records).Error
	return records, err
}

func (d *Database) UpdateLearningRecord(l *LearningRecord) error {
	return d.db.Save(l).Error
}

// ---- Settings CRUD ----

func (d *Database) GetSetting(key string) (string, error) {
	var s Setting
	err := d.db.First(&s, "key = ?", key).Error
	if err != nil {
		return "", err
	}
	return s.Value, nil
}

func (d *Database) GetAllSettings() ([]Setting, error) {
	var settings []Setting
	err := d.db.Order("key").Find(&settings).Error
	return settings, err
}

func (d *Database) UpsertSetting(key, value string) error {
	return d.db.Save(&Setting{Key: key, Value: value, UpdatedAt: time.Now()}).Error
}

func (d *Database) UpsertSettings(kvs map[string]string) error {
	return d.db.Transaction(func(tx *gorm.DB) error {
		for k, v := range kvs {
			if err := tx.Save(&Setting{Key: k, Value: v, UpdatedAt: time.Now()}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (d *Database) DeleteSetting(key string) error {
	return d.db.Delete(&Setting{}, "key = ?", key).Error
}

// ---- Stats ----

func (d *Database) GetDashboardStats() (map[string]interface{}, error) {
	stats := map[string]interface{}{}

	var serverCount int64
	d.db.Model(&Server{}).Count(&serverCount)
	stats["server_count"] = serverCount

	var healthyCount int64
	d.db.Model(&Server{}).Where("status = ?", "healthy").Count(&healthyCount)
	stats["healthy_count"] = healthyCount

	var warningCount int64
	d.db.Model(&Server{}).Where("status = ?", "warning").Count(&warningCount)
	stats["warning_count"] = warningCount

	var errorCount int64
	d.db.Model(&Server{}).Where("status = ?", "error").Count(&errorCount)
	stats["error_count"] = errorCount

	var totalOps int64
	d.db.Model(&OperationLog{}).Count(&totalOps)
	stats["total_operations"] = totalOps

	var successOps int64
	d.db.Model(&OperationLog{}).Where("status = ?", "success").Count(&successOps)
	stats["success_operations"] = successOps

	var learningCount int64
	d.db.Model(&LearningRecord{}).Where("success = ?", true).Count(&learningCount)
	stats["learned_solutions"] = learningCount

	return stats, nil
}
