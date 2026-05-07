'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Server,
  Settings,
  FileText,
  Activity,
  Bot,
  Users,
  Database,
  Shield,
  Bell,
  HelpCircle,
} from 'lucide-react';

const sidebarNavItems = [
  {
    title: '仪表板',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: '服务器管理',
    href: '/servers',
    icon: Server,
  },
  {
    title: 'AI任务',
    href: '/tasks',
    icon: Bot,
  },
  {
    title: '操作日志',
    href: '/operations',
    icon: Activity,
  },
  {
    title: '服务器分组',
    href: '/groups',
    icon: Users,
  },
  {
    title: '数据库',
    href: '/database',
    icon: Database,
  },
  {
    title: '安全设置',
    href: '/security',
    icon: Shield,
  },
  {
    title: '通知',
    href: '/notifications',
    icon: Bell,
  },
  {
    title: '文档',
    href: '/docs',
    icon: FileText,
  },
  {
    title: '系统设置',
    href: '/settings',
    icon: Settings,
  },
  {
    title: '帮助',
    href: '/help',
    icon: HelpCircle,
  },
];

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn('pb-12 w-64 hidden md:block', className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            导航菜单
          </h2>
          <div className="space-y-1">
            {sidebarNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors',
                  pathname === item.href
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}