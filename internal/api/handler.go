package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"strings"
	"time"

	"github.com/Fearless743/ServerMaintenanceAgent/internal/agent"
	"github.com/Fearless743/ServerMaintenanceAgent/internal/database"
	"github.com/Fearless743/ServerMaintenanceAgent/internal/prompts"
	ws "github.com/Fearless743/ServerMaintenanceAgent/internal/websocket"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/sashabaranov/go-openai"
)

type Handler struct {
	db    *database.Database
	agent *agent.Agent
	hub   *ws.Hub
}

func NewHandler(db *database.Database, ag *agent.Agent, hub *ws.Hub) *Handler {
	return &Handler{db: db, agent: ag, hub: hub}
}

func (h *Handler) Router() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.HandleFunc("/ws", h.hub.HandleWebSocket)

	r.Route("/api", func(r chi.Router) {
		r.Get("/dashboard/stats", h.getDashboardStats)
		r.Get("/agent/status", h.getAgentStatus)

		r.Route("/servers", func(r chi.Router) {
			r.Get("/", h.listServers)
			r.Post("/", h.createServer)
			r.Get("/{id}", h.getServer)
			r.Put("/{id}", h.updateServer)
			r.Delete("/{id}", h.deleteServer)
			r.Post("/{id}/check", h.checkServer)
		})

		r.Route("/groups", func(r chi.Router) {
			r.Get("/", h.listGroups)
			r.Post("/", h.createGroup)
			r.Get("/{id}", h.getGroup)
			r.Put("/{id}", h.updateGroup)
			r.Delete("/{id}", h.deleteGroup)
		})

		r.Route("/prompts", func(r chi.Router) {
			r.Get("/", h.listPrompts)
			r.Post("/", h.createPrompt)
			r.Get("/builtin", h.listBuiltinPrompts)
			r.Get("/{id}", h.getPrompt)
			r.Put("/{id}", h.updatePrompt)
			r.Delete("/{id}", h.deletePrompt)
			r.Post("/seed", h.seedBuiltinPrompts)
		})

		r.Route("/logs", func(r chi.Router) {
			r.Get("/", h.listLogs)
			r.Get("/{id}", h.getLog)
		})

		r.Route("/learning", func(r chi.Router) {
			r.Get("/", h.listLearningRecords)
			r.Post("/{id}/feedback", h.submitFeedback)
		})

		r.Route("/settings", func(r chi.Router) {
			r.Get("/", h.getSettings)
			r.Put("/", h.updateSettings)
			r.Post("/test", h.testAISettings)
		})
	})

	staticDir := "./static"
	if _, err := os.Stat(staticDir); err == nil {
		fileServer := http.FileServer(http.Dir(staticDir))
		r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
			path := filepath.Join(staticDir, r.URL.Path)
			if _, err := os.Stat(path); os.IsNotExist(err) {
				http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
				return
			}
			fileServer.ServeHTTP(w, r)
		})
	}

	return r
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, msg string) {
	respondJSON(w, status, map[string]string{"error": msg})
}

func parseID(r *http.Request, key string) (int64, error) {
	return strconv.ParseInt(chi.URLParam(r, key), 10, 64)
}

func queryInt(r *http.Request, key string, def int) int {
	if v := r.URL.Query().Get(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return def
}

// ---- Dashboard ----

func (h *Handler) getDashboardStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.db.GetDashboardStats()
	if err != nil {
		respondError(w, 500, err.Error())
		return
	}
	respondJSON(w, 200, stats)
}

func (h *Handler) getAgentStatus(w http.ResponseWriter, r *http.Request) {
	status := h.agent.GetStatus()
	respondJSON(w, 200, status)
}

// ---- Servers ----

func (h *Handler) listServers(w http.ResponseWriter, r *http.Request) {
	servers, err := h.db.ListServers()
	if err != nil {
		respondError(w, 500, err.Error())
		return
	}
	respondJSON(w, 200, servers)
}

func (h *Handler) createServer(w http.ResponseWriter, r *http.Request) {
	var s database.Server
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		respondError(w, 400, "invalid request body")
		return
	}
	if err := h.db.CreateServer(&s); err != nil {
		respondError(w, 500, err.Error())
		return
	}
	h.hub.Broadcast("server_created", s)
	respondJSON(w, 201, s)
}

func (h *Handler) getServer(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, 400, "invalid id")
		return
	}
	s, err := h.db.GetServer(id)
	if err != nil {
		respondError(w, 404, "server not found")
		return
	}
	respondJSON(w, 200, s)
}

func (h *Handler) updateServer(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, 400, "invalid id")
		return
	}
	var s database.Server
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		respondError(w, 400, "invalid request body")
		return
	}
	s.ID = id
	if err := h.db.UpdateServer(&s); err != nil {
		respondError(w, 500, err.Error())
		return
	}
	h.hub.Broadcast("server_updated", s)
	respondJSON(w, 200, s)
}

