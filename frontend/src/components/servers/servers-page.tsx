'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Server, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash, 
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

// 模拟数据
const servers = [
  {
    id: '1',
    name: 'web-server-01',
    hostname: '192.168.1.101',
    status: 'online',
    agentStatus: 'connected',
    group: '生产环境',
    os: 'Ubuntu 22.04',
    cpu: 45,
    memory: 62,
    disk: 78,
    lastHeartbeat: '2分钟前',
  },
  {
    id: '2',
    name: 'db-server-01',
    hostname: '192.168.1.102',
    status: 'online',
    agentStatus: 'connected',
    group: '生产环境',
    os: 'CentOS 8',
    cpu: 78,
    memory: 85,
    disk: 45,
    lastHeartbeat: '1分钟前',
  },
  {
    id: '3',
    name: 'api-server-01',
    hostname: '192.168.1.103',
    status: 'warning',
    agentStatus: 'connected',
    group: '生产环境',
    os: 'Ubuntu 22.04',
    cpu: 92,
    memory: 88,
    disk: 65,
    lastHeartbeat: '30秒前',
  },
  {
    id: '4',
    name: 'test-server-01',
    hostname: '192.168.2.101',
    status: 'offline',
    agentStatus: 'disconnected',
    group: '测试环境',
    os: 'Ubuntu 22.04',
    cpu: 0,
    memory: 0,
    disk: 32,
    lastHeartbeat: '2小时前',
  },
  {
    id: '5',
    name: 'dev-server-01',
    hostname: '192.168.3.101',
    status: 'online',
    agentStatus: 'disconnected',
    group: '开发环境',
    os: 'Ubuntu 22.04',
    cpu: 25,
    memory: 45,
    disk: 58,
    lastHeartbeat: '5分钟前',
  },
];

const statusColors = {
  online: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-100',
  offline: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-100',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-100',
  maintenance: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-100',
};

const statusLabels = {
  online: '在线',
  offline: '离线',
  warning: '警告',
  maintenance: '维护中',
};

const statusIcons = {
  online: CheckCircle,
  offline: XCircle,
  warning: AlertTriangle,
  maintenance: RefreshCw,
};

export function ServersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredServers = servers.filter(server => {
    const matchesSearch = server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         server.hostname.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || server.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const onlineCount = servers.filter(s => s.status === 'online').length;
  const offlineCount = servers.filter(s => s.status === 'offline').length;
  const warningCount = servers.filter(s => s.status === 'warning').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">服务器管理</h1>
          <p className="text-muted-foreground">
            管理和监控所有服务器
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              添加服务器
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>添加服务器</DialogTitle>
              <DialogDescription>
                添加新的服务器到监控系统
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  名称
                </Label>
                <Input
                  id="name"
                  placeholder="服务器名称"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="hostname" className="text-right">
                  主机名
                </Label>
                <Input
                  id="hostname"
                  placeholder="IP地址或主机名"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="group" className="text-right">
                  分组
                </Label>
                <Select>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="选择分组" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">生产环境</SelectItem>
                    <SelectItem value="testing">测试环境</SelectItem>
                    <SelectItem value="development">开发环境</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="port" className="text-right">
                  SSH端口
                </Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="22"
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={() => setIsAddDialogOpen(false)}>
                添加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              总服务器
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{servers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              在线
            </CardTitle>
            <Wifi className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{onlineCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              离线
            </CardTitle>
            <WifiOff className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{offlineCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              告警
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* 过滤和搜索 */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索服务器..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有状态</SelectItem>
            <SelectItem value="online">在线</SelectItem>
            <SelectItem value="offline">离线</SelectItem>
            <SelectItem value="warning">警告</SelectItem>
            <SelectItem value="maintenance">维护中</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 服务器表格 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>服务器</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>代理</TableHead>
                <TableHead>分组</TableHead>
                <TableHead>CPU</TableHead>
                <TableHead>内存</TableHead>
                <TableHead>磁盘</TableHead>
                <TableHead>最后心跳</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServers.map((server) => {
                const StatusIcon = statusIcons[server.status as keyof typeof statusIcons];
                return (
                  <TableRow key={server.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{server.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {server.hostname}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusColors[server.status as keyof typeof statusColors]}
                      >
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {statusLabels[server.status as keyof typeof statusLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          server.agentStatus === 'connected'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {server.agentStatus === 'connected' ? '已连接' : '未连接'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{server.group}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              server.cpu > 90
                                ? 'bg-red-500'
                                : server.cpu > 70
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${server.cpu}%` }}
                          />
                        </div>
                        <span className="text-sm">{server.cpu}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              server.memory > 90
                                ? 'bg-red-500'
                                : server.memory > 70
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${server.memory}%` }}
                          />
                        </div>
                        <span className="text-sm">{server.memory}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              server.disk > 90
                                ? 'bg-red-500'
                                : server.disk > 70
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${server.disk}%` }}
                          />
                        </div>
                        <span className="text-sm">{server.disk}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {server.lastHeartbeat}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">打开菜单</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            测试连接
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash className="mr-2 h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}