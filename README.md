# Server Maintenance Agent

AI-driven server maintenance platform with real-time monitoring, automated issue detection, and self-learning capabilities.

## Architecture

- **Backend**: Go (API server + AI agent engine + sub-agents)
- **Frontend**: Next.js 14 (React, TypeScript, Tailwind CSS)
- **Database**: SQLite with WAL mode
- **Communication**: WebSocket for real-time updates
- **AI**: OpenAI API with tool use / function calling

## Features

- 🔍 Real-time server health monitoring
- 🤖 AI-powered issue detection and remediation
- 📋 Custom prompt templates per server group
- 🧠 Learning system that reuses successful solutions
- 📊 Full operation logging and audit trail
- 🛠 Tool use framework for server operations
- 🎨 Modern UI following Vercel/OpenAI design principles

## Quick Start

```bash
docker-compose up -d
```

Access the dashboard at `http://localhost:8080`

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `OPENAI_API_KEY` | - | OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o` | AI model to use |
| `SERVER_PORT` | `8080` | Server port |
| `DB_PATH` | `./data/agent.db` | SQLite database path |
| `CHECK_INTERVAL` | `300s` | Server check interval |
| `LEARNING_ENABLED` | `true` | Enable AI learning |

## Development

```bash
# Backend
go run cmd/server/main.go

# Frontend
cd frontend && npm install && npm run dev

# Sub-agent
go run cmd/subagent/main.go
```

## License

MIT
