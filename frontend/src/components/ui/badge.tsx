import { cn } from "@/lib/utils"

interface BadgeProps {
  children: React.ReactNode
  variant?: "default" | "success" | "warning" | "error" | "info"
  className?: string
}

const variants = {
  default: "bg-secondary text-secondary-foreground",
  success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  error: "bg-red-500/10 text-red-500 border-red-500/20",
  info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors", variants[variant], className)}>
      {children}
    </span>
  )
}
