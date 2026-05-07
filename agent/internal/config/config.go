package config

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	ConfigFile      string        `mapstructure:"-"`
	ServerURL       string        `mapstructure:"server_url"`
	AgentID         string        `mapstructure:"agent_id"`
	AuthToken       string        `mapstructure:"auth_token"`
	MetricInterval  int           `mapstructure:"metric_interval"`
	HeartbeatInterval int         `mapstructure:"heartbeat_interval"`
	CommandTimeout  time.Duration `mapstructure:"command_timeout"`
	LogLevel        string        `mapstructure:"log_level"`
	LogFile         string        `mapstructure:"log_file"`
	Metrics         MetricsConfig `mapstructure:"metrics"`
	Commands        CommandsConfig `mapstructure:"commands"`
	Security        SecurityConfig `mapstructure:"security"`
}

type MetricsConfig struct {
	CollectCPU     bool `mapstructure:"collect_cpu"`
	CollectMemory  bool `mapstructure:"collect_memory"`
	CollectDisk    bool `mapstructure:"collect_disk"`
	CollectNetwork bool `mapstructure:"collect_network"`
	CollectProcess bool `mapstructure:"collect_process"`
	CollectLoad    bool `mapstructure:"collect_load"`
	CollectUptime  bool `mapstructure:"collect_uptime"`
}

type CommandsConfig struct {
	Enabled     bool     `mapstructure:"enabled"`
	AllowedShells []string `mapstructure:"allowed_shells"`
	MaxTimeout   int      `mapstructure:"max_timeout"`
	WorkingDir   string   `mapstructure:"working_dir"`
}

type SecurityConfig struct {
	VerifySSL     bool   `mapstructure:"verify_ssl"`
	TLSCertFile   string `mapstructure:"tls_cert_file"`
	TLSKeyFile    string `mapstructure:"tls_key_file"`
	CACertFile    string `mapstructure:"ca_cert_file"`
}

func Load() (*Config, error) {
	// 设置默认值
	setDefaults()

	// 读取配置文件
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("读取配置文件失败: %w", err)
		}
	}

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("解析配置失败: %w", err)
	}

	cfg.ConfigFile = viper.ConfigFileUsed()

	// 验证配置
	if err := validate(&cfg); err != nil {
		return nil, fmt.Errorf("配置验证失败: %w", err)
	}

	return &cfg, nil
}

func setDefaults() {
	// 服务器配置
	viper.SetDefault("server_url", "ws://localhost:3001/ws")
	viper.SetDefault("agent_id", generateAgentID())
	viper.SetDefault("auth_token", "")
	viper.SetDefault("metric_interval", 60)
	viper.SetDefault("heartbeat_interval", 30)
	viper.SetDefault("command_timeout", 300)
	viper.SetDefault("log_level", "info")
	viper.SetDefault("log_file", "")

	// 指标收集配置
	viper.SetDefault("metrics.collect_cpu", true)
	viper.SetDefault("metrics.collect_memory", true)
	viper.SetDefault("metrics.collect_disk", true)
	viper.SetDefault("metrics.collect_network", true)
	viper.SetDefault("metrics.collect_process", true)
	viper.SetDefault("metrics.collect_load", true)
	viper.SetDefault("metrics.collect_uptime", true)

	// 命令执行配置
	viper.SetDefault("commands.enabled", true)
	viper.SetDefault("commands.allowed_shells", []string{"/bin/bash", "/bin/sh"})
	viper.SetDefault("commands.max_timeout", 300)
	viper.SetDefault("commands.working_dir", "/tmp")

	// 安全配置
	viper.SetDefault("security.verify_ssl", true)
	viper.SetDefault("security.tls_cert_file", "")
	viper.SetDefault("security.tls_key_file", "")
	viper.SetDefault("security.ca_cert_file", "")

	// 配置文件
	viper.SetConfigName("agent")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("$HOME/.agent")
	viper.AddConfigPath("/etc/agent")

	// 环境变量
	viper.SetEnvPrefix("AGENT")
	viper.AutomaticEnv()
}

func validate(cfg *Config) error {
	if cfg.ServerURL == "" {
		return fmt.Errorf("服务器URL不能为空")
	}

	if cfg.AgentID == "" {
		return fmt.Errorf("代理ID不能为空")
	}

	if cfg.MetricInterval < 1 {
		return fmt.Errorf("指标收集间隔必须大于0")
	}

	if cfg.HeartbeatInterval < 1 {
		return fmt.Errorf("心跳间隔必须大于0")
	}

	if cfg.Commands.MaxTimeout < 1 {
		return fmt.Errorf("命令超时时间必须大于0")
	}

	return nil
}

func generateAgentID() string {
	hostname, _ := os.Hostname()
	return fmt.Sprintf("agent-%s-%d", hostname, time.Now().UnixNano())
}

func InitConfig() error {
	configDir, _ := os.Getwd()
	configFile := filepath.Join(configDir, "agent.yaml")

	// 检查文件是否存在
	if _, err := os.Stat(configFile); err == nil {
		return fmt.Errorf("配置文件已存在: %s", configFile)
	}

	// 创建默认配置
	defaultConfig := `# ServerMaintenanceAgent 子代理配置

# 服务器连接配置
server_url: "ws://localhost:3001/ws"
agent_id: ""
auth_token: ""

# 指标收集间隔（秒）
metric_interval: 60

# 心跳间隔（秒）
heartbeat_interval: 30

# 命令执行超时（秒）
command_timeout: 300

# 日志配置
log_level: "info"
log_file: ""

# 指标收集配置
metrics:
  collect_cpu: true
  collect_memory: true
  collect_disk: true
  collect_network: true
  collect_process: true
  collect_load: true
  collect_uptime: true

# 命令执行配置
commands:
  enabled: true
  allowed_shells:
    - "/bin/bash"
    - "/bin/sh"
  max_timeout: 300
  working_dir: "/tmp"

# 安全配置
security:
  verify_ssl: true
  tls_cert_file: ""
  tls_key_file: ""
  ca_cert_file: ""
`

	return os.WriteFile(configFile, []byte(defaultConfig), 0644)
}