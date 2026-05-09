"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TableSkeleton } from "@/components/ui/skeleton"
import { formatDate, formatDuration } from "@/lib/utils"
import type { OperationLog } from "@/types"

export default function LogsPage() {
  const [logs, setLogs] = useState<OperationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<OperationLog | null>(null)

  useEffect(() => {
    async function load() {
      try { setLogs(await api.logs.list({ limit: 100 })) }
      catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Operation Logs</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            {loading ? <div className="p-6"><TableSkeleton /></div> : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Tool</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l, i) => (
                    <tr key={l.id} onClick={() => setSelected(l)} className={`border-b border-border last:border-0 cursor-pointer transition-colors ${selected?.id === l.id ? "bg-muted" : "hover:bg-muted/50"} animate-slide-up`} style={{ animationDelay: `${i * 20}ms` }}>
                      <td className="px-4 py-3"><Badge variant={l.status === "success" ? "success" : l.status === "failed" ? "error" : l.status === "running" ? "info" : "default"}>{l.status}</Badge></td>
                      <td className="px-4 py-3 text-sm truncate max-w-[200px]">{l.action}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{l.tool_name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDuration(l.duration_ms)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(l.created_at)}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No operation logs yet.</td></tr>}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent>
            {selected ? (
              <div className="space-y-4">
                <div><span className="text-xs text-muted-foreground">Action</span><p className="text-sm mt-1">{selected.action}</p></div>
                <div><span className="text-xs text-muted-foreground">Tool</span><p className="text-sm mt-1">{selected.tool_name || "N/A"}</p></div>
                <div><span className="text-xs text-muted-foreground">Input</span><pre className="text-xs mt-1 bg-muted rounded-lg p-3 overflow-auto max-h-40">{selected.input || "N/A"}</pre></div>
                <div><span className="text-xs text-muted-foreground">Output</span><pre className="text-xs mt-1 bg-muted rounded-lg p-3 overflow-auto max-h-40">{selected.output || "N/A"}</pre></div>
                <div><span className="text-xs text-muted-foreground">Duration</span><p className="text-sm mt-1">{formatDuration(selected.duration_ms)}</p></div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a log entry to view details.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
