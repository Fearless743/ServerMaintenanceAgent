-- ServerMaintenanceAgent 数据库初始化脚本
-- PostgreSQL 14+

-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 用户会话表
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 服务器分组表
CREATE TABLE server_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    icon VARCHAR(50) DEFAULT 'server',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 服务器表
CREATE TABLE servers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    hostname VARCHAR(255) NOT NULL,
    port INTEGER DEFAULT 22,
    ip_address INET,
    os_type VARCHAR(50),
    os_version VARCHAR(100),
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'warning', 'maintenance')),
    group_id UUID REFERENCES server_groups(id) ON DELETE SET NULL,
    ssh_username VARCHAR(50),
    ssh_key_path VARCHAR(255),
    ssh_password_encrypted TEXT,
    agent_port INTEGER DEFAULT 8080,
    agent_status VARCHAR(20) DEFAULT 'disconnected' CHECK (agent_status IN ('connected', 'disconnected', 'error')),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI任务配置表
CREATE TABLE ai_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    prompt_template TEXT NOT NULL,
    task_type VARCHAR(50) DEFAULT 'maintenance' CHECK (task_type IN ('maintenance', 'monitoring', 'optimization', 'security', 'backup', 'custom')),
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    is_enabled BOOLEAN DEFAULT true,
    group_id UUID REFERENCES server_groups(id) ON DELETE CASCADE,
    parameters JSONB DEFAULT '{}',
    schedule_cron VARCHAR(100),
    schedule_interval INTEGER,
    max_execution_time INTEGER DEFAULT 300,
    retry_count INTEGER DEFAULT 3,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 任务调度表
CREATE TABLE task_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES ai_tasks(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    run_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, server_id)
);

-- AI操作记录表
CREATE TABLE ai_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES ai_tasks(id) ON DELETE SET NULL,
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('analysis', 'optimization', 'repair', 'monitoring', 'learning', 'prediction', 'custom')),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    ai_prompt TEXT,
    ai_response TEXT,
    ai_confidence DECIMAL(5,4),
    ai_model VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled', 'warning')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    execution_time INTEGER,
    error_message TEXT,
    risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    is_automated BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 操作详细日志表
CREATE TABLE operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id UUID NOT NULL REFERENCES ai_operations(id) ON DELETE CASCADE,
    log_level VARCHAR(20) DEFAULT 'info' CHECK (log_level IN ('debug', 'info', 'warning', 'error', 'critical')),
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 操作命令表
CREATE TABLE operation_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id UUID NOT NULL REFERENCES ai_operations(id) ON DELETE CASCADE,
    command TEXT NOT NULL,
    command_type VARCHAR(50) CHECK (command_type IN ('shell', 'script', 'api', 'agent')),
    working_directory VARCHAR(255),
    timeout INTEGER DEFAULT 300,
    exit_code INTEGER,
    stdout TEXT,
    stderr TEXT,
    executed_at TIMESTAMP WITH TIME ZONE,
    execution_time INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 服务器指标表
CREATE TABLE server_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    memory_total BIGINT,
    memory_used BIGINT,
    disk_usage DECIMAL(5,2),
    disk_total BIGINT,
    disk_used BIGINT,
    network_in BIGINT,
    network_out BIGINT,
    load_average_1m DECIMAL(10,2),
    load_average_5m DECIMAL(10,2),
    load_average_15m DECIMAL(10,2),
    process_count INTEGER,
    uptime BIGINT,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI学习模式表
CREATE TABLE ai_learning_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_name VARCHAR(100) NOT NULL,
    pattern_type VARCHAR(50) CHECK (pattern_type IN ('error_pattern', 'optimization_pattern', 'maintenance_pattern', 'security_pattern')),
    pattern_data JSONB NOT NULL,
    success_rate DECIMAL(5,4),
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 告警规则表
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
    group_id UUID REFERENCES server_groups(id) ON DELETE CASCADE,
    metric_name VARCHAR(50) NOT NULL,
    condition VARCHAR(20) NOT NULL CHECK (condition IN ('gt', 'lt', 'eq', 'gte', 'lte', 'contains')),
    threshold DECIMAL(10,2) NOT NULL,
    duration INTEGER DEFAULT 60,
    severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),
    notification_channels JSONB DEFAULT '[]',
    is_enabled BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 告警历史表
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'expired')),
    current_value DECIMAL(10,2),
    message TEXT,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE
);

