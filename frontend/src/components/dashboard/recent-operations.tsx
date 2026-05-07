'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

const recentOperations = [
  {
    id: 1,
    server: 'web-server-01',
    operation: '磁盘空间清理',
    status: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    aiConfidence: 0.95,
  },
  {
    id: 2,
    server: 'db-server-02',
    operation: '数据库索引优化',
    status: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    aiConfidence: 0.88,
  },
  {
    id: 3,
    server: 'api-server-03',
    operation: '内存使用分析',
    status: 'warning',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    aiConfidence: 0.72,
  },
  {
    id: 4,
    server: 'cache-server-04',
    operation: 'Redis连接池重置',
    status: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    aiConfidence: 0.91,
  },
  {
    id: 5,
    server: 'web-server-01',
    operation: 'Nginx配置优化',
    status: 'failed',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    aiConfidence: 0.65,
  },
];

const statusColors = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-100',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-100',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-100',
};

const statusLabels = {
  success: '成功',
  warning: '警告',
  failed: '失败',
};

export function RecentOperations() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>最近操作</span>
          <span className="text-sm font-normal text-muted-foreground">
            最近5条
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentOperations.map((operation) => (
            <div
              key={operation.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{operation.server}</span>
                  <Badge
                    variant="secondary"
                    className={statusColors[operation.status]}
                  >
                    {statusLabels[operation.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {operation.operation}
                </p>
              </div>
              <div className="text-right space-y-1">
                <div className="text-sm text-muted-foreground">
                  {formatDate(operation.timestamp)}
                </div>
                <div className="text-xs text-muted-foreground">
                  AI置信度: {(operation.aiConfidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}