func (h *Handler) deleteServer(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, 400, "invalid id")
		return
	}
	if err := h.db.DeleteServer(id); err != nil {
		respondError(w, 500, err.Error())
		return
	}
	h.hub.Broadcast("server_deleted", map[string]int64{"id": id})
	respondJSON(w, 200, map[string]string{"status": "deleted"})
}

func (h *Handler) checkServer(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, 400, "invalid id")
		return
	}
	if err := h.agent.ManualCheck(id); err != nil {
		respondError(w, 500, err.Error())
		return
	}
	respondJSON(w, 200, map[string]string{"status": "check_triggered"})
}

// ---- Groups ----

func (h *Handler) listGroups(w http.ResponseWriter, r *http.Request) {
	groups, err := h.db.ListGroups()
	if err != nil {
		respondError(w, 500, err.Error())
		return
	}
	respondJSON(w, 200, groups)
}

func (h *Handler) createGroup(w http.ResponseWriter, r *http.Request) {
	var g database.ServerGroup
	if err := json.NewDecoder(r.Body).Decode(&g); err != nil {
		respondError(w, 400, "invalid request body")
		return
	}
	if err := h.db.CreateGroup(&g); err != nil {
		respondError(w, 500, err.Error())
		return
	}
	h.hub.Broadcast("group_created", g)
	respondJSON(w, 201, g)
}

func (h *Handler) getGroup(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, 400, "invalid id")
		return
	}
	g, err := h.db.GetGroup(id)
	if err != nil {
		respondError(w, 404, "group not found")
		return
	}
	respondJSON(w, 200, g)
}

func (h *Handler) updateGroup(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, 400, "invalid id")
		return
	}
	var g database.ServerGroup
	if err := json.NewDecoder(r.Body).Decode(&g); err != nil {
		respondError(w, 400, "invalid request body")
		return
	}
	g.ID = id
	if err := h.db.UpdateGroup(&g); err != nil {
		respondError(w, 500, err.Error())
		return
	}
	h.hub.Broadcast("group_updated", g)
	respondJSON(w, 200, g)
}

func (h *Handler) deleteGroup(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, 400, "invalid id")
		return
	}
	if err := h.db.DeleteGroup(id); err != nil {
		respondError(w, 500, err.Error())
		return
	}
	h.hub.Broadcast("group_deleted", map[string]int64{"id": id})
	respondJSON(w, 200, map[string]string{"status": "deleted"})
}

// ---- Prompts ----

func (h *Handler) listPrompts(w http.ResponseWriter, r *http.Request) {
	p, err := h.db.ListPrompts()
	if err != nil {
		respondError(w, 500, err.Error())
		return
	}
	respondJSON(w, 200, p)
}

func (h *Handler) createPrompt(w http.ResponseWriter, r *http.Request) {
	var p database.Prompt
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		respondError(w, 400, "invalid request body")
		return
	}
	if err := h.db.CreatePrompt(&p); err != nil {
		respondError(w, 500, err.Error())
		return
	}
	respondJSON(w, 201, p)
}

func (h *Handler) getPrompt(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, 400, "invalid id")
		return
	}
	p, err := h.db.GetPrompt(id)
	if err != nil {
		respondError(w, 404, "prompt not found")
		return
	}
	respondJSON(w, 200, p)
}

func (h *Handler) updatePrompt(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, 400, "invalid id")
		return
	}
	var p database.Prompt
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		respondError(w, 400, "invalid request body")
		return
	}
	p.ID = id
	if err := h.db.UpdatePrompt(&p); err != nil {
		respondError(w, 500, err.Error())
		return
	}
	respondJSON(w, 200, p)
}

func (h *Handler) deletePrompt(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, 400, "invalid id")
		return
	}
	if err := h.db.DeletePrompt(id); err != nil {
		respondError(w, 500, err.Error())
		return
	}
	respondJSON(w, 200, map[string]string{"status": "deleted"})
}

func (h *Handler) listBuiltinPrompts(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	bp := prompts.GetBuiltinByCategory(category)
	respondJSON(w, 200, bp)
}

func (h *Handler) seedBuiltinPrompts(w http.ResponseWriter, r *http.Request) {
	for _, bp := range prompts.BuiltinPrompts {
		p := database.Prompt{
			Name:      bp.Name,
			Content:   bp.Content,
			Category:  bp.Category,
			IsBuiltin: true,
		}
		h.db.CreatePrompt(&p)
	}
	respondJSON(w, 200, map[string]string{"status": "seeded", "count": fmt.Sprintf("%d", len(prompts.BuiltinPrompts))})
}

