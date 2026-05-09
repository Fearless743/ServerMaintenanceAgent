# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Go backend
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
COPY --from=frontend-builder /app/frontend/out ./static
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server/main.go
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o subagent ./cmd/subagent/main.go

# Stage 3: Final image
FROM alpine:3.19
RUN apk --no-cache add ca-certificates sqlite-libs

WORKDIR /app
COPY --from=backend-builder /app/server .
COPY --from=backend-builder /app/subagent /usr/local/bin/subagent
COPY --from=backend-builder /app/static ./static

RUN mkdir -p /app/data

EXPOSE 8080 9090

ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=8080
ENV DB_PATH=/app/data/agent.db
ENV GIN_MODE=release

CMD ["./server"]
