package executor

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"github.com/Fearless743/ServerMaintenanceAgent/agent/internal/config"
)

type Executor struct {
	config *config.CommandsConfig
}

func NewExecutor(config *config.CommandsConfig) *Executor {
	return &Executor{
		config: config,
	}
}

func (e *Executor) Execute(command string, timeout int) (int, string, string, error) {
	if !e.config.Enabled {
		return -1, "", "", fmt.Errorf("命令执行已禁用")
	}

	// 验证命令
	if err := e.validateCommand(command); err != nil {
		return -1, "", "", fmt.Errorf("命令验证失败: %w", err)
	}

	// 设置超时
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeout)*time.Second)
	defer cancel()

	// 创建命令
	cmd := exec.CommandContext(ctx, "/bin/bash", "-c", command)

	// 设置工作目录
	if e.config.WorkingDir != "" {
		cmd.Dir = e.config.WorkingDir
	}

	// 设置环境变量
	cmd.Env = append(cmd.Environ(), "LANG=en_US.UTF-8")

	// 创建缓冲区
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	// 执行命令
	err := cmd.Run()

	// 获取退出码
	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			exitCode = -1
		}
	}

	return exitCode, stdout.String(), stderr.String(), err
}

func (e *Executor) validateCommand(command string) error {
	// 检查命令是否为空
	if strings.TrimSpace(command) == "" {
		return fmt.Errorf("命令不能为空")
	}

	// 检查命令长度
	if len(command) > 10000 {
		return fmt.Errorf("命令过长")
	}

	// 检查危险命令
	dangerousCommands := []string{
		"rm -rf /",
		"rm -rf /*",
		"mkfs",
		"dd if=",
		"> /dev/sda",
		"chmod 777 /",
		"chown root",
		"wget",
		"curl",
		"nc -l",
	}

	lowerCommand := strings.ToLower(command)
	for _, dangerous := range dangerousCommands {
		if strings.Contains(lowerCommand, dangerous) {
			return fmt.Errorf("危险命令被禁止: %s", dangerous)
		}
	}

	// 检查Shell是否允许
	shell := "/bin/bash"
	if !e.isShellAllowed(shell) {
		return fmt.Errorf("Shell不允许: %s", shell)
	}

	return nil
}

func (e *Executor) isShellAllowed(shell string) bool {
	for _, allowed := range e.config.AllowedShells {
		if shell == allowed {
			return true
		}
	}
	return false
}

func (e *Executor) ExecuteWithOutput(command string, timeout int) (int, string, string, error) {
	return e.Execute(command, timeout)
}

func (e *Executor) ExecuteAsync(command string, timeout int) (<-chan int, <-chan string, <-chan string, <-chan error) {
	exitCodeChan := make(chan int, 1)
	stdoutChan := make(chan string, 1)
	stderrChan := make(chan string, 1)
	errChan := make(chan error, 1)

	go func() {
		exitCode, stdout, stderr, err := e.Execute(command, timeout)
		exitCodeChan <- exitCode
		stdoutChan <- stdout
		stderrChan <- stderr
		errChan <- err
	}()

	return exitCodeChan, stdoutChan, stderrChan, errChan
}

func (e *Executor) TestCommand(command string) error {
	// 测试命令是否可以执行
	cmd := exec.Command("/bin/bash", "-c", "which "+command)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("命令不可用: %s", command)
	}
	return nil
}

func (e *Executor) GetCommandInfo(command string) map[string]interface{} {
	info := make(map[string]interface{})
	info["command"] = command
	info["shell"] = "/bin/bash"
	info["working_dir"] = e.config.WorkingDir
	info["timeout"] = e.config.MaxTimeout
	info["enabled"] = e.config.Enabled
	return info
}