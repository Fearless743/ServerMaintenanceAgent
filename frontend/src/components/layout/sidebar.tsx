"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "◉" },
  { href: "/servers", label: "Servers", icon: "⬡" },
  { href: "/groups", label: "Groups", icon: "▦" },
  { href: "/logs", label: "Logs", icon: "▤" },
  { href: "/prompts", label: "Prompts", icon: "✦" },
  { href: "/settings", label: "Settings", icon: "⚙" },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card/50 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">S</div>
        <div>
          <h1 className="text-sm font-semibold">Server Maintenance</h1>
          <p className="text-xs text-muted-foreground">AI Agent</p>
        </div>
      </div>
      <nav className="space-y-1 p-4">
        {navItems.map((item) => {
          const active = pathname?.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
            </Link>
          )
        })}
      </nav>
      <div className="absolute bottom-4 left-4 right-4">
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">AI Engine</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-glow" />
            <span className="text-xs font-medium">Connected</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
