"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CardSkeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/utils"
import type { Prompt } from "@/types"

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Prompt | null>(null)
  const [form, setForm] = useState({ name: "", content: "", category: "general" })

  useEffect(() => { loadPrompts() }, [])

  async function loadPrompts() {
    try { setPrompts(await api.prompts.list()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleAdd() {
    try {
      if (editing) {
        await api.prompts.update(editing.id, form)
        setEditing(null)
      } else {
        await api.prompts.create(form)
      }
      setShowAdd(false)
      setForm({ name: "", content: "", category: "general" })
      loadPrompts()
    } catch (e) { alert(e instanceof Error ? e.message : "Failed") }
  }

  async function handleSeed() {
    try { await api.prompts.seed(); loadPrompts() }
    catch (e) { console.error(e) }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this prompt?")) return
    try { await api.prompts.delete(id); loadPrompts() }
    catch (e) { console.error(e) }
  }

  function startEdit(p: Prompt) {
    setEditing(p)
    setForm({ name: p.name, content: p.content, category: p.category })
    setShowAdd(true)
  }

  if (loading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Prompts</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}</div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prompts</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleSeed}>Seed Built-in</Button>
          <Button onClick={() => { setShowAdd(!showAdd); setEditing(null); setForm({ name: "", content: "", category: "general" }) }}>
            {showAdd ? "Cancel" : "+ Add Prompt"}
          </Button>
        </div>
      </div>

      {showAdd && (
        <Card className="animate-slide-up">
          <CardHeader><CardTitle>{editing ? "Edit Prompt" : "Create Prompt"}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  {["general", "system", "detection", "remediation", "analysis", "orchestration", "learning", "scheduler", "emergency"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <textarea placeholder="Prompt content..." value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={8} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono" />
              <Button onClick={handleAdd}>{editing ? "Update" : "Create"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {prompts.map((p, i) => (
          <Card key={p.id} className="animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{p.name}</CardTitle>
                <div className="flex gap-1">
                  {p.is_builtin && <Badge variant="info">Built-in</Badge>}
                  <Badge>{p.category}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3 font-mono">{p.content.slice(0, 200)}...</p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-muted-foreground">{formatDate(p.updated_at)}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>Edit</Button>
                  {!p.is_builtin && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(p.id)}>Delete</Button>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {prompts.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">No prompts configured. Click &quot;Seed Built-in&quot; to add default prompts.</CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
