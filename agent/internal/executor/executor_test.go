package executor

import (
	"testing"

	"github.com/Fearless743/ServerMaintenanceAgent/agent/internal/config"
)

func TestNewExecutor(t *testing.T) {
	cfg := &config.CommandsConfig{
		Enabled:       true,
		AllowedShells: []string{"/bin/bash", "/bin/sh"},
		MaxTimeout:    300,
		WorkingDir:    "/tmp",
	}

	executor := NewExecutor(cfg)
	if executor == nil {
		t.Fatal("执行器不应为nil")
	}
}

func TestExecutor_Execute(t *testing.T) {
	cfg := &config.CommandsConfig{
		Enabled:       true,
		AllowedShells: []string{"/bin/bash", "/bin/sh"},
		MaxTimeout:    300,
		WorkingDir:    "/tmp",
	}

	executor := NewExecutor(cfg)

	tests := []struct {
		name     string
		command  string
		timeout  int
		wantCode int
		wantErr  bool
	}{
		{
			name:     "成功执行简单命令",
			command:  "echo 'hello'",
			timeout:  10,
			wantCode: 0,
			wantErr:  false,
		},
		{
			name:     "执行失败的命令",
			command:  "exit 1",
			timeout:  10,
			wantCode: 1,
			wantErr:  false,
		},
		{
			name:     "超时命令",
			command:  "sleep 10",
			timeout:  1,
			wantCode: -1,
			wantErr:  true,
		},
		{
			name:     "空命令",
			command:  "",
			timeout:  10,
			wantCode: -1,
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			exitCode, stdout, stderr, err := executor.Execute(tt.command, tt.timeout)

			if tt.wantErr {
				if err == nil {
					t.Error("期望错误，但没有错误")
				}
				return
			}

			if err != nil {
				t.Fatalf("执行命令失败: %v", err)
			}

			if exitCode != tt.wantCode {
				t.Errorf("退出码 = %d, 期望 %d", exitCode, tt.wantCode)
			}

			if tt.command == "echo 'hello'" && stdout != "hello\n" {
				t.Errorf("标准输出 = %q, 期望 %q", stdout, "hello\n")
			}

			_ = stderr
		})
	}
}

func TestExecutor_ExecuteDisabled(t *testing.T) {
	cfg := &config.CommandsConfig{
		Enabled:       false,
		AllowedShells: []string{"/bin/bash", "/bin/sh"},
		MaxTimeout:    300,
		WorkingDir:    "/tmp",
	}

	executor := NewExecutor(cfg)

	_, _, _, err := executor.Execute("echo 'hello'", 10)
	if err == nil {
		t.Error("期望错误，但没有错误")
	}
}

func TestExecutor_ValidateCommand(t *testing.T) {
	cfg := &config.CommandsConfig{
		Enabled:       true,
		AllowedShells: []string{"/bin/bash", "/bin/sh"},
		MaxTimeout:    300,
		WorkingDir:    "/tmp",
	}

	executor := NewExecutor(cfg)

	tests := []struct {
		name    string
		command string
		wantErr bool
	}{
		{
			name:    "有效命令",
			command: "ls -la",
			wantErr: false,
		},
		{
			name:    "危险命令",
			command: "rm -rf /",
			wantErr: true,
		},
		{
			name:    "空命令",
			command: "",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := executor.validateCommand(tt.command)

			if tt.wantErr {
				if err == nil {
					t.Error("期望错误，但没有错误")
				}
			} else {
				if err != nil {
					t.Errorf("验证命令失败: %v", err)
				}
			}
		})
	}
}

func TestExecutor_GetCommandInfo(t *testing.T) {
	cfg := &config.CommandsConfig{
		Enabled:       true,
		AllowedShells: []string{"/bin/bash", "/bin/sh"},
		MaxTimeout:    300,
		WorkingDir:    "/tmp",
	}

	executor := NewExecutor(cfg)

	info := executor.GetCommandInfo("ls -la")

	if info["command"] != "ls -la" {
		t.Errorf("命令 = %v, 期望 ls -la", info["command"])
	}

	if info["shell"] != "/bin/bash" {
		t.Errorf("Shell = %v, 期望 /bin/bash", info["shell"])
	}

	if info["working_dir"] != "/tmp" {
		t.Errorf("工作目录 = %v, 期望 /tmp", info["working_dir"])
	}

	if info["timeout"] != 300 {
		t.Errorf("超时 = %v, 期望 300", info["timeout"])
	}

	if info["enabled"] != true {
		t.Errorf("启用状态 = %v, 期望 true", info["enabled"])
	}
}