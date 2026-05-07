import OpenAI from 'openai';
import dotenv from 'dotenv';
import { query } from '../config/database';
import { emitToOperations } from '../config/websocket';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AIAnalysisRequest {
  serverId: string;
  serverName: string;
  metrics: any;
  logs?: string[];
  taskType: string;
  promptTemplate: string;
  parameters: Record<string, any>;
}

interface AIAnalysisResponse {
  analysis: string;
  recommendations: string[];
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  actions: AIAction[];
  learningPattern?: any;
}

interface AIAction {
  type: 'command' | 'config_change' | 'restart' | 'alert' | 'none';
  description: string;
  command?: string;
  parameters?: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
}

export class AIService {
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor() {
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '4096');
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.7');
  }

  async analyzeServer(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      // 构建提示词
      const prompt = this.buildPrompt(request);

      // 调用OpenAI API
      const completion = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `你是一个专业的服务器维护AI助手。你的任务是分析服务器状态，识别问题，并提供解决方案。

你应该：
1. 仔细分析服务器指标和日志
2. 识别潜在问题和风险
3. 提供具体的、可执行的解决方案
4. 评估每个操作的风险级别
5. 判断是否需要人工审批

你的响应必须是JSON格式，包含以下字段：
{
  "analysis": "详细的分析说明",
  "recommendations": ["建议1", "建议2"],
  "confidence": 0.95,
  "riskLevel": "low|medium|high|critical",
  "actions": [
    {
      "type": "command|config_change|restart|alert|none",
      "description": "操作描述",
      "command": "要执行的命令（如果是command类型）",
      "parameters": {},
      "riskLevel": "low|medium|high|critical",
      "requiresApproval": false
    }
  ],
  "learningPattern": {
    "patternName": "模式名称",
    "patternType": "error_pattern|optimization_pattern|maintenance_pattern|security_pattern",
    "patternData": {}
  }
}`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        response_format: { type: 'json_object' },
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('AI响应为空');
      }

      const parsedResponse = JSON.parse(response);

      // 验证响应格式
      this.validateResponse(parsedResponse);

      // 记录AI操作
      await this.logAIOperation(request, parsedResponse);

      return parsedResponse;
    } catch (error) {
      console.error('AI分析失败:', error);
      throw error;
    }
  }

  private buildPrompt(request: AIAnalysisRequest): string {
    const { serverName, metrics, logs, taskType, promptTemplate, parameters } = request;

    // 替换模板变量
    let prompt = promptTemplate
      .replace('{{server_name}}', serverName)
      .replace('{{task_type}}', taskType);

    // 添加指标数据
    prompt += '\n\n## 服务器指标数据\n';
    prompt += JSON.stringify(metrics, null, 2);

    // 添加日志数据
    if (logs && logs.length > 0) {
      prompt += '\n\n## 相关日志\n';
      prompt += logs.join('\n');
    }

    // 添加参数
    if (parameters && Object.keys(parameters).length > 0) {
      prompt += '\n\n## 任务参数\n';
      prompt += JSON.stringify(parameters, null, 2);
    }

    prompt += '\n\n请分析以上数据，识别问题并提供解决方案。';

    return prompt;
  }

  private validateResponse(response: any): void {
    const requiredFields = ['analysis', 'recommendations', 'confidence', 'riskLevel', 'actions'];
    for (const field of requiredFields) {
      if (!(field in response)) {
        throw new Error(`AI响应缺少必需字段: ${field}`);
      }
    }

    if (typeof response.confidence !== 'number' || response.confidence < 0 || response.confidence > 1) {
      throw new Error('置信度必须是0-1之间的数字');
    }

    if (!['low', 'medium', 'high', 'critical'].includes(response.riskLevel)) {
      throw new Error('风险级别必须是low/medium/high/critical之一');
    }

    if (!Array.isArray(response.actions)) {
      throw new Error('操作列表必须是数组');
    }

    for (const action of response.actions) {
      if (!action.type || !action.description || !action.riskLevel) {
        throw new Error('每个操作必须包含type、description和riskLevel');
      }
    }
  }

  private async logAIOperation(request: AIAnalysisRequest, response: AIAnalysisResponse): Promise<void> {
    try {
      // 记录到数据库
      await query(
        `INSERT INTO ai_operations (server_id, operation_type, title, description, ai_prompt, ai_response, ai_confidence, ai_model, status, risk_level, is_automated, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          request.serverId,
          request.taskType,
          `AI分析: ${request.serverName}`,
          response.analysis,
          request.promptTemplate,
          JSON.stringify(response),
          response.confidence,
          this.model,
          'success',
          response.riskLevel,
          true,
          JSON.stringify({
            recommendations: response.recommendations,
            actions: response.actions,
          }),
        ]
      );

      // 发送WebSocket通知
      emitToOperations('operation:new', {
        server_id: request.serverId,
        type: request.taskType,
        confidence: response.confidence,
        risk_level: response.riskLevel,
      });
    } catch (error) {
      console.error('记录AI操作失败:', error);
    }
  }

  async learnFromOperation(operationId: string, success: boolean): Promise<void> {
    try {
      // 获取操作详情
      const operationResult = await query(
        'SELECT * FROM ai_operations WHERE id = $1',
        [operationId]
      );

      if (operationResult.rows.length === 0) {
        return;
      }

      const operation = operationResult.rows[0];
      const metadata = operation.metadata || {};

      // 提取学习模式
      if (metadata.learningPattern) {
        const pattern = metadata.learningPattern;

        // 检查模式是否已存在
        const existingPattern = await query(
          'SELECT id, usage_count, success_rate FROM ai_learning_patterns WHERE pattern_name = $1',
          [pattern.patternName]
        );

        if (existingPattern.rows.length > 0) {
          // 更新现有模式
          const existing = existingPattern.rows[0];
          const newUsageCount = existing.usage_count + 1;
          const newSuccessRate = success
            ? (existing.success_rate * existing.usage_count + 1) / newUsageCount
            : (existing.success_rate * existing.usage_count) / newUsageCount;

          await query(
            `UPDATE ai_learning_patterns 
             SET usage_count = $1, success_rate = $2, last_used_at = NOW(), updated_at = NOW()
             WHERE id = $3`,
            [newUsageCount, newSuccessRate, existing.id]
          );
        } else {
          // 创建新模式
          await query(
            `INSERT INTO ai_learning_patterns (pattern_name, pattern_type, pattern_data, success_rate, usage_count, last_used_at)
             VALUES ($1, $2, $3, $4, 1, NOW())`,
            [
              pattern.patternName,
              pattern.patternType,
              JSON.stringify(pattern.patternData),
              success ? 1.0 : 0.0,
            ]
          );
        }
      }
    } catch (error) {
      console.error('学习操作模式失败:', error);
    }
  }

  async getLearningPatterns(patternType?: string): Promise<any[]> {
    try {
      let queryStr = 'SELECT * FROM ai_learning_patterns WHERE is_active = true';
      const params: any[] = [];

      if (patternType) {
        queryStr += ' AND pattern_type = $1';
        params.push(patternType);
      }

      queryStr += ' ORDER BY success_rate DESC, usage_count DESC';

      const result = await query(queryStr, params);
      return result.rows;
    } catch (error) {
      console.error('获取学习模式失败:', error);
      return [];
    }
  }

  async suggestAction(serverId: string, problemType: string): Promise<AIAction | null> {
    try {
      // 查找相关的学习模式
      const patterns = await this.getLearningPatterns();
      const relevantPatterns = patterns.filter(p => {
        const patternData = p.pattern_data || {};
        return patternData.trigger && problemType.includes(patternData.trigger);
      });

      if (relevantPatterns.length === 0) {
        return null;
      }

      // 选择最成功的模式
      const bestPattern = relevantPatterns[0];
      const patternData = bestPattern.pattern_data || {};

      // 根据模式生成建议操作
      if (patternData.actions && patternData.actions.length > 0) {
        return {
          type: 'command',
          description: patternData.actions[0],
          command: patternData.actions[0],
          riskLevel: 'low',
          requiresApproval: bestPattern.success_rate < 0.8,
        };
      }

      return null;
    } catch (error) {
      console.error('生成建议操作失败:', error);
      return null;
    }
  }

  async generateReport(serverId: string, timeRange: string = '24h'): Promise<any> {
    try {
      // 获取服务器信息
      const serverResult = await query(
        'SELECT * FROM servers WHERE id = $1',
        [serverId]
      );

      if (serverResult.rows.length === 0) {
        throw new Error('服务器未找到');
      }

      const server = serverResult.rows[0];

      // 获取指标数据
      const metricsResult = await query(
        `SELECT * FROM server_metrics 
         WHERE server_id = $1 
         AND collected_at >= NOW() - INTERVAL '${timeRange}'
         ORDER BY collected_at DESC`,
        [serverId]
      );

      // 获取操作记录
      const operationsResult = await query(
        `SELECT * FROM ai_operations 
         WHERE server_id = $1 
         AND created_at >= NOW() - INTERVAL '${timeRange}'
         ORDER BY created_at DESC`,
        [serverId]
      );

      // 生成报告
      const report = {
        server: {
          id: server.id,
          name: server.name,
          hostname: server.hostname,
          status: server.status,
        },
        timeRange,
        generatedAt: new Date().toISOString(),
        metrics: {
          summary: this.summarizeMetrics(metricsResult.rows),
          data: metricsResult.rows,
        },
        operations: {
          total: operationsResult.rows.length,
          successful: operationsResult.rows.filter((op: any) => op.status === 'success').length,
          failed: operationsResult.rows.filter((op: any) => op.status === 'failed').length,
          recent: operationsResult.rows.slice(0, 10),
        },
        recommendations: await this.generateRecommendations(server, metricsResult.rows),
      };

      return report;
    } catch (error) {
      console.error('生成报告失败:', error);
      throw error;
    }
  }

  private summarizeMetrics(metrics: any[]): any {
    if (metrics.length === 0) {
      return {};
    }

    const latest = metrics[0];
    const avgCPU = metrics.reduce((sum, m) => sum + (m.cpu_usage || 0), 0) / metrics.length;
    const avgMemory = metrics.reduce((sum, m) => sum + (m.memory_usage || 0), 0) / metrics.length;
    const avgDisk = metrics.reduce((sum, m) => sum + (m.disk_usage || 0), 0) / metrics.length;

    return {
      current: {
        cpu: latest.cpu_usage,
        memory: latest.memory_usage,
        disk: latest.disk_usage,
      },
      average: {
        cpu: Math.round(avgCPU * 100) / 100,
        memory: Math.round(avgMemory * 100) / 100,
        disk: Math.round(avgDisk * 100) / 100,
      },
      peak: {
        cpu: Math.max(...metrics.map(m => m.cpu_usage || 0)),
        memory: Math.max(...metrics.map(m => m.memory_usage || 0)),
        disk: Math.max(...metrics.map(m => m.disk_usage || 0)),
      },
    };
  }

  private async generateRecommendations(server: any, metrics: any[]): Promise<string[]> {
    const recommendations: string[] = [];

    if (metrics.length === 0) {
      return recommendations;
    }

    const latest = metrics[0];

    // CPU建议
    if (latest.cpu_usage > 90) {
      recommendations.push('CPU使用率过高，建议检查高CPU进程并考虑优化或扩容');
    } else if (latest.cpu_usage > 70) {
      recommendations.push('CPU使用率较高，建议监控趋势并提前规划扩容');
    }

    // 内存建议
    if (latest.memory_usage > 90) {
      recommendations.push('内存使用率过高，建议检查内存泄漏或增加内存');
    } else if (latest.memory_usage > 70) {
      recommendations.push('内存使用率较高，建议优化内存使用或考虑扩容');
    }

    // 磁盘建议
    if (latest.disk_usage > 90) {
      recommendations.push('磁盘空间不足，建议清理临时文件或扩展存储');
    } else if (latest.disk_usage > 70) {
      recommendations.push('磁盘空间使用率较高，建议定期清理');
    }

    // 负载建议
    if (latest.load_average_1m > 10) {
      recommendations.push('系统负载过高，建议检查进程数量和资源使用');
    }

    return recommendations;
  }
}

export const aiService = new AIService();