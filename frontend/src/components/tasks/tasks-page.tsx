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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Bot, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash, 
  Play,
  Pause,
  Clock,
  Zap,
  Shield,
  Database,
  Settings,
} from 'lucide-react';

// 模拟数据
const tasks = [
  {
    id: '1',
    name: '磁盘空间清理',
    description: '自动清理临时文件和日志文件',
    type: 'maintenance',
    priority: 8,
    isEnabled: true,
    group: '生产环境',
    schedule: '每天 02:00',
    lastRun: '2小时前',
    nextRun: '22小时后',
    successRate: 95,
  },
  {
    id: '2',
    name: '内存使用优化',
    description: '分析内存使用模式，优化内存分配',
    type: 'optimization',
    priority: 7,
    isEnabled: true,
    group: '生产环境',
    schedule: '每6小时',
    lastRun: '4小时前',
    nextRun: '2小时后',
    successRate: 88,
  },
  {
    id: '3',
    name: '安全漏洞扫描',
    description: '扫描系统安全漏洞和配置问题',
    type: 'security',
    priority: 9,
    isEnabled: true,
    group: '生产环境',
    schedule: '每周一 03:00',
    lastRun: '3天前',
    nextRun: '4天后',
    successRate: 92,
  },
  {
    id: '4',
    name: '数据库性能分析',
    description: '分析数据库查询性能和索引使用情况',
    type: 'optimization',
    priority: 6,
    isEnabled: false,
    group: '生产环境',
    schedule: '每天 04:00',
    lastRun: '1天前',
    nextRun: '-',
    successRate: 76,
  },
  {
    id: '5',
    name: '系统健康检查',
    description: '全面检查系统健康状况',
    type: 'monitoring',
    priority: 5,
    isEnabled: true,
    group: '所有环境',
    schedule: '每小时',
    lastRun: '30分钟前',
    nextRun: '30分钟后',
    successRate: 98,
  },
];

const typeColors = {
  maintenance: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-100',
  optimization: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-100',
  security: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-100',
  monitoring: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-100',
  backup: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-100',
  custom: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-100',
};

const typeLabels = {
  maintenance: '维护',
  optimization: '优化',
  security: '安全',
  monitoring: '监控',
  backup: '备份',
  custom: '自定义',
};

const typeIcons = {
  maintenance: Settings,
  optimization: Zap,
  security: Shield,
  monitoring: Database,
  backup: Database,
  custom: Bot,
};

export function TasksPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || task.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const enabledCount = tasks.filter(t => t.isEnabled).length;
  const disabledCount = tasks.filter(t => !t.isEnabled).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI任务</h1>
          <p className="text-muted-foreground">
            管理AI维护任务和调度
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              创建任务
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>创建AI任务</DialogTitle>
              <DialogDescription>
                创建新的AI维护任务
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  任务名称
                </Label>
                <Input
                  id="name"
                  placeholder="输入任务名称"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  描述
                </Label>
                <Textarea
                  id="description"
                  placeholder="任务描述"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  任务类型
                </Label>
                <Select>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="选择任务类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">维护</SelectItem>
                    <SelectItem value="optimization">优化</SelectItem>
                    <SelectItem value="security">安全</SelectItem>
                    <SelectItem value="monitoring">监控</SelectItem>
                    <SelectItem value="backup">备份</SelectItem>
                    <SelectItem value="custom">自定义</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="group" className="text-right">
                  服务器分组
                </Label>
                <Select>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="选择分组" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">生产环境</SelectItem>
                    <SelectItem value="testing">测试环境</SelectItem>
                    <SelectItem value="development">开发环境</SelectItem>
                    <SelectItem value="all">所有环境</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prompt" className="text-right">
                  AI提示词
                </Label>
                <Textarea
                  id="prompt"
                  placeholder="输入AI提示词模板"
                  className="col-span-3"
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right">
                  优先级
                </Label>
                <Select>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="选择优先级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - 最低</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5 - 中等</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="7">7</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="9">9</SelectItem>
                    <SelectItem value="10">10 - 最高</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="schedule" className="text-right">
                  调度规则
                </Label>
                <Input
                  id="schedule"
                  placeholder="cron表达式或间隔"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="enabled" className="text-right">
                  启用
                </Label>
                <Switch id="enabled" defaultChecked />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={() => setIsAddDialogOpen(false)}>
                创建任务
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
              总任务数
            </CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              已启用
            </CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{enabledCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              已禁用
            </CardTitle>
            <Pause className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{disabledCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              平均成功率
            </CardTitle>
            <Zap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(tasks.reduce((sum, t) => sum + t.successRate, 0) / tasks.length)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 过滤和搜索 */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索任务..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="类型筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有类型</SelectItem>
            <SelectItem value="maintenance">维护</SelectItem>
            <SelectItem value="optimization">优化</SelectItem>
            <SelectItem value="security">安全</SelectItem>
            <SelectItem value="monitoring">监控</SelectItem>
            <SelectItem value="backup">备份</SelectItem>
            <SelectItem value="custom">自定义</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 任务表格 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>任务</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>分组</TableHead>
                <TableHead>调度</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>成功率</TableHead>
                <TableHead>下次运行</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => {
                const TypeIcon = typeIcons[task.type as keyof typeof typeIcons];
                return (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{task.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {task.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={typeColors[task.type as keyof typeof typeColors]}
                      >
                        <TypeIcon className="mr-1 h-3 w-3" />
                        {typeLabels[task.type as keyof typeof typeLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-blue-500"
                            style={{ width: `${task.priority * 10}%` }}
                          />
                        </div>
                        <span className="text-sm">{task.priority}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{task.group}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{task.schedule}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          task.isEnabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {task.isEnabled ? '已启用' : '已禁用'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              task.successRate >= 90
                                ? 'bg-green-500'
                                : task.successRate >= 70
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${task.successRate}%` }}
                          />
                        </div>
                        <span className="text-sm">{task.successRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {task.nextRun}
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
                            <Play className="mr-2 h-4 w-4" />
                            立即执行
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            {task.isEnabled ? (
                              <>
                                <Pause className="mr-2 h-4 w-4" />
                                禁用
                              </>
                            ) : (
                              <>
                                <Play className="mr-2 h-4 w-4" />
                                启用
                              </>
                            )}
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