"use client"
import { useWebSocket } from "@/hooks/useWebSocket"

export function Header() {
  const { connected, messages } = useWebSocket()
  const recentEvents = messages.filter(m => 
    !["ping", "pong"].includes(m.type)
  ).slice(0, 5)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Server Maintenance Agent</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse-glow" : "bg-red-500"}`} />
          <span className="text-xs font-medium">{connected ? "Live" : "Disconnected"}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {recentEvents.length > 0 && (
            <span>{recentEvents.length} events</span>
          )}
        </div>
      </div>
    </header>
  )
}
