"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useWebSocket } from "@/hooks/useWebSocket"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusDot } from "@/components/ui/status-dot"
import { CardSkeleton } from "@/components/ui/skeleton"
import type { DashboardStats, AgentStatus } from "@/types"

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const { messages, connected } = useWebSocket()

  useEffect(() => {
    async function load() {
      try {
        const [s, a] = await Promise.all([api.dashboard.stats(), api.dashboard.agentStatus()])
        setStats(s)
        setAgentStatus(a)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  const recentEvents = messages.slice(0, 10)

  if (loading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Badge variant={connected ? "success" : "error"}>
          {connected ? "WebSocket Connected" : "Disconnected"}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="animate-slide-up">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Servers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.server_count ?? 0}</div>
            <div className="flex gap-2 mt-2">
              <span className="text-xs text-emerald-500">{stats?.healthy_count ?? 0} healthy</span>
              <span className="text-xs text-amber-500">{stats?.warning_count ?? 0} warning</span>
              <span className="text-xs text-red-500">{stats?.error_count ?? 0} error</span>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "50ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total_operations ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.success_operations ?? 0} successful
            </p>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Learned Solutions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.learned_solutions ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Reusable fixes</p>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "150ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AI Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <StatusDot status={agentStatus?.running ? "healthy" : "error"} size="md" />
              <span className="text-lg font-semibold">{agentStatus?.running ? "Running" : "Stopped"}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Model: {agentStatus?.model ?? "N/A"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Events Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-glow" />
            Live Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet. Waiting for agent activity...</p>
          ) : (
            <div className="space-y-2">
              {recentEvents.map((event, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                  <Badge variant={event.type.includes("error") ? "error" : event.type.includes("complete") ? "success" : "info"}>
                    {event.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {typeof event.data === "object" ? JSON.stringify(event.data).slice(0, 100) : String(event.data)}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
