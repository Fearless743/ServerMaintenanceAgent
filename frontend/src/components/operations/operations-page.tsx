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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Activity, 
  Search, 
  MoreHorizontal, 
  Eye, 
  RefreshCw, 
  XCircle,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  Shield,
  Database,
  Bot,
} from 'lucide-react';

// 模拟数据
const operations = [
  {
    id: '1',
    server: 'web-server-01',
    task: '磁盘空间清理',
    type: 'maintenance',
    status: 'success',
    confidence: 0.95,
    startTime: '2024-01-15 14:30:00',
    duration: '2.3秒',
    description: '清理/tmp目录，释放15GB空间',
    aiModel: 'GPT-4',
  },
  {
    id: '2',
    server: 'db-server-01',
    task: '数据库索引优化',
    type: 'optimization',
    status: 'success',
    confidence: 0.88,
    startTime: '2024-01-15 14:15:00',
    duration: '5.1秒',
    description: '创建3个缺失索引，查询性能提升40%',
    aiModel: 'GPT-4',
  },
  {
    id: '3',
    server: 'api-server-01',
    task: '内存使用监控',
    type: 'monitoring',
    status: 'warning',
    confidence: 0.72,
    startTime: '2024-01-15 14:00:00',
    duration: '1.8秒',
    description: '内存使用率持续上升，建议检查Node.js应用',
    aiModel: 'GPT-4',
  },
  {
    id: '4',
    server: 'web-server-01',
    task: 'Nginx配置优化',
    type: 'optimization',
    status: 'failed',
    confidence: 0.65,
    startTime: '2024-01-15 13:45:00',
    duration: '3.2秒',
    description: '配置验证失败，语法错误',
    aiModel: 'GPT-4',
  },
  {
    id: '5',
    server: 'cache-server-01',
    task: 'Redis连接池重置',
    type: 'maintenance',
    status: 'success',
    confidence: 0.91,
    startTime: '2024-01-15 13:30:00',
    duration: '1.5秒',
    description: '重置连接池，解决连接超时问题',
    aiModel: 'GPT-4',
  },
  {
    id: '6',
    server: 'web-server-01',
    task: '安全漏洞扫描',
    type: 'security',
    status: 'success',
    confidence: 0.94,
    startTime: '2024-01-15 13:15:00',
    duration: '12.8秒',
    description: '发现2个中危漏洞，已生成修复建议',
    aiModel: 'GPT-4',
  },
];

const typeColors = {
  maintenance: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-100',
  optimization: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-100',
  security: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-100',
  monitoring: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-100',
  repair: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-100',
  prediction: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-100',
};

const typeLabels = {
  maintenance: '维护',
  optimization: '优化',
  security: '安全',
  monitoring: '监控',
  repair: '修复',
  prediction: '预测',
};

const typeIcons = {
  maintenance: Settings,
  optimization: Zap,
  security: Shield,
  monitoring: Database,
  repair: RefreshCw,
  prediction: Clock,
};

const statusColors = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-100',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-100',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-100',
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-100',
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-100',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-100',
};

const statusLabels = {
  success: '成功',
  failed: '失败',
  warning: '警告',
  running: '运行中',
  pending: '等待中',
  cancelled: '已取消',
};

const statusIcons = {
  success: CheckCircle,
  failed: XCircle,
  warning: AlertTriangle,
  running: RefreshCw,
  pending: Clock,
  cancelled: XCircle,
};

export function OperationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredOperations = operations.filter(operation => {
    const matchesSearch = operation.server.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         operation.task.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         operation.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || operation.status === statusFilter;
    const matchesType = typeFilter === 'all' || operation.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const successCount = operations.filter(op => op.status === 'success').length;
  const failedCount = operations.filter(op => op.status === 'failed').length;
  const warningCount = operations.filter(op => op.status === 'warning').length;
  const avgConfidence = operations.reduce((sum, op) => sum + op.confidence, 0) / operations.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">操作日志</h1>
          <p className="text-muted-foreground">
            查看AI操作记录和执行结果
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              总操作数
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              成功
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              失败
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              平均置信度
            </CardTitle>
            <Bot className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {(avgConfidence * 100).toFixed(0)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 过滤和搜索 */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索操作..."
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
            <SelectItem value="success">成功</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
            <SelectItem value="warning">警告</SelectItem>
            <SelectItem value="running">运行中</SelectItem>
            <SelectItem value="pending">等待中</SelectItem>
          </SelectContent>
        </Select>
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
            <SelectItem value="repair">修复</SelectItem>
            <SelectItem value="prediction">预测</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 操作表格 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>服务器</TableHead>
                <TableHead>任务</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>置信度</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>时间</TableHead>
                <TableHead>耗时</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOperations.map((operation) => {
                const TypeIcon = typeIcons[operation.type as keyof typeof typeIcons];
                const StatusIcon = statusIcons[operation.status as keyof typeof statusIcons];
                return (
                  <TableRow key={operation.id}>
                    <TableCell>
                      <div className="font-medium">{operation.server}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{operation.task}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={typeColors[operation.type as keyof typeof typeColors]}
                      >
                        <TypeIcon className="mr-1 h-3 w-3" />
                        {typeLabels[operation.type as keyof typeof typeLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusColors[operation.status as keyof typeof statusColors]}
                      >
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {statusLabels[operation.status as keyof typeof statusLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              operation.confidence >= 0.9
                                ? 'bg-green-500'
                                : operation.confidence >= 0.7
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${operation.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm">
                          {(operation.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {operation.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {operation.startTime}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {operation.duration}
                      </div>
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
                            <Eye className="mr-2 h-4 w-4" />
                            查看详情
                          </DropdownMenuItem>
                          {operation.status === 'failed' && (
                            <DropdownMenuItem>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              重试
                            </DropdownMenuItem>
                          )}
                          {operation.status === 'running' && (
                            <DropdownMenuItem className="text-red-600">
                              <XCircle className="mr-2 h-4 w-4" />
                              取消
                            </DropdownMenuItem>
                          )}
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