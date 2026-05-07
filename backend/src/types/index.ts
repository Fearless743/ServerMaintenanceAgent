export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'user' | 'viewer';
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ServerGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Server {
  id: string;
  name: string;
  hostname: string;
  port: number;
  ip_address?: string;
  os_type?: string;
  os_version?: string;
  status: 'online' | 'offline' | 'warning' | 'maintenance';
  group_id?: string;
  ssh_username?: string;
  ssh_key_path?: string;
  ssh_password_encrypted?: string;
  agent_port: number;
  agent_status: 'connected' | 'disconnected' | 'error';
  last_heartbeat?: Date;
  tags: string[];
  metadata: Record<string, any>;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AiTask {
  id: string;
  name: string;
  description?: string;
  prompt_template: string;
  task_type: 'maintenance' | 'monitoring' | 'optimization' | 'security' | 'backup' | 'custom';
  priority: number;
  is_enabled: boolean;
  group_id?: string;
  parameters: Record<string, any>;
  schedule_cron?: string;
  schedule_interval?: number;
  max_execution_time: number;
  retry_count: number;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface TaskSchedule {
  id: string;
  task_id: string;
  server_id: string;
  next_run_at?: Date;
  last_run_at?: Date;
  run_count: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AiOperation {
  id: string;
  task_id?: string;
  server_id: string;
  operation_type: 'analysis' | 'optimization' | 'repair' | 'monitoring' | 'learning' | 'prediction' | 'custom';
  title: string;
  description?: string;
  ai_prompt?: string;
  ai_response?: string;
  ai_confidence?: number;
  ai_model?: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'warning';
  started_at?: Date;
  completed_at?: Date;
  execution_time?: number;
  error_message?: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  is_automated: boolean;
  requires_approval: boolean;
  approved_by?: string;
  approved_at?: Date;
  metadata: Record<string, any>;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface OperationLog {
  id: string;
  operation_id: string;
  log_level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details: Record<string, any>;
  timestamp: Date;
}

export interface OperationCommand {
  id: string;
  operation_id: string;
  command: string;
  command_type: 'shell' | 'script' | 'api' | 'agent';
  working_directory?: string;
  timeout: number;
  exit_code?: number;
  stdout?: string;
  stderr?: string;
  executed_at?: Date;
  execution_time?: number;
  created_at: Date;
}

export interface ServerMetric {
  id: string;
  server_id: string;
  cpu_usage?: number;
  memory_usage?: number;
  memory_total?: number;
  memory_used?: number;
  disk_usage?: number;
  disk_total?: number;
  disk_used?: number;
  network_in?: number;
  network_out?: number;
  load_average_1m?: number;
  load_average_5m?: number;
  load_average_15m?: number;
  process_count?: number;
  uptime?: number;
  collected_at: Date;
}

export interface AiLearningPattern {
  id: string;
  pattern_name: string;
  pattern_type: 'error_pattern' | 'optimization_pattern' | 'maintenance_pattern' | 'security_pattern';
  pattern_data: Record<string, any>;
  success_rate?: number;
  usage_count: number;
  last_used_at?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  server_id?: string;
  group_id?: string;
  metric_name: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains';
  threshold: number;
  duration: number;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  notification_channels: string[];
  is_enabled: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AlertHistory {
  id: string;
  rule_id: string;
  server_id: string;
  triggered_at: Date;
  resolved_at?: Date;
  status: 'active' | 'acknowledged' | 'resolved' | 'expired';
  current_value?: number;
  message?: string;
  acknowledged_by?: string;
  acknowledged_at?: Date;
}

export interface NotificationChannel {
  id: string;
  name: string;
  channel_type: 'email' | 'slack' | 'webhook' | 'telegram' | 'discord' | 'sms';
  configuration: Record<string, any>;
  is_enabled: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface SystemConfig {
  id: string;
  config_key: string;
  config_value: any;
  description?: string;
  updated_by?: string;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 分页参数
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// 过滤参数
export interface FilterParams {
  search?: string;
  status?: string;
  type?: string;
  group_id?: string;
  server_id?: string;
  start_date?: string;
  end_date?: string;
}