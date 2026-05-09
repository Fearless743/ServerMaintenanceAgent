package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"
)

type Request struct {
	Tool    string            `json:"tool"`
	Command string            `json:"command"`
	Args    map[string]string `json:"args"`
	Timeout int               `json:"timeout"`
}

type Response struct {
	Success bool   `json:"success"`
	Output  string `json:"output"`
	Error   string `json:"error"`
}

func main() {
	port := 9090
	if p := os.Getenv("SUBAGENT_PORT"); p != "" {
		if v, err := strconv.Atoi(p); err == nil {
			port = v
		}
	}

	addr := fmt.Sprintf("0.0.0.0:%d", port)
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatalf("Failed to listen on %s: %v", addr, err)
	}
	defer listener.Close()

	log.Printf("Sub-agent listening on %s (OS: %s/%s)", addr, runtime.GOOS, runtime.GOARCH)

	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		log.Println("Sub-agent shutting down...")
		listener.Close()
	}()

	for {
		conn, err := listener.Accept()
		if err != nil {
			log.Printf("Accept error: %v", err)
			return
		}
		go handleConnection(conn)
	}
}

func handleConnection(conn net.Conn) {
	defer conn.Close()
	log.Printf("Client connected: %s", conn.RemoteAddr())

	for {
		conn.SetReadDeadline(time.Now().Add(300 * time.Second))

		lenBuf := make([]byte, 8)
		if _, err := conn.Read(lenBuf); err != nil {
			return
		}

		reqLen := 0
		for _, b := range lenBuf {
			reqLen = reqLen*10 + int(b-'0')
		}
		if reqLen <= 0 || reqLen > 10*1024*1024 {
			return
		}

		reqBuf := make([]byte, reqLen)
		total := 0
		for total < reqLen {
			n, err := conn.Read(reqBuf[total:])
			if err != nil {
				return
			}
			total += n
		}

		var req Request
		if err := json.Unmarshal(reqBuf[:total], &req); err != nil {
			sendResponse(conn, Response{Success: false, Error: "invalid request: " + err.Error()})
			continue
		}

		resp := processRequest(req)
		sendResponse(conn, resp)
	}
}

func sendResponse(conn net.Conn, resp Response) {
	data, _ := json.Marshal(resp)
	header := fmt.Sprintf("%08d", len(data))
	conn.Write([]byte(header))
	conn.Write(data)
}

func processRequest(req Request) Response {
	timeout := 30 * time.Second
	if req.Timeout > 0 {
		timeout = time.Duration(req.Timeout) * time.Second
	}

	switch req.Tool {
	case "exec_command":
		return execCommand(req.Command, timeout)
	case "check_health":
		return checkHealth(timeout)
	case "get_metrics":
		return getMetrics(timeout)
	case "read_file":
		return readFile(req.Args)
	case "manage_service":
		return manageService(req.Args, timeout)
	case "network_check":
		return networkCheck(req.Args)
	default:
		return Response{Success: false, Error: "unknown tool: " + req.Tool}
	}
}

func execCommand(command string, timeout time.Duration) Response {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, "sh", "-c", command)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return Response{Success: false, Output: string(output), Error: err.Error()}
	}
	return Response{Success: true, Output: string(output)}
}

func checkHealth(timeout time.Duration) Response {
	checks := map[string]string{}
	if out, err := runCmd("cat /proc/loadavg 2>/dev/null || uptime", 5*time.Second); err == nil {
		checks["load"] = strings.TrimSpace(out)
	}
	if out, err := runCmd("free -m 2>/dev/null || cat /proc/meminfo | head -5", 5*time.Second); err == nil {
		checks["memory"] = strings.TrimSpace(out)
	}
	if out, err := runCmd("df -h / 2>/dev/null", 5*time.Second); err == nil {
		checks["disk"] = strings.TrimSpace(out)
	}
	data, _ := json.Marshal(checks)
	return Response{Success: true, Output: string(data)}
}

func getMetrics(timeout time.Duration) Response {
	metrics := map[string]string{}
	if out, err := runCmd("top -bn1 | head -5 2>/dev/null", 5*time.Second); err == nil {
		metrics["cpu"] = strings.TrimSpace(out)
	}
	if out, err := runCmd("free -m 2>/dev/null", 5*time.Second); err == nil {
		metrics["memory"] = strings.TrimSpace(out)
	}
	if out, err := runCmd("df -h 2>/dev/null", 5*time.Second); err == nil {
		metrics["disk"] = strings.TrimSpace(out)
	}
	if out, err := runCmd("ss -tuln 2>/dev/null || netstat -tuln 2>/dev/null", 5*time.Second); err == nil {
		metrics["network"] = strings.TrimSpace(out)
	}
	if out, err := runCmd("ps aux --sort=-%mem | head -10 2>/dev/null", 5*time.Second); err == nil {
		metrics["top_processes"] = strings.TrimSpace(out)
	}
	data, _ := json.Marshal(metrics)
	return Response{Success: true, Output: string(data)}
}

func readFile(args map[string]string) Response {
	path, ok := args["path"]
	if !ok {
		return Response{Success: false, Error: "path is required"}
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return Response{Success: false, Error: err.Error()}
	}
	if len(data) > 1024*1024 {
		data = data[:1024*1024]
	}
	return Response{Success: true, Output: string(data)}
}

func manageService(args map[string]string, timeout time.Duration) Response {
	service, ok := args["service"]
	if !ok {
		return Response{Success: false, Error: "service is required"}
	}
	action, ok := args["action"]
	if !ok {
		return Response{Success: false, Error: "action is required"}
	}
	validActions := map[string]bool{"start": true, "stop": true, "restart": true, "status": true, "enable": true, "disable": true}
	if !validActions[action] {
		return Response{Success: false, Error: "invalid action: " + action}
	}
	cmd := fmt.Sprintf("systemctl %s %s", action, service)
	output, err := runCmd(cmd, timeout)
	if err != nil {
		return Response{Success: false, Output: output, Error: err.Error()}
	}
	return Response{Success: true, Output: output}
}

func networkCheck(args map[string]string) Response {
	host, ok := args["host"]
	if !ok {
		return Response{Success: false, Error: "host is required"}
	}
	port := args["port"]
	if port == "" {
		port = "80"
	}
	addr := net.JoinHostPort(host, port)
	conn, err := net.DialTimeout("tcp", addr, 5*time.Second)
	if err != nil {
		return Response{Success: false, Output: fmt.Sprintf("Cannot reach %s", addr), Error: err.Error()}
	}
	conn.Close()
	return Response{Success: true, Output: fmt.Sprintf("Successfully connected to %s", addr)}
}

func runCmd(command string, timeout time.Duration) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, "sh", "-c", command)
	out, err := cmd.CombinedOutput()
	return string(out), err
}
