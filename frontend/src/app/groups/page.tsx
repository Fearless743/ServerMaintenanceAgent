"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CardSkeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/utils"
import type { ServerGroup, Prompt } from "@/types"

export default function GroupsPage() {
  const [groups, setGroups] = useState<ServerGroup[]>([])
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", prompt_id: "0" })

  useEffect(() => {
    async function load() {
      try {
        const [g, p] = await Promise.all([api.groups.list(), api.prompts.list()])
        setGroups(g)
        setPrompts(p)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  async function handleAdd() {
    try {
      await api.groups.create({
        name: form.name,
        description: form.description,
        prompt_id: parseInt(form.prompt_id),
      })
      setShowAdd(false)
      setForm({ name: "", description: "", prompt_id: "0" })
      setGroups(await api.groups.list())
    } catch (e) { alert(e instanceof Error ? e.message : "Failed") }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this group?")) return
    try { await api.groups.delete(id); setGroups(await api.groups.list()) }
    catch (e) { console.error(e) }
  }

  if (loading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Server Groups</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <CardSkeleton key={i} />)}</div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Server Groups</h1>
        <Button onClick={() => setShowAdd(!showAdd)}>{showAdd ? "Cancel" : "+ Add Group"}</Button>
      </div>

      {showAdd && (
        <Card className="animate-slide-up">
          <CardHeader><CardTitle>Create Group</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input placeholder="Group Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <input placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <select value={form.prompt_id} onChange={e => setForm({...form, prompt_id: e.target.value})} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="0">No prompt</option>
                {prompts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <Button onClick={handleAdd}>Create</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g, i) => (
          <Card key={g.id} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{g.name}</CardTitle>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(g.id)}>Delete</Button>
              </div>
              <CardDescription>{g.description || "No description"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Prompt:</span>
                <Badge variant={g.prompt_id > 0 ? "success" : "default"}>
                  {g.prompt_id > 0 ? prompts.find(p => p.id === g.prompt_id)?.name || "Custom" : "Default"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Created {formatDate(g.created_at)}</p>
            </CardContent>
          </Card>
        ))}
        {groups.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">No groups configured. Create one to organize your servers.</CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
