'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Zap, Brain, Clock } from 'lucide-react';

const aiActivities = [
  {
    id: 1,
    type: 'analysis',
    description: '分析web-server-01的磁盘使用模式',
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
    duration: '2.3秒',
    confidence: 0.94,
  },
  {
    id: 2,
    type: 'optimization',
    description: '优化数据库查询性能',
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
    duration: '5.1秒',
    confidence: 0.87,
  },
  {
    id: 3,
    type: 'learning',
    description: '学习nginx配置优化模式',
    timestamp: new Date(Date.now() - 1000 * 60 * 25),
    duration: '12.8秒',
    confidence: 0.76,
  },
  {
    id: 4,
    type: 'prediction',
    description: '预测api-server-03内存使用趋势',
    timestamp: new Date(Date.now() - 1000 * 60 * 40),
    duration: '3.2秒',
    confidence: 0.82,
  },
];

const typeColors = {
  analysis: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-100',
  optimization: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-100',
  learning: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-100',
  prediction: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-100',
};

const typeLabels = {
  analysis: '分析',
  optimization: '优化',
  learning: '学习',
  prediction: '预测',
};

const typeIcons = {
  analysis: Zap,
  optimization: Zap,
  learning: Brain,
  prediction: Clock,
};

export function AiActivity() {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bot className="h-5 w-5" />
          <span>AI活动</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {aiActivities.map((activity) => {
            const Icon = typeIcons[activity.type];
            return (
              <div
                key={activity.id}
                className="flex items-start space-x-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{activity.description}</span>
                      <Badge
                        variant="secondary"
                        className={typeColors[activity.type]}
                      >
                        {typeLabels[activity.type]}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {activity.duration}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-muted-foreground">
                      {activity.timestamp.toLocaleTimeString('zh-CN')}
                    </span>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-muted-foreground">置信度:</span>
                      <span className="text-xs font-medium">
                        {(activity.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}