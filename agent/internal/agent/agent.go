package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"sync"
	"time"

	"github.com/Fearless743/ServerMaintenanceAgent/agent/internal/config"
	"github.com/Fearless743/ServerMaintenanceAgent/agent/internal/metrics"
	"github.com/Fearless743/ServerMaintenanceAgent/agent/internal/executor"
	"github.com/gorilla/websocket"
	"github.com/sirupsen/logrus"
)

type Agent struct {
	config     *config.Config
	conn       *websocket.Conn
	metrics    *metrics.Collector
	executor   *executor.Executor
	ctx        context.Context
	cancel     context.CancelFunc
	wg         sync.WaitGroup
	connected  bool
	mu         sync.RWMutex
}

type Message struct {
	Type      string          `json:"type"`
	Payload   json.RawMessage `json:"payload"`
	Timestamp time.Time       `json:"timestamp"`
}

type HeartbeatMessage struct {
	AgentID   string `json:"agent_id"`
	Status    string `json:"status"`
	Timestamp time.Time `json:"timestamp"`
}

type MetricsMessage struct {
	AgentID   string           `json:"agent_id"`
	Metrics   *metrics.Metrics `json:"metrics"`
	Timestamp time.Time        `json:"timestamp"`
}

type CommandRequest struct {
	CommandID string `json:"command_id"`
	Command   string `json:"command"`
	Timeout   int    `json:"timeout"`
}

type CommandResponse struct {
	CommandID  string `json:"command_id"`
	ExitCode   int    `json:"exit_code"`
	Stdout     string `json:"stdout"`
	Stderr     string `json:"stderr"`
	StartTime  time.Time `json:"start_time"`
	EndTime    time.Time `json:"end_time"`
}

func New(cfg *config.Config) (*Agent, error) {
	ctx, cancel := context.WithCancel(context.Background())

	// 创建指标收集器
	metricsCollector, err := metrics.NewCollector(&cfg.Metrics)
	if err != nil {
		cancel()
		return nil, fmt.Errorf("创建指标收集器失败: %w", err)
	}

	// 创建命令执行器
	commandExecutor := executor.NewExecutor(&cfg.Commands)

	return &Agent{
		config:   cfg,
		metrics:  metricsCollector,
		executor: commandExecutor,
		ctx:      ctx,
		cancel:   cancel,
	}, nil
}

func (a *Agent) Start() error {
	logrus.Info("正在启动代理...")

	// 连接到服务器
	if err := a.connect(); err != nil {
		return fmt.Errorf("连接服务器失败: %w", err)
	}

	// 启动心跳
	a.wg.Add(1)
	go a.heartbeatLoop()

	// 启动指标收集
	a.wg.Add(1)
	go a.metricsLoop()

	// 启动消息处理
	a.wg.Add(1)
	go a.messageLoop()

	logrus.Info("代理已启动")
	return nil
}

func (a *Agent) Stop() error {
	logrus.Info("正在停止代理...")

	// 取消上下文
	a.cancel()

	// 关闭WebSocket连接
	a.mu.Lock()
	if a.conn != nil {
		a.conn.Close()
		a.connected = false
	}
	a.mu.Unlock()

	// 等待所有goroutine结束
	a.wg.Wait()

	logrus.Info("代理已停止")
	return nil
}

func (a *Agent) connect() error {
	serverURL, err := url.Parse(a.config.ServerURL)
	if err != nil {
		return fmt.Errorf("解析服务器URL失败: %w", err)
	}

	// 构建WebSocket URL
	wsURL := url.URL{
		Scheme:   serverURL.Scheme,
		Host:     serverURL.Host,
		Path:     "/ws/agent",
		RawQuery: fmt.Sprintf("agent_id=%s&token=%s", a.config.AgentID, a.config.AuthToken),
	}

	// 连接WebSocket
	conn, _, err := websocket.DefaultDialer.Dial(wsURL.String(), nil)
	if err != nil {
		return fmt.Errorf("WebSocket连接失败: %w", err)
	}

	a.mu.Lock()
	a.conn = conn
	a.connected = true
	a.mu.Unlock()

	logrus.Info("已连接到服务器")

	// 发送注册消息
	if err := a.register(); err != nil {
		return fmt.Errorf("注册代理失败: %w", err)
	}

	return nil
}

func (a *Agent) register() error {
	hostname, err := os.Hostname()
	if err != nil {
		hostname = "unknown"
	}

	registerMsg := map[string]interface{}{
		"agent_id":  a.config.AgentID,
		"hostname":  hostname,
		"version":   "0.1.0",
		"platform":  runtime.GOOS,
		"arch":      runtime.GOARCH,
		"timestamp": time.Now(),
	}

	payload, err := json.Marshal(registerMsg)
	if err != nil {
		return fmt.Errorf("序列化注册消息失败: %w", err)
	}

	msg := Message{
		Type:      "register",
		Payload:   payload,
		Timestamp: time.Now(),
	}

	return a.sendMessage(msg)
}

func (a *Agent) heartbeatLoop() {
	defer a.wg.Done()

	ticker := time.NewTicker(time.Duration(a.config.HeartbeatInterval) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-a.ctx.Done():
			return
		case <-ticker.C:
			if err := a.sendHeartbeat(); err != nil {
				logrus.Errorf("发送心跳失败: %v", err)

				// 尝试重新连接
				if err := a.reconnect(); err != nil {
					logrus.Errorf("重新连接失败: %v", err)
				}
			}
		}
	}
}