// ---- Logs ----

func (h *Handler) listLogs(w http.ResponseWriter, r *http.Request) {
	serverID := int64(queryInt(r, "server_id", 0))
	limit := queryInt(r, "limit", 50)
	offset := queryInt(r, "offset", 0)
	l, err := h.db.ListOperationLogs(serverID, limit, offset)
	if err != nil {
		respondError(w, 500, err.Error())
		return
	}
	respondJSON(w, 200, l)
}

func (h *Handler) getLog(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, 400, "invalid id")
		return
	}
	l, err := h.db.GetOperationLog(id)
	if err != nil {
		respondError(w, 404, "log not found")
		return
	}
	respondJSON(w, 200, l)
}

// ---- Learning ----

func (h *Handler) listLearningRecords(w http.ResponseWriter, r *http.Request) {
	limit := queryInt(r, "limit", 50)
	offset := queryInt(r, "offset", 0)
	records, err := h.db.ListLearningRecords(limit, offset)
	if err != nil {
		respondError(w, 500, err.Error())
		return
	}
	respondJSON(w, 200, records)
}

func (h *Handler) submitFeedback(w http.ResponseWriter, r *http.Request) {
	_, err := parseID(r, "id")
	if err != nil {
		respondError(w, 400, "invalid id")
		return
	}
	var body struct {
		Success bool `json:"success"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respondError(w, 400, "invalid body")
		return
	}
	respondJSON(w, 200, map[string]string{"status": "feedback recorded"})
}

// ---- Settings ----

var aiSettingKeys = []string{"ai.api_key", "ai.base_url", "ai.model"}

type settingsPayload struct {
	APIKey  string `json:"api_key"`
	BaseURL string `json:"base_url"`
	Model   string `json:"model"`
}

func (h *Handler) getSettings(w http.ResponseWriter, r *http.Request) {
	payload := settingsPayload{
		APIKey:  h.agent.GetAPIKeyMasked(),
		BaseURL: h.agent.GetBaseURL(),
		Model:   h.agent.GetModel(),
	}
	respondJSON(w, 200, payload)
}

func (h *Handler) updateSettings(w http.ResponseWriter, r *http.Request) {
	var body settingsPayload
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respondError(w, 400, "invalid request body")
		return
	}

	body.APIKey = strings.TrimSpace(body.APIKey)
	body.BaseURL = strings.TrimSpace(body.BaseURL)
	body.Model = strings.TrimSpace(body.Model)

	if body.BaseURL == "" {
		respondError(w, 400, "base_url is required")
		return
	}
	if body.Model == "" {
		respondError(w, 400, "model is required")
		return
	}
	if strings.Contains(body.APIKey, "****") {
		current, err := h.db.GetSetting("ai.api_key")
		if err == nil && current != "" {
			body.APIKey = current
		}
	}

	if err := h.db.UpsertSettings(map[string]string{
		"ai.api_key":  body.APIKey,
		"ai.base_url": body.BaseURL,
		"ai.model":    body.Model,
	}); err != nil {
		respondError(w, 500, err.Error())
		return
	}

	h.agent.RebuildClient()
	h.hub.Broadcast("settings_updated", map[string]string{"scope": "ai"})
	respondJSON(w, 200, map[string]string{"status": "saved"})
}

func (h *Handler) testAISettings(w http.ResponseWriter, r *http.Request) {
	var body settingsPayload
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respondError(w, 400, "invalid request body")
		return
	}

	body.APIKey = strings.TrimSpace(body.APIKey)
	body.BaseURL = strings.TrimSpace(body.BaseURL)
	body.Model = strings.TrimSpace(body.Model)

	if body.BaseURL == "" {
		respondError(w, 400, "base_url is required")
		return
	}
	if body.Model == "" {
		respondError(w, 400, "model is required")
		return
	}
	if strings.Contains(body.APIKey, "****") {
		current, err := h.db.GetSetting("ai.api_key")
		if err == nil && current != "" {
			body.APIKey = current
		}
	}

	cfg := openai.DefaultConfig(body.APIKey)
	cfg.BaseURL = body.BaseURL
	client := openai.NewClientWithConfig(cfg)

	ctx := r.Context()
	if ctx == nil {
		ctx = context.Background()
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	resp, err := client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model: body.Model,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleUser, Content: "Reply with exactly: ok"},
		},
		MaxTokens: 16,
	})
	if err != nil {
		respondError(w, 502, fmt.Sprintf("AI test call failed: %v", err))
		return
	}
	if len(resp.Choices) == 0 {
		respondError(w, 502, "AI test call returned no choices")
		return
	}

	respondJSON(w, 200, map[string]string{"status": "ok", "reply": strings.TrimSpace(resp.Choices[0].Message.Content)})
}
