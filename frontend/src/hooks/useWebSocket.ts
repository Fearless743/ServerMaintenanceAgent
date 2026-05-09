"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import type { WSMessage } from "@/types"

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const [messages, setMessages] = useState<WSMessage[]>([])
  const [connected, setConnected] = useState(false)

  const connect = useCallback(() => {
    if (typeof window === "undefined") return
    const host = window.location.hostname
    const ws = new WebSocket(`ws://${host}:8080/ws`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      setTimeout(connect, 3000)
    }
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage
        setMessages((prev) => [msg, ...prev].slice(0, 200))
      } catch {}
    }
  }, [])

  useEffect(() => {
    connect()
    return () => { wsRef.current?.close() }
  }, [connect])

  return { messages, connected }
}
