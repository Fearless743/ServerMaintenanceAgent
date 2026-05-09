export interface Server {
  id: number
  name: string
  host: string
  port: number
  group_id: number
  status: "healthy" | "warning" | "error" | "unknown" | "disabled"
  last_check: string
  created_at: string
  updated_at: string
}

export interface ServerGroup {
  id: number
  name: string
  description: string
  prompt_id: number
  created_at: string
}

export interface Prompt {
  id: number
  name: string
  content: string
  category: string
  is_builtin: boolean
  group_id: number
  created_at: string
  updated_at: string
}

export interface OperationLog {
  id: number
  server_id: number
  agent_id: string
  action: string
  tool_name: string
  input: string
  output: string
  status: "pending" | "running" | "success" | "failed"
  duration_ms: number
  created_at: string
}

export interface LearningRecord {
  id: number
  server_id: number
  problem: string
  solution: string
  success: boolean
  confidence: number
  times_used: number
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  server_count: number
  healthy_count: number
  warning_count: number
  error_count: number
  total_operations: number
  success_operations: number
  learned_solutions: number
}

export interface AgentStatus {
  running: boolean
  sub_agents: Record<string, boolean>
  learning: boolean
  model: string
  base_url: string
  api_key: string
}

export interface AIConfig {
  api_key: string
  base_url: string
  model: string
}

export interface WSMessage {
  type: string
  data: unknown
  timestamp: string
}
