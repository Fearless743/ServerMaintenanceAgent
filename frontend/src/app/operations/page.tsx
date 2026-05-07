import { Metadata } from 'next';
import { OperationsPage } from '@/components/operations/operations-page';

export const metadata: Metadata = {
  title: '操作日志 - ServerMaintenanceAgent',
  description: '查看AI操作记录',
};

export default function Operations() {
  return <OperationsPage />;
}