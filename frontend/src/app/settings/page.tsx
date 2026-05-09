"use client"
import { useEffect, useState, useCallback } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatusDot } from "@/components/ui/status-dot"
import { CardSkeleton } from "@/components/ui/skeleton"
import type { AgentStatus, LearningRecord, AIConfig } from "@/types"

export default function SettingsPage() {
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null)
  const [learning, setLearning] = useState<LearningRecord[]>([])
  const [loading, setLoading] = useState(true)

  // AI config form state
  const [config, setConfig] = useState<AIConfig>({ api_key: "", base_url: "", model: "" })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [saveResult, setSaveResult] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [s, l, c] = await Promise.all([
          api.dashboard.agentStatus(),
          api.learning.list({ limit: 20 }),
          api.settings.get(),
        ])
        setAgentStatus(s)
        setLearning(l)
        setConfig(c)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveResult(null)
    try {
      await api.settings.update(config)
      const fresh = await api.settings.get()
      setConfig(fresh)
      setSaveResult("✅ 配置已保存，AI 客户端已热更新")
      // refresh agent status to show new model/base_url
      const s = await api.dashboard.agentStatus()
      setAgentStatus(s)
    } catch (e: any) {
      setSaveResult(`❌ 保存失败: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }, [config])

  const handleTest = useCallback(async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.settings.test(config)
      setTestResult({ ok: true, msg: `连接成功: ${res.reply}` })
    } catch (e: any) {
      setTestResult({ ok: false, msg: e.message })
    } finally {
      setTesting(false)
    }
  }, [config])

  if (loading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <CardSkeleton /><CardSkeleton />
    </div>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* AI Provider Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>AI Provider 配置</CardTitle>
          <CardDescription>
            配置自定义 OpenAI 兼容 API（支持 OpenAI、Deepseek、Ollama、vLLM 等任意兼容端点）。
            保存后立即生效，无需重启服务。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Base URL</label>
            <input
              type="text"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="https://api.openai.com/v1"
              value={config.base_url}
              onChange={(e) => setConfig((c) => ({ ...c, base_url: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              OpenAI 兼容的 API 地址，如 https://api.deepseek.com/v1 或 http://localhost:11434/v1
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">API Key</label>
            <input
              type="password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="sk-...（本地部署可留空）"
              value={config.api_key}
              onChange={(e) => setConfig((c) => ({ ...c, api_key: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              当前: {agentStatus?.api_key || "未配置"}。如果无需认证（如本地 Ollama），可留空。
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Model</label>
            <input
              type="text"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="gpt-4o / deepseek-chat / llama3"
              value={config.model}
              onChange={(e) => setConfig((c) => ({ ...c, model: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存配置"}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? "测试中..." : "测试连接"}
            </Button>
          </div>

          {saveResult && (
            <p className="text-sm mt-2">{saveResult}</p>
          )}
          {testResult && (
            <p className={`text-sm mt-2 ${testResult.ok ? "text-green-600" : "text-red-600"}`}>
              {testResult.msg}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Agent Status */}
      <Card>
        <CardHeader>
          <CardTitle>Agent 状态</CardTitle>
          <CardDescription>当前 AI Agent 运行状态</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Status</span>
              <div className="flex items-center gap-2">
                <StatusDot status={agentStatus?.running ? "healthy" : "error"} size="md" />
                <span className="font-medium">{agentStatus?.running ? "Running" : "Stopped"}</span>
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Model</span>
              <p className="font-medium">{agentStatus?.model ?? "N/A"}</p>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Base URL</span>
              <p className="font-medium text-sm break-all">{agentStatus?.base_url ?? "N/A"}</p>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">API Key</span>
              <p className="font-medium font-mono text-sm">{agentStatus?.api_key ?? "N/A"}</p>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Learning</span>
              <Badge variant={agentStatus?.learning ? "success" : "default"}>
                {agentStatus?.learning ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Sub-agents</span>
              <p className="font-medium">{agentStatus?.sub_agents ? Object.keys(agentStatus.sub_agents).length : 0} connected</p>
            </div>
          </div>

          {agentStatus?.sub_agents && Object.keys(agentStatus.sub_agents).length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Connected Sub-agents</span>
              <div className="mt-2 space-y-2">
                {Object.entries(agentStatus.sub_agents).map(([key, connected]) => (
                  <div key={key} className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                    <StatusDot status={connected ? "healthy" : "error"} />
                    <span className="text-sm">{key}</span>
                    <Badge variant={connected ? "success" : "error"} className="ml-auto">{connected ? "Online" : "Offline"}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Learning Records */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Records</CardTitle>
          <CardDescription>AI 从历史操作中学到的解决方案</CardDescription>
        </CardHeader>
        <CardContent>
          {learning.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无学习记录。AI 会在监控服务器的过程中自动积累经验。</p>
          ) : (
            <div className="space-y-3">
              {learning.map((r, i) => (
                <div key={r.id} className="rounded-lg border border-border p-4 animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={r.success ? "success" : "error"}>
                      {r.success ? "Successful" : "Failed"}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Confidence: {(r.confidence * 100).toFixed(0)}%</span>
                      <span className="text-xs text-muted-foreground">Used: {r.times_used}x</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium">{r.problem}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.solution}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
