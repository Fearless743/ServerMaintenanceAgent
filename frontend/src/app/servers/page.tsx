import { Metadata } from 'next';
import { ServersPage } from '@/components/servers/servers-page';

export const metadata: Metadata = {
  title: '服务器管理 - ServerMaintenanceAgent',
  description: '管理所有服务器',
};

export default function Servers() {
  return <ServersPage />;
}