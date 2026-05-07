'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Server, Activity, Bot, AlertTriangle } from 'lucide-react';

const stats = [
  {
    title: '在线服务器',
    value: '12',
    change: '+2',
    changeType: 'positive',
    icon: Server,
    description: '当前在线服务器数量',
  },
  {
    title: '活跃任务',
    value: '8',
    change: '+1',
    changeType: 'positive',
    icon: Bot,
    description: '正在执行的AI任务',
  },
  {
    title: '今日操作',
    value: '156',
    change: '+23',
    changeType: 'positive',
    icon: Activity,
    description: '今天执行的操作数量',
  },
  {
    title: '告警数量',
    value: '3',
    change: '-1',
    changeType: 'negative',
    icon: AlertTriangle,
    description: '需要关注的告警',
  },
];

export function DashboardStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              <span
                className={
                  stat.changeType === 'positive'
                    ? 'text-green-500'
                    : 'text-red-500'
                }
              >
                {stat.change}
              </span>{' '}
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}