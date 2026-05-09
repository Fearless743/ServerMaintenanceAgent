package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/Fearless743/ServerMaintenanceAgent/internal/agent"
	"github.com/Fearless743/ServerMaintenanceAgent/internal/api"
	"github.com/Fearless743/ServerMaintenanceAgent/internal/config"
	"github.com/Fearless743/ServerMaintenanceAgent/internal/database"
	ws "github.com/Fearless743/ServerMaintenanceAgent/internal/websocket"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("🚀 Server Maintenance Agent starting...")

	cfg := config.Load()

	// Initialize database
	db, err := database.New(cfg.Database.Path)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()
	log.Println("✅ Database initialized")

	// Seed built-in prompts
	seedBuiltinPrompts(db)

	// Initialize WebSocket hub
	hub := ws.NewHub()
	go hub.Run()
	log.Println("✅ WebSocket hub started")

	// Initialize AI agent
	ag := agent.New(cfg, db, hub)
	ag.Start()
	log.Println("✅ AI agent engine started")

	// Initialize API handler
	handler := api.NewHandler(db, ag, hub)
	router := handler.Router()

	// Start HTTP server
	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		sig := <-sigCh
		log.Printf("Received signal %v, shutting down...", sig)
		ag.Stop()
		srv.Close()
	}()

	log.Printf("🌐 Server listening on %s", addr)
	log.Printf("📡 WebSocket endpoint: ws://%s/ws", addr)
	log.Printf("📋 API endpoint: http://%s/api", addr)

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}

	log.Println("Server stopped")
}

func seedBuiltinPrompts(db *database.Database) {
	prompts, err := db.ListPrompts()
	if err != nil || len(prompts) > 0 {
		return
	}
	log.Println("📦 Seeding built-in prompts...")
	builtins := []struct {
		Name     string
		Category string
		Content  string
	}{
		{"system-maintenance-agent", "system", "You are an expert server maintenance AI agent. Monitor server health, detect issues, execute remediation, and learn from operations."},
		{"problem-detection", "detection", "Identify server issues: critical problems, warnings, performance degradation, security concerns. Prioritize by severity and impact."},
		{"solution-generator", "remediation", "Generate step-by-step remediation solutions. Prefer non-destructive fixes, create backups, verify fixes, and record outcomes."},
		{"log-analysis", "analysis", "Analyze system logs for error patterns, security incidents, performance bottlenecks, and failure predictions."},
		{"tool-use-orchestrator", "orchestration", "Manage server tools: exec_command, check_health, read_file, write_file, manage_service, network_check, get_metrics. Chain tools logically."},
		{"learning-feedback", "learning", "After operations, evaluate problem signature, solution, outcome, effectiveness, side effects, and improvements for future reuse."},
		{"scheduled-check", "scheduler", "Perform routine health checks: CPU, memory, disk, network, services, backups, security. Generate summary report."},
		{"emergency-response", "emergency", "Emergency mode: Assess scope, contain issues, alert operator, remediate with learned solutions, verify fix, document everything."},
	}
	for _, b := range builtins {
		p := &database.Prompt{
			Name:      b.Name,
			Content:   b.Content,
			Category:  b.Category,
			IsBuiltin: true,
		}
		if err := db.CreatePrompt(p); err != nil {
			log.Printf("Warning: failed to seed prompt %s: %v", b.Name, err)
		}
	}
	log.Printf("✅ Seeded %d built-in prompts", len(builtins))
}
