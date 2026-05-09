package subagent

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"sync"
	"time"
)

// SubAgent represents a Go-based agent running on or connecting to a remote server.
// It handles command execution, health checks, and metric collection.
type SubAgent struct {
	Host     string
	Port     int
	Name     string
	Timeout  time.Duration
	conn     net.Conn
	mu       sync.Mutex
	connected bool
}

type CommandRequest struct {
	Tool    string            `json:"tool"`
	Command string            `json:"command"`
	Args    map[string]string `json:"args"`
	Timeout int               `json:"timeout"`
}

type CommandResponse struct {
	Success bool   `json:"success"`
	Output  string `json:"output"`
	Error   string `json:"error"`
}

func New(host string, port int, name string, timeout time.Duration) *SubAgent {
	return &SubAgent{
		Host:    host,
		Port:    port,
		Name:    name,
		Timeout: timeout,
	}
}

func (sa *SubAgent) Connect() error {
	sa.mu.Lock()
	defer sa.mu.Unlock()

	addr := fmt.Sprintf("%s:%d", sa.Host, sa.Port)
	conn, err := net.DialTimeout("tcp", addr, 10*time.Second)
	if err != nil {
		sa.connected = false
		return fmt.Errorf("connect to %s: %w", addr, err)
	}

	sa.conn = conn
	sa.connected = true
	log.Printf("[SubAgent] Connected to %s (%s)", sa.Name, addr)
	return nil
}

func (sa *SubAgent) Disconnect() {
	sa.mu.Lock()
	defer sa.mu.Unlock()

	if sa.conn != nil {
		sa.conn.Close()
		sa.conn = nil
	}
	sa.connected = false
	log.Printf("[SubAgent] Disconnected from %s", sa.Name)
}

func (sa *SubAgent) IsConnected() bool {
	sa.mu.Lock()
	defer sa.mu.Unlock()
	return sa.connected
}

func (sa *SubAgent) sendRequest(req CommandRequest) (*CommandResponse, error) {
	sa.mu.Lock()
	defer sa.mu.Unlock()

	if !sa.connected || sa.conn == nil {
		return nil, fmt.Errorf("not connected to %s", sa.Name)
	}

	sa.conn.SetDeadline(time.Now().Add(sa.Timeout))

	data, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	// Send request with length prefix
	header := fmt.Sprintf("%08d", len(data))
	if _, err := sa.conn.Write([]byte(header)); err != nil {
		sa.connected = false
		return nil, fmt.Errorf("send header: %w", err)
	}
	if _, err := sa.conn.Write(data); err != nil {
		sa.connected = false
		return nil, fmt.Errorf("send data: %w", err)
	}

	// Read response length
	lenBuf := make([]byte, 8)
	if _, err := sa.conn.Read(lenBuf); err != nil {
		return nil, fmt.Errorf("read response length: %w", err)
	}

	respLen := 0
	for _, b := range lenBuf {
		respLen = respLen*10 + int(b-'0')
	}
	if respLen <= 0 || respLen > 10*1024*1024 {
		return nil, fmt.Errorf("invalid response length: %d", respLen)
	}

	respBuf := make([]byte, respLen)
	total := 0
	for total < respLen {
		n, err := sa.conn.Read(respBuf[total:])
		if err != nil {
			return nil, fmt.Errorf("read response: %w", err)
		}
		total += n
	}

	var resp CommandResponse
	if err := json.Unmarshal(respBuf[:total], &resp); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}

	return &resp, nil
}

// ExecuteTool executes a tool on the remote server
func (sa *SubAgent) ExecuteTool(tool, command string, args map[string]string) (string, error) {
	req := CommandRequest{
		Tool:    tool,
		Command: command,
		Args:    args,
		Timeout: int(sa.Timeout.Seconds()),
	}

	resp, err := sa.sendRequest(req)
	if err != nil {
		return "", err
	}

	if !resp.Success {
		return resp.Output, fmt.Errorf("tool execution failed: %s", resp.Error)
	}

	return resp.Output, nil
}

// CollectMetrics gathers system metrics from the server
func (sa *SubAgent) CollectMetrics() (string, error) {
	return sa.ExecuteTool("get_metrics", "", nil)
}

// RunHealthCheck performs a comprehensive health check
func (sa *SubAgent) RunHealthCheck() (string, error) {
	return sa.ExecuteTool("check_health", "", nil)
}

// ExecCommand executes a raw shell command
func (sa *SubAgent) ExecCommand(command string) (string, error) {
	return sa.ExecuteTool("exec_command", command, nil)
}

// ManageService manages a system service
func (sa *SubAgent) ManageService(service, action string) (string, error) {
	return sa.ExecuteTool("manage_service", "", map[string]string{
		"service": service,
		"action":  action,
	})
}