func (a *Agent) sendHeartbeat() error {
	a.mu.RLock()
	connected := a.connected
	a.mu.RUnlock()

	if !connected {
		return fmt.Errorf("未连接到服务器")
	}

	heartbeat := HeartbeatMessage{
		AgentID:   a.config.AgentID,
		Status:    "alive",
		Timestamp: time.Now(),
	}

	payload, err := json.Marshal(heartbeat)
	if err != nil {
		return fmt.Errorf("序列化心跳消息失败: %w", err)
	}

	msg := Message{
		Type:      "heartbeat",
		Payload:   payload,
		Timestamp: time.Now(),
	}

	return a.sendMessage(msg)
}

func (a *Agent) metricsLoop() {
	defer a.wg.Done()

	ticker := time.NewTicker(time.Duration(a.config.MetricInterval) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-a.ctx.Done():
			return
		case <-ticker.C:
			if err := a.collectAndSendMetrics(); err != nil {
				logrus.Errorf("收集和发送指标失败: %v", err)
			}
		}
	}
}

func (a *Agent) collectAndSendMetrics() error {
	a.mu.RLock()
	connected := a.connected
	a.mu.RUnlock()

	if !connected {
		return fmt.Errorf("未连接到服务器")
	}

	// 收集指标
	m, err := a.metrics.Collect()
	if err != nil {
		return fmt.Errorf("收集指标失败: %w", err)
	}

	// 发送指标
	metricsMsg := MetricsMessage{
		AgentID:   a.config.AgentID,
		Metrics:   m,
		Timestamp: time.Now(),
	}

	payload, err := json.Marshal(metricsMsg)
	if err != nil {
		return fmt.Errorf("序列化指标消息失败: %w", err)
	}

	msg := Message{
		Type:      "metrics",
		Payload:   payload,
		Timestamp: time.Now(),
	}

	return a.sendMessage(msg)
}

func (a *Agent) messageLoop() {
	defer a.wg.Done()

	for {
		select {
		case <-a.ctx.Done():
			return
		default:
			a.mu.RLock()
			conn := a.conn
			a.mu.RUnlock()

			if conn == nil {
				time.Sleep(time.Second)
				continue
			}

			// 读取消息
			_, message, err := conn.ReadMessage()
			if err != nil {
				logrus.Errorf("读取消息失败: %v", err)

				// 尝试重新连接
				if err := a.reconnect(); err != nil {
					logrus.Errorf("重新连接失败: %v", err)
				}

				time.Sleep(time.Second)
				continue
			}

			// 解析消息
			var msg Message
			if err := json.Unmarshal(message, &msg); err != nil {
				logrus.Errorf("解析消息失败: %v", err)
				continue
			}

			// 处理消息
			a.handleMessage(msg)
		}
	}
}

func (a *Agent) handleMessage(msg Message) {
	logrus.Debugf("收到消息: %s", msg.Type)

	switch msg.Type {
	case "command":
		a.handleCommand(msg)
	case "config_update":
		a.handleConfigUpdate(msg)
	case "restart":
		a.handleRestart(msg)
	case "stop":
		a.handleStop(msg)
	default:
		logrus.Debugf("未知消息类型: %s", msg.Type)
	}
}

func (a *Agent) handleCommand(msg Message) {
	var cmdReq CommandRequest
	if err := json.Unmarshal(msg.Payload, &cmdReq); err != nil {
		logrus.Errorf("解析命令请求失败: %v", err)
		return
	}

	logrus.Infof("执行命令: %s", cmdReq.Command)

	// 执行命令
	startTime := time.Now()
	exitCode, stdout, stderr, err := a.executor.Execute(cmdReq.Command, cmdReq.Timeout)
	endTime := time.Now()

	if err != nil {
		logrus.Errorf("执行命令失败: %v", err)
	}

	// 发送响应
	response := CommandResponse{
		CommandID: cmdReq.CommandID,
		ExitCode:  exitCode,
		Stdout:    stdout,
		Stderr:    stderr,
		StartTime: startTime,
		EndTime:   endTime,
	}

	payload, err := json.Marshal(response)
	if err != nil {
		logrus.Errorf("序列化命令响应失败: %v", err)
		return
	}

	responseMsg := Message{
		Type:      "command_response",
		Payload:   payload,
		Timestamp: time.Now(),
	}

	if err := a.sendMessage(responseMsg); err != nil {
		logrus.Errorf("发送命令响应失败: %v", err)
	}
}

func (a *Agent) handleConfigUpdate(msg Message) {
	// TODO: 实现配置更新逻辑
	logrus.Info("收到配置更新消息")
}

func (a *Agent) handleRestart(msg Message) {
	logrus.Info("收到重启消息，正在重启...")
	a.cancel()
	// TODO: 实现重启逻辑
}

func (a *Agent) handleStop(msg Message) {
	logrus.Info("收到停止消息，正在停止...")
	a.cancel()
}

func (a *Agent) sendMessage(msg Message) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.conn == nil {
		return fmt.Errorf("未连接到服务器")
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("序列化消息失败: %w", err)
	}

	return a.conn.WriteMessage(websocket.TextMessage, data)
}

func (a *Agent) reconnect() error {
	logrus.Info("正在重新连接...")

	a.mu.Lock()
	if a.conn != nil {
		a.conn.Close()
		a.conn = nil
	}
	a.connected = false
	a.mu.Unlock()

	// 等待一段时间后重试
	time.Sleep(time.Second * 5)

	return a.connect()
}