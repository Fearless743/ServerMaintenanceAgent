const API_BASE = typeof window !== "undefined" 
  ? `${window.location.protocol}//${window.location.hostname}:8080/api`
  : "http://localhost:8080/api"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || "Request failed")
  }
  return res.json()
}

export const api = {
  dashboard: {
    stats: () => request<import("../types").DashboardStats>("/dashboard/stats"),
    agentStatus: () => request<import("../types").AgentStatus>("/agent/status"),
  },
  servers: {
    list: () => request<import("../types").Server[]>("/servers"),
    get: (id: number) => request<import("../types").Server>(`/servers/${id}`),
    create: (data: Partial<import("../types").Server>) => request<import("../types").Server>("/servers", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<import("../types").Server>) => request<import("../types").Server>(`/servers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<{ status: string }>(`/servers/${id}`, { method: "DELETE" }),
    check: (id: number) => request<{ status: string }>(`/servers/${id}/check`, { method: "POST" }),
  },
  groups: {
    list: () => request<import("../types").ServerGroup[]>("/groups"),
    get: (id: number) => request<import("../types").ServerGroup>(`/groups/${id}`),
    create: (data: Partial<import("../types").ServerGroup>) => request<import("../types").ServerGroup>("/groups", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<import("../types").ServerGroup>) => request<import("../types").ServerGroup>(`/groups/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<{ status: string }>(`/groups/${id}`, { method: "DELETE" }),
  },
  prompts: {
    list: () => request<import("../types").Prompt[]>("/prompts"),
    get: (id: number) => request<import("../types").Prompt>(`/prompts/${id}`),
    create: (data: Partial<import("../types").Prompt>) => request<import("../types").Prompt>("/prompts", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<import("../types").Prompt>) => request<import("../types").Prompt>(`/prompts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<{ status: string }>(`/prompts/${id}`, { method: "DELETE" }),
    builtin: () => request<import("../types").Prompt[]>("/prompts/builtin"),
    seed: () => request<{ status: string }>("/prompts/seed", { method: "POST" }),
  },
  logs: {
    list: (params?: { server_id?: number; limit?: number; offset?: number }) => {
      const q = new URLSearchParams()
      if (params?.server_id) q.set("server_id", String(params.server_id))
      if (params?.limit) q.set("limit", String(params.limit))
      if (params?.offset) q.set("offset", String(params.offset))
      return request<import("../types").OperationLog[]>(`/logs?${q}`)
    },
    get: (id: number) => request<import("../types").OperationLog>(`/logs/${id}`),
  },
  learning: {
    list: (params?: { limit?: number; offset?: number }) => {
      const q = new URLSearchParams()
      if (params?.limit) q.set("limit", String(params.limit))
      if (params?.offset) q.set("offset", String(params.offset))
      return request<import("../types").LearningRecord[]>(`/learning?${q}`)
    },
    feedback: (id: number, success: boolean) => request<{ status: string }>(`/learning/${id}/feedback`, { method: "POST", body: JSON.stringify({ success }) }),
  },
  settings: {
    get: () => request<import("../types").AIConfig>("/settings"),
    update: (data: import("../types").AIConfig) => request<{ status: string }>("/settings", { method: "PUT", body: JSON.stringify(data) }),
    test: (data: import("../types").AIConfig) => request<{ status: string; reply: string }>("/settings/test", { method: "POST", body: JSON.stringify(data) }),
  },
}
