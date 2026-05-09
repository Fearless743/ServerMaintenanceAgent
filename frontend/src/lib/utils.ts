import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString()
}

export function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

export function statusColor(status: string) {
  switch (status) {
    case "healthy": return "text-emerald-500"
    case "warning": return "text-amber-500"
    case "error": return "text-red-500"
    case "success": return "text-emerald-500"
    case "failed": return "text-red-500"
    case "running": return "text-blue-500"
    default: return "text-gray-400"
  }
}

export function statusBg(status: string) {
  switch (status) {
    case "healthy": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
    case "warning": return "bg-amber-500/10 text-amber-500 border-amber-500/20"
    case "error": return "bg-red-500/10 text-red-500 border-red-500/20"
    case "success": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
    case "failed": return "bg-red-500/10 text-red-500 border-red-500/20"
    case "running": return "bg-blue-500/10 text-blue-500 border-blue-500/20"
    default: return "bg-gray-500/10 text-gray-400 border-gray-500/20"
  }
}
