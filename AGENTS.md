# Repository Guidelines

## Project Structure & Module Organization

Go backend + Next.js frontend monorepo.

```
├── cmd/server/           # HTTP API server entry point
├── cmd/subagent/         # Sub-agent process entry point
├── internal/
│   ├── agent/            # Core agent orchestration
│   ├── api/              # HTTP route handlers (Chi)
│   ├── config/           # Environment config loader
│   ├── database/         # SQLite data access layer
│   ├── learning/         # Learning/training module
│   ├── prompts/          # AI prompt templates
│   ├── servergroup/      # Server group management
│   ├── subagent/         # Sub-agent scheduling logic
│   └── websocket/        # WebSocket hub (Gorilla)
├── frontend/             # Next.js 14 (React, TypeScript, Tailwind)
├── Dockerfile
└── docker-compose.yml
```

All backend business logic lives under `internal/`. Never put application code in `cmd/`.

## Build, Test, and Development Commands

```bash
# Backend
go run ./cmd/server        # Run API server
go build ./cmd/server      # Compile binary
go test ./...              # Run all tests
go vet ./...               # Static analysis

# Frontend
cd frontend && npm install
npm run dev                # Dev server on localhost:3000
npm run build              # Production build
npm run lint               # ESLint

# Full-stack
docker compose up --build
```

## Coding Style & Naming Conventions

- **Go**: `gofmt` formatted. Packages lowercase. Exported = PascalCase, unexported = camelCase.
- **TypeScript**: Lint with `next lint`. Components PascalCase, utilities camelCase. Prefer named exports.
- **Indentation**: Tabs in Go; 2 spaces in TypeScript/CSS.
- **Config**: Secrets in `.env` only — never commit. Use `.env.example` as template.

## Testing Guidelines

- **Go**: `*_test.go` alongside source. Standard `testing` package. Run: `go test ./...`.
- **Frontend**: `*.test.tsx` next to component or in `__tests__/`. Run: `npm test`.
- Write tests for new logic and bug fixes. Cover edge cases.

## Commit & Pull Request Guidelines

- **Commits**: `<type>: <description>` — types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`.
- **PRs**: Clear description, reference issues (e.g. `Closes #12`), screenshots for UI changes. One concern per PR.

## Security & Configuration Tips

- Never commit `.env` or API keys. `.gitignore` covers common cases.
- OpenAI API key required — see `.env.example`.
- SQLite files are local and git-ignored.
