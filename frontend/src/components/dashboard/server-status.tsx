'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Server, Cpu, HardDrive, MemoryStick, Wifi } from 'lucide-react';

const servers = [
  {
    name: 'web-server-01',
    status: 'online',
    cpu: 45,
    memory: 62,
    disk: 78,
    network: 120,
    uptime: '15天 4小时',
  },
  {
    name: 'db-server-02',
    status: 'online',
    cpu: 78,
    memory: 85,
    disk: 45,
    network: 85,
    uptime: '30天 12小时',
  },
  {
    name: 'api-server-03',
    status: 'warning',
    cpu: 92,
    memory: 88,
    disk: 65,
    network: 45,
    uptime: '7天 8小时',
  },
  {
    name: 'cache-server-04',
    status: 'online',
    cpu: 25,
    memory: 45,
    disk: 32,
    network: 25,
    uptime: '45天 2小时',
  },
  {
    name: 'backup-server-05',
    status: 'offline',
    cpu: 0,
    memory: 0,
    disk: 85,
    network: 0,
    uptime: '离线',
  },
];

const statusColors = {
  online: 'bg-green-500',
  warning: 'bg-yellow-500',
  offline: 'bg-red-500',
};

const statusLabels = {
  online: '在线',
  warning: '警告',
  offline: '离线',
};

export function ServerStatus() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>服务器状态</span>
          <span className="text-sm font-normal text-muted-foreground">
            {servers.filter((s) => s.status === 'online').length}/{servers.length} 在线
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {servers.map((server) => (
            <div
              key={server.name}
              className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${statusColors[server.status]}`}
                    />
                    <Server className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">{server.name}</div>
                    <div className="text-xs text-muted-foreground">
                      运行时间: {server.uptime}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={
                    server.status === 'online'
                      ? 'bg-green-100 text-green-800'
                      : server.status === 'warning'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }
                >
                  {statusLabels[server.status]}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1">
                      <Cpu className="h-3 w-3" />
                      <span>CPU</span>
                    </div>
                    <span>{server.cpu}%</span>
                  </div>
                  <Progress
                    value={server.cpu}
                    className={`h-2 ${
                      server.cpu > 90
                        ? 'bg-red-100'
                        : server.cpu > 70
                        ? 'bg-yellow-100'
                        : 'bg-green-100'
                    }`}
                  />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1">
                      <MemoryStick className="h-3 w-3" />
                      <span>内存</span>
                    </div>
                    <span>{server.memory}%</span>
                  </div>
                  <Progress
                    value={server.memory}
                    className={`h-2 ${
                      server.memory > 90
                        ? 'bg-red-100'
                        : server.memory > 70
                        ? 'bg-yellow-100'
                        : 'bg-green-100'
                    }`}
                  />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1">
                      <HardDrive className="h-3 w-3" />
                      <span>磁盘</span>
                    </div>
                    <span>{server.disk}%</span>
                  </div>
                  <Progress
                    value={server.disk}
                    className={`h-2 ${
                      server.disk > 90
                        ? 'bg-red-100'
                        : server.disk > 70
                        ? 'bg-yellow-100'
                        : 'bg-green-100'
                    }`}
                  />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1">
                      <Wifi className="h-3 w-3" />
                      <span>网络</span>
                    </div>
                    <span>{server.network} Mbps</span>
                  </div>
                  <Progress
                    value={server.network / 10}
                    className="h-2 bg-blue-100"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}