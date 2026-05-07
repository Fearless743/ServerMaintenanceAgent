import { Metadata } from 'next';
import { DashboardStats } from '@/components/dashboard/stats';
import { RecentOperations } from '@/components/dashboard/recent-operations';
import { ServerStatus } from '@/components/dashboard/server-status';
import { AiActivity } from '@/components/dashboard/ai-activity';

export const metadata: Metadata = {
  title: '仪表板 - ServerMaintenanceAgent',
  description: '服务器维护系统概览',
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">仪表板</h1>
          <p className="text-muted-foreground">
            服务器维护系统概览和实时状态监控
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            刷新数据
          </button>
        </div>
      </div>
      
      <DashboardStats />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <ServerStatus />
        </div>
        <div className="col-span-3">
          <RecentOperations />
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <AiActivity />
      </div>
    </div>
  );
}