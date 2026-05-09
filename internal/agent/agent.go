package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/Fearless743/ServerMaintenanceAgent/internal/config"
	"github.com/Fearless743/ServerMaintenanceAgent/internal/database"
	"github.com/Fearless743/ServerMaintenanceAgent/internal/learning"
	"github.com/Fearless743/ServerMaintenanceAgent/internal/subagent"
	openai "github.com/sashabaranov/go-openai"
)

type EventBroadcaster interface {
	Broadcast(msgType string, data interface{})
}

type Agent struct {
	cfg       *config.Config
	db        *database.Database
	learner   *learning.Learner
	subAgents map[string]*subagent.SubAgent
	broadcast EventBroadcaster
	client    *openai.Client
	mu        sync.RWMutex
	running   bool
	stopCh    chan struct{}
}

func New(cfg *config.Config, db *database.Database, bc EventBroadcaster) *Agent {
	a := &Agent{
		cfg:       cfg,
		db:        db,
		learner:   learning.New(db),
		subAgents: make(map[string]*subagent.SubAgent),
		broadcast: bc,
		stopCh:    make(chan struct{}),
	}
	a.buildClient()
	return a
}

// buildClient reads AI config from DB first, falls back to env config.
func (a *Agent) buildClient() {
	apiKey := a.cfg.OpenAI.APIKey
	baseURL := a.cfg.OpenAI.BaseURL
	model := a.cfg.OpenAI.Model

	if v, err := a.db.GetSetting("ai.api_key"); err == nil && v != "" {
		apiKey = v
	}
	if v, err := a.db.GetSetting("ai.base_url"); err == nil && v != "" {
		baseURL = v
	}
	if v, err := a.db.GetSetting("ai.model"); err == nil && v != "" {
		model = v
	}
	_ = model // model is used during calls, not client construction

	var oc openai.ClientConfig
	if apiKey != "" {
		oc = openai.DefaultConfig(apiKey)
	} else {
		oc = openai.ClientConfig{}
	}
	oc.BaseURL = baseURL
	a.client = openai.NewClientWithConfig(oc)
	log.Printf("[Agent] AI client initialized: base_url=%s model=%s", baseURL, model)
}

// RebuildClient is called after settings are updated to hot-reload the AI client.
func (a *Agent) RebuildClient() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.buildClient()
	a.broadcast.Broadcast("agent_config_updated", map[string]string{"status": "ok"})
	log.Println("[Agent] AI client rebuilt from DB settings")
}

// GetModel returns the current active model name (DB first, env fallback).
func (a *Agent) GetModel() string {
	if v, err := a.db.GetSetting("ai.model"); err == nil && v != "" {
		return v
	}
	return a.cfg.OpenAI.Model
}

// GetBaseURL returns the current active base URL.
func (a *Agent) GetBaseURL() string {
	if v, err := a.db.GetSetting("ai.base_url"); err == nil && v != "" {
		return v
	}
	return a.cfg.OpenAI.BaseURL
}

// GetAPIKeyMasked returns a masked version of the current API key.
func (a *Agent) GetAPIKeyMasked() string {
	key := a.cfg.OpenAI.APIKey
	if v, err := a.db.GetSetting("ai.api_key"); err == nil && v != "" {
		key = v
	}
	if len(key) <= 8 {
		return "***"
	}
	return key[:4] + "****" + key[len(key)-4:]
}

func (a *Agent) Start() {
	a.mu.Lock()
	if a.running {
		a.mu.Unlock()
		return
	}
	a.running = true
	a.mu.Unlock()

	log.Println("[Agent] Starting AI agent engine...")
	go a.monitorLoop()
}

func (a *Agent) Stop() {
	a.mu.Lock()
	defer a.mu.Unlock()
	if !a.running {
		return
	}
	a.running = false
	close(a.stopCh)
	for _, sa := range a.subAgents {
		sa.Disconnect()
	}
	log.Println("[Agent] Agent engine stopped")
}

func (a *Agent) GetStatus() map[string]interface{} {
	a.mu.RLock()
	running := a.running
	subs := make(map[string]bool)
	for k, sa := range a.subAgents {
		subs[k] = sa.IsConnected()
	}
	a.mu.RUnlock()

	return map[string]interface{}{
		"running":     running,
		"sub_agents":  subs,
		"learning":    a.cfg.Agent.LearningEnabled,
		"model":       a.GetModel(),
		"base_url":    a.GetBaseURL(),
		"api_key":     a.GetAPIKeyMasked(),
	}
}

