import { cn } from "@/lib/utils"

const dotColors = {
  healthy: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  unknown: "bg-gray-400",
  disabled: "bg-gray-600",
  success: "bg-emerald-500",
  failed: "bg-red-500",
  running: "bg-blue-500",
  pending: "bg-gray-400",
}

export function StatusDot({ status, size = "sm" }: { status: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "h-2 w-2" : size === "md" ? "h-3 w-3" : "h-4 w-4"
  return (
    <span className={cn("inline-block rounded-full animate-pulse-glow", dotColors[status as keyof typeof dotColors] || "bg-gray-400", sizeClass)} />
  )
}
