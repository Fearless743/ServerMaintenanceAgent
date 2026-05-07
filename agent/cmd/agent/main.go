package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/Fearless743/ServerMaintenanceAgent/agent/internal/agent"
	"github.com/Fearless743/ServerMaintenanceAgent/agent/internal/config"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

var (
	version   = "0.1.0"
	buildTime = "unknown"
	gitCommit = "unknown"
)

func main() {
	var rootCmd = &cobra.Command{
		Use:   "agent",
		Short: "ServerMaintenanceAgent 子代理",
		Long:  "ServerMaintenanceAgent 的子代理程序，用于收集服务器指标和执行维护任务",
		Run:   runAgent,
	}

	var versionCmd = &cobra.Command{
		Use:   "version",
		Short: "显示版本信息",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Printf("ServerMaintenanceAgent 子代理\n")
			fmt.Printf("版本: %s\n", version)
			fmt.Printf("构建时间: %s\n", buildTime)
			fmt.Printf("Git提交: %s\n", gitCommit)
		},
	}

	var configCmd = &cobra.Command{
		Use:   "config",
		Short: "配置管理",
	}

	var configShowCmd = &cobra.Command{
		Use:   "show",
		Short: "显示当前配置",
		Run: func(cmd *cobra.Command, args []string) {
			cfg, err := config.Load()
			if err != nil {
				logrus.Fatalf("加载配置失败: %v", err)
			}
			fmt.Printf("配置文件: %s\n", cfg.ConfigFile)
			fmt.Printf("服务器URL: %s\n", cfg.ServerURL)
			fmt.Printf("代理ID: %s\n", cfg.AgentID)
			fmt.Printf("指标收集间隔: %d秒\n", cfg.MetricInterval)
		},
	}

	var configInitCmd = &cobra.Command{
		Use:   "init",
		Short: "初始化配置文件",
		Run: func(cmd *cobra.Command, args []string) {
			if err := config.InitConfig(); err != nil {
				logrus.Fatalf("初始化配置失败: %v", err)
			}
			logrus.Info("配置文件已创建: agent.yaml")
		},
	}

	configCmd.AddCommand(configShowCmd, configInitCmd)
	rootCmd.AddCommand(versionCmd, configCmd)

	// 添加命令行标志
	rootCmd.PersistentFlags().StringP("config", "c", "", "配置文件路径")
	rootCmd.PersistentFlags().StringP("server", "s", "", "服务器URL")
	rootCmd.PersistentFlags().StringP("agent-id", "a", "", "代理ID")
	rootCmd.PersistentFlags().BoolP("debug", "d", false, "启用调试模式")

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func runAgent(cmd *cobra.Command, args []string) {
	// 设置日志级别
	debug, _ := cmd.Flags().GetBool("debug")
	if debug {
		logrus.SetLevel(logrus.DebugLevel)
	}

	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		logrus.Fatalf("加载配置失败: %v", err)
	}

	// 覆盖命令行参数
	if server, _ := cmd.Flags().GetString("server"); server != "" {
		cfg.ServerURL = server
	}
	if agentID, _ := cmd.Flags().GetString("agent-id"); agentID != "" {
		cfg.AgentID = agentID
	}

	// 创建代理实例
	agentInstance, err := agent.New(cfg)
	if err != nil {
		logrus.Fatalf("创建代理实例失败: %v", err)
	}

	// 优雅关闭
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// 启动代理
	go func() {
		if err := agentInstance.Start(); err != nil {
			logrus.Fatalf("代理启动失败: %v", err)
		}
	}()

	logrus.Info("代理已启动，按 Ctrl+C 停止")

	// 等待关闭信号
	sig := <-sigChan
	logrus.Infof("收到信号 %v，正在关闭代理...", sig)

	// 停止代理
	if err := agentInstance.Stop(); err != nil {
		logrus.Errorf("代理关闭失败: %v", err)
	}

	logrus.Info("代理已关闭")
}