-- 通知配置表
CREATE TABLE notification_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    channel_type VARCHAR(50) NOT NULL CHECK (channel_type IN ('email', 'slack', 'webhook', 'telegram', 'discord', 'sms')),
    configuration JSONB NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 系统配置表
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 审计日志表
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_servers_group_id ON servers(group_id);
CREATE INDEX idx_servers_status ON servers(status);
CREATE INDEX idx_ai_tasks_group_id ON ai_tasks(group_id);
CREATE INDEX idx_ai_tasks_task_type ON ai_tasks(task_type);
CREATE INDEX idx_task_schedules_task_id ON task_schedules(task_id);
CREATE INDEX idx_task_schedules_server_id ON task_schedules(server_id);
CREATE INDEX idx_task_schedules_next_run_at ON task_schedules(next_run_at);
CREATE INDEX idx_ai_operations_server_id ON ai_operations(server_id);
CREATE INDEX idx_ai_operations_task_id ON ai_operations(task_id);
CREATE INDEX idx_ai_operations_status ON ai_operations(status);
CREATE INDEX idx_ai_operations_created_at ON ai_operations(created_at);
CREATE INDEX idx_operation_logs_operation_id ON operation_logs(operation_id);
CREATE INDEX idx_operation_logs_timestamp ON operation_logs(timestamp);
CREATE INDEX idx_operation_commands_operation_id ON operation_commands(operation_id);
CREATE INDEX idx_server_metrics_server_id ON server_metrics(server_id);
CREATE INDEX idx_server_metrics_collected_at ON server_metrics(collected_at);
CREATE INDEX idx_ai_learning_patterns_pattern_type ON ai_learning_patterns(pattern_type);
CREATE INDEX idx_alert_rules_server_id ON alert_rules(server_id);
CREATE INDEX idx_alert_rules_group_id ON alert_rules(group_id);
CREATE INDEX idx_alert_history_rule_id ON alert_history(rule_id);
CREATE INDEX idx_alert_history_server_id ON alert_history(server_id);
CREATE INDEX idx_alert_history_status ON alert_history(status);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加更新时间触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_server_groups_updated_at BEFORE UPDATE ON server_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_servers_updated_at BEFORE UPDATE ON servers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_tasks_updated_at BEFORE UPDATE ON ai_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_schedules_updated_at BEFORE UPDATE ON task_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_operations_updated_at BEFORE UPDATE ON ai_operations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_learning_patterns_updated_at BEFORE UPDATE ON ai_learning_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON alert_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_channels_updated_at BEFORE UPDATE ON notification_channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入默认管理员用户 (密码: admin123 - 仅用于开发环境)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES 
('admin', 'admin@servermaintenance.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '系统管理员', 'admin');

-- 插入默认服务器分组
INSERT INTO server_groups (name, description, color, icon, created_by) VALUES 
('生产环境', '生产环境服务器', '#EF4444', 'server', (SELECT id FROM users WHERE username = 'admin')),
('测试环境', '测试环境服务器', '#F59E0B', 'test-tube', (SELECT id FROM users WHERE username = 'admin')),
('开发环境', '开发环境服务器', '#10B981', 'code', (SELECT id FROM users WHERE username = 'admin'));

-- 插入默认系统配置
INSERT INTO system_config (config_key, config_value, description) VALUES
('ai_model', '"gpt-4"', 'AI模型配置'),
('ai_max_tokens', '4096', 'AI最大token数'),
('ai_temperature', '0.7', 'AI温度参数'),
('metric_collection_interval', '60', '指标收集间隔(秒)'),
('alert_check_interval', '30', '告警检查间隔(秒)'),
('operation_log_retention_days', '90', '操作日志保留天数'),
('server_metric_retention_days', '30', '服务器指标保留天数');

-- 插入默认告警规则
INSERT INTO alert_rules (name, description, metric_name, condition, threshold, severity, created_by) VALUES
('CPU使用率过高', 'CPU使用率超过90%', 'cpu_usage', 'gt', 90, 'warning', (SELECT id FROM users WHERE username = 'admin')),
('内存使用率过高', '内存使用率超过85%', 'memory_usage', 'gt', 85, 'warning', (SELECT id FROM users WHERE username = 'admin')),
('磁盘空间不足', '磁盘使用率超过90%', 'disk_usage', 'gt', 90, 'critical', (SELECT id FROM users WHERE username = 'admin')),
('服务器离线', '服务器心跳超时', 'heartbeat', 'lt', 1, 'emergency', (SELECT id FROM users WHERE username = 'admin'));