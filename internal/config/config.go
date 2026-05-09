package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	OpenAI   OpenAIConfig
	Agent    AgentConfig
	SubAgent SubAgentConfig
}

type ServerConfig struct {
	Host         string
	Port         int
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
}

type DatabaseConfig struct {
	Path string
}

type OpenAIConfig struct {
	APIKey  string
	Model   string
	BaseURL string
}

type AgentConfig struct {
	CheckInterval   time.Duration
	MaxConcurrent   int
	LearningEnabled bool
}

type SubAgentConfig struct {
	MaxRetries     int
	CommandTimeout time.Duration
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Host:         getEnv("SERVER_HOST", "0.0.0.0"),
			Port:         getEnvInt("SERVER_PORT", 8080),
			ReadTimeout:  30 * time.Second,
			WriteTimeout: 30 * time.Second,
		},
		Database: DatabaseConfig{
			Path: getEnv("DB_PATH", "./data/agent.db"),
		},
		OpenAI: OpenAIConfig{
			APIKey:  getEnv("OPENAI_API_KEY", ""),
			Model:   getEnv("OPENAI_MODEL", "gpt-4o"),
			BaseURL: getEnv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
		},
		Agent: AgentConfig{
			CheckInterval:   parseDuration(getEnv("CHECK_INTERVAL", "300s")),
			MaxConcurrent:   getEnvInt("MAX_CONCURRENT", 5),
			LearningEnabled: getEnvBool("LEARNING_ENABLED", true),
		},
		SubAgent: SubAgentConfig{
			MaxRetries:     getEnvInt("SUBAGENT_MAX_RETRIES", 3),
			CommandTimeout: parseDuration(getEnv("SUBAGENT_CMD_TIMEOUT", "60s")),
		},
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	if v := os.Getenv(key); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return fallback
}

func parseDuration(s string) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		return 5 * time.Minute
	}
	return d
}
