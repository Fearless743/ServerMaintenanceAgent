package metrics

import (
	"testing"

	"github.com/Fearless743/ServerMaintenanceAgent/agent/internal/config"
)

func TestNewCollector(t *testing.T) {
	cfg := &config.MetricsConfig{
		CollectCPU:     true,
		CollectMemory:  true,
		CollectDisk:    true,
		CollectNetwork: true,
		CollectProcess: true,
		CollectLoad:    true,
		CollectUptime:  true,
	}

	collector, err := NewCollector(cfg)
	if err != nil {
		t.Fatalf("创建收集器失败: %v", err)
	}

	if collector == nil {
		t.Fatal("收集器不应为nil")
	}
}

func TestCollector_Collect(t *testing.T) {
	cfg := &config.MetricsConfig{
		CollectCPU:     true,
		CollectMemory:  true,
		CollectDisk:    true,
		CollectNetwork: true,
		CollectProcess: true,
		CollectLoad:    true,
		CollectUptime:  true,
	}

	collector, err := NewCollector(cfg)
	if err != nil {
		t.Fatalf("创建收集器失败: %v", err)
	}

	metrics, err := collector.Collect()
	if err != nil {
		t.Fatalf("收集指标失败: %v", err)
	}

	if metrics == nil {
		t.Fatal("指标不应为nil")
	}

	// 验证主机信息
	if metrics.Host.Hostname == "" {
		t.Error("主机名不应为空")
	}

	if metrics.Host.OS == "" {
		t.Error("操作系统不应为空")
	}

	// 验证CPU信息
	if metrics.CPU.Cores <= 0 {
		t.Error("CPU核心数应大于0")
	}

	// 验证内存信息
	if metrics.Memory.Total <= 0 {
		t.Error("内存总量应大于0")
	}

	// 验证磁盘信息
	if metrics.Disk.Total <= 0 {
		t.Error("磁盘总量应大于0")
	}

	// 验证负载信息
	if metrics.Load.Load1 < 0 {
		t.Error("负载不应为负数")
	}

	// 验证进程信息
	if metrics.Process.Total <= 0 {
		t.Error("进程数应大于0")
	}

	// 验证运行时间信息
	if metrics.Uptime.Uptime <= 0 {
		t.Error("运行时间应大于0")
	}
}

func TestCollector_CollectCPUOnly(t *testing.T) {
	cfg := &config.MetricsConfig{
		CollectCPU:     true,
		CollectMemory:  false,
		CollectDisk:    false,
		CollectNetwork: false,
		CollectProcess: false,
		CollectLoad:    false,
		CollectUptime:  false,
	}

	collector, err := NewCollector(cfg)
	if err != nil {
		t.Fatalf("创建收集器失败: %v", err)
	}

	metrics, err := collector.Collect()
	if err != nil {
		t.Fatalf("收集指标失败: %v", err)
	}

	// CPU应该被收集
	if metrics.CPU.Cores <= 0 {
		t.Error("CPU核心数应大于0")
	}

	// 内存应该为零值
	if metrics.Memory.Total != 0 {
		t.Error("内存总量应为0")
	}
}