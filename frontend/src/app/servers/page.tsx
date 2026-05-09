"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusDot } from "@/components/ui/status-dot"
import { TableSkeleton } from "@/components/ui/skeleton"
import { formatDate, statusBg } from "@/lib/utils"
import type { Server } from "@/types"

export default function ServersPage() {
  const [servers, setServers] = useState<Server[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: "", host: "", port: "22", group_id: "0" })

  useEffect(() => {
    loadServers()
  }, [])

  async function loadServers() {
    try { setServers(await api.servers.list()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleAdd() {
    try {
      await api.servers.create({
        name: form.name,
        host: form.host,
        port: parseInt(form.port),
        group_id: parseInt(form.group_id),
      })
      setShowAdd(false)
      setForm({ name: "", host: "", port: "22", group_id: "0" })
      loadServers()
    } catch (e) { alert(e instanceof Error ? e.message : "Failed") }
  }

  async function handleCheck(id: number) {
    try {
      await api.servers.check(id)
      setTimeout(loadServers, 2000)
    } catch (e) { console.error(e) }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this server?")) return
    try { await api.servers.delete(id); loadServers() }
    catch (e) { console.error(e) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Servers</h1>
        <Button onClick={() => setShowAdd(!showAdd)}>{showAdd ? "Cancel" : "+ Add Server"}</Button>
      </div>

      {showAdd && (
        <Card className="animate-slide-up">
          <CardHeader><CardTitle>Add Server</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <input placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <input placeholder="Host" value={form.host} onChange={e => setForm({...form, host: e.target.value})} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <input placeholder="Port" type="number" value={form.port} onChange={e => setForm({...form, port: e.target.value})} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <Button onClick={handleAdd}>Create</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="p-6"><TableSkeleton /></div> : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Host</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Last Check</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {servers.map((s, i) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="px-6 py-4"><StatusDot status={s.status} /></td>
                    <td className="px-6 py-4 font-medium">{s.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{s.host}:{s.port}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(s.last_check)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => handleCheck(s.id)}>Check</Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(s.id)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {servers.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No servers configured. Add one to get started.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
