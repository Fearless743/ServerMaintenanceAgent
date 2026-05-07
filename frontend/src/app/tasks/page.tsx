import { Metadata } from 'next';
import { TasksPage } from '@/components/tasks/tasks-page';

export const metadata: Metadata = {
  title: 'AI任务 - ServerMaintenanceAgent',
  description: '管理AI维护任务',
};

export default function Tasks() {
  return <TasksPage />;
}