func (a *Agent) ManualCheck(serverID int64) error {
	srv, err := a.db.GetServer(serverID)
	if err != nil {
		return fmt.Errorf("server not found: %w", err)
	}
	go a.checkServer(*srv)
	return nil
}

func (a *Agent) monitorLoop() {
	ticker := time.NewTicker(a.cfg.Agent.CheckInterval)
	defer ticker.Stop()

	a.runScheduledChecks()

	for {
		select {
		case <-a.stopCh:
			return
		case <-ticker.C:
			a.runScheduledChecks()
		}
	}
}

func (a *Agent) runScheduledChecks() {
	servers, err := a.db.ListServers()
	if err != nil {
		log.Printf("[Agent] Error listing servers: %v", err)
		return
	}

	for _, srv := range servers {
		if srv.Status == "disabled" {
			continue
		}
		go a.checkServer(srv)
	}
}

func (a *Agent) checkServer(srv database.Server) {
	start := time.Now()
	a.broadcast.Broadcast("server_check_start", map[string]interface{}{
		"server_id": srv.ID,
		"server":    srv.Name,
	})

	prompts, _ := a.db.GetPromptsByGroup(srv.GroupID)
	systemPrompt := a.buildSystemPrompt(srv, prompts)
	metrics := a.gatherMetrics(srv)

	var learnedContext string
	if a.cfg.Agent.LearningEnabled {
		records, _ := a.learner.FindSolution(metrics)
		if len(records) > 0 {
			learnedContext = "\n\nKnown solutions from previous experience:\n"
			for _, r := range records {
				learnedContext += fmt.Sprintf("- Problem: %s | Solution: %s (confidence: %.1f, used %d times)\n",
					r.Problem, r.Solution, r.Confidence, r.TimesUsed)
			}
		}
	}

	userMsg := fmt.Sprintf("Server: %s (%s:%d)\n\nMetrics and Status:\n%s%s",
		srv.Name, srv.Host, srv.Port, metrics, learnedContext)

	response, err := a.callAI(systemPrompt, userMsg)
	if err != nil {
		log.Printf("[Agent] AI call failed for server %s: %v", srv.Name, err)
		a.broadcast.Broadcast("server_check_error", map[string]interface{}{
			"server_id": srv.ID,
			"error":     err.Error(),
		})
		return
	}

	a.processAIResponse(srv, response, start)
}

func (a *Agent) buildSystemPrompt(srv database.Server, prompts []database.Prompt) string {
	base := fmt.Sprintf(`You are a server maintenance AI agent monitoring server "%s" (%s:%d).
Analyze the provided metrics and determine if any issues exist.
If issues are found, recommend specific actions.
Always respond in JSON format with: {"status":"healthy|warning|error","issues":[],"actions":[],"analysis":""}`, srv.Name, srv.Host, srv.Port)

	for _, p := range prompts {
		base += "\n\n" + p.Content
	}
	return base
}

func (a *Agent) gatherMetrics(srv database.Server) string {
	sa := a.getOrCreateSubAgent(srv)
	if sa == nil || !sa.IsConnected() {
		return fmt.Sprintf(`{"status":"unreachable","error":"cannot connect to %s:%d"}`, srv.Host, srv.Port)
	}

	metrics, err := sa.CollectMetrics()
	if err != nil {
		return fmt.Sprintf(`{"status":"error","error":"%s"}`, err.Error())
	}
	return metrics
}

func (a *Agent) getOrCreateSubAgent(srv database.Server) *subagent.SubAgent {
	a.mu.Lock()
	defer a.mu.Unlock()

	key := fmt.Sprintf("%s:%d", srv.Host, srv.Port)
	if sa, ok := a.subAgents[key]; ok {
		return sa
	}

	sa := subagent.New(srv.Host, srv.Port, srv.Name, a.cfg.SubAgent.CommandTimeout)
	if err := sa.Connect(); err != nil {
		log.Printf("[Agent] Failed to connect sub-agent to %s: %v", key, err)
		return nil
	}
	a.subAgents[key] = sa
	return sa
}

func (a *Agent) callAI(systemPrompt, userMsg string) (string, error) {
	a.mu.RLock()
	client := a.client
	a.mu.RUnlock()

	model := a.GetModel()

	resp, err := client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: model,
			Messages: []openai.ChatCompletionMessage{
				{Role: openai.ChatMessageRoleSystem, Content: systemPrompt},
				{Role: openai.ChatMessageRoleUser, Content: userMsg},
			},
			Temperature: 0.3,
		},
	)
	if err != nil {
		return "", fmt.Errorf("chat completion: %w", err)
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("no response choices returned")
	}

	return resp.Choices[0].Message.Content, nil
}

type AIAnalysis struct {
	Status   string   `json:"status"`
	Issues   []Issue  `json:"issues"`
	Actions  []Action `json:"actions"`
	Analysis string   `json:"analysis"`
}

type Issue struct {
	Severity    string  `json:"severity"`
	Description string  `json:"description"`
	Impact      string  `json:"impact"`
	Confidence  float64 `json:"confidence"`
}

type Action struct {
	Tool    string            `json:"tool"`
	Command string            `json:"command"`
	Args    map[string]string `json:"args"`
	Reason  string            `json:"reason"`
	Risky   bool              `json:"risky"`
}

func (a *Agent) processAIResponse(srv database.Server, response string, start time.Time) {
	var analysis AIAnalysis
	if err := json.Unmarshal([]byte(response), &analysis); err != nil {
		analysis = AIAnalysis{
			Status:   "unknown",
			Analysis: response,
		}
	}

	a.db.UpdateServerStatus(srv.ID, analysis.Status)

	a.broadcast.Broadcast("server_analysis", map[string]interface{}{
		"server_id": srv.ID,
		"server":    srv.Name,
		"status":    analysis.Status,
		"analysis":  analysis.Analysis,
		"issues":    analysis.Issues,
		"actions":   analysis.Actions,
		"timestamp": time.Now(),
	})

	for _, action := range analysis.Actions {
		if action.Risky {
			a.broadcast.Broadcast("action_requires_approval", map[string]interface{}{
				"server_id": srv.ID,
				"action":    action,
			})
			continue
		}
		a.executeAction(srv, action, start)
	}

	if a.cfg.Agent.LearningEnabled && len(analysis.Issues) > 0 {
		for _, issue := range analysis.Issues {
			if issue.Confidence > 0.7 {
				go a.learner.Record(database.LearningRecord{
					ServerID:   srv.ID,
					Problem:    issue.Description,
					Solution:   analysis.Analysis,
					Success:    analysis.Status == "healthy",
					Confidence: issue.Confidence,
				})
			}
		}
	}
}

func (a *Agent) executeAction(srv database.Server, action Action, start time.Time) {
	logEntry := &database.OperationLog{
		ServerID: srv.ID,
		Action:   action.Reason,
		ToolName: action.Tool,
		Input:    action.Command,
		Status:   "running",
	}
	a.db.CreateOperationLog(logEntry)

	a.broadcast.Broadcast("action_start", map[string]interface{}{
		"log_id":    logEntry.ID,
		"server_id": srv.ID,
		"tool":      action.Tool,
		"command":   action.Command,
	})

	sa := a.getOrCreateSubAgent(srv)
	if sa == nil {
		logEntry.Status = "failed"
		logEntry.Output = "sub-agent not connected"
		logEntry.Duration = time.Since(start).Milliseconds()
		a.db.UpdateOperationLog(logEntry)
		return
	}

	output, err := sa.ExecuteTool(action.Tool, action.Command, action.Args)
	duration := time.Since(start).Milliseconds()

	logEntry.Duration = duration
	if err != nil {
		logEntry.Status = "failed"
		logEntry.Output = err.Error()
	} else {
		logEntry.Status = "success"
		logEntry.Output = output
	}
	a.db.UpdateOperationLog(logEntry)

	a.broadcast.Broadcast("action_complete", map[string]interface{}{
		"log_id":    logEntry.ID,
		"server_id": srv.ID,
		"status":    logEntry.Status,
		"output":    logEntry.Output,
		"duration":  duration,
	})
}
