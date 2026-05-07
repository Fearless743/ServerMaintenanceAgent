package metrics

import (
	"fmt"
	"os"
	"runtime"
	"time"

	"github.com/Fearless743/ServerMaintenanceAgent/agent/internal/config"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
	"github.com/shirou/gopsutil/v3/process"
)

type Metrics struct {
	Timestamp time.Time     `json:"timestamp"`
	Host      HostInfo      `json:"host"`
	CPU       CPUInfo       `json:"cpu"`
	Memory    MemoryInfo    `json:"memory"`
	Disk      DiskInfo      `json:"disk"`
	Network   NetworkInfo   `json:"network"`
	Load      LoadInfo      `json:"load"`
	Process   ProcessInfo   `json:"process"`
	Uptime    UptimeInfo    `json:"uptime"`
}

type HostInfo struct {
	Hostname        string `json:"hostname"`
	OS              string `json:"os"`
	Platform        string `json:"platform"`
	PlatformVersion string `json:"platform_version"`
	Architecture    string `json:"architecture"`
}

type CPUInfo struct {
	Usage       float64   `json:"usage"`
	Cores       int       `json:"cores"`
	ModelName   string    `json:"model_name"`
	Mhz         float64   `json:"mhz"`
	Times       CPUTimes  `json:"times"`
}

type CPUTimes struct {
	User   float64 `json:"user"`
	System float64 `json:"system"`
	Idle   float64 `json:"idle"`
}

type MemoryInfo struct {
	Total        uint64  `json:"total"`
	Used         uint64  `json:"used"`
	Available    uint64  `json:"available"`
	UsedPercent  float64 `json:"used_percent"`
	SwapTotal    uint64  `json:"swap_total"`
	SwapUsed     uint64  `json:"swap_used"`
	SwapFree     uint64  `json:"swap_free"`
}

type DiskInfo struct {
	Total        uint64            `json:"total"`
	Used         uint64            `json:"used"`
	Free         uint64            `json:"free"`
	UsedPercent  float64           `json:"used_percent"`
	Partitions   []DiskPartition   `json:"partitions"`
}

type DiskPartition struct {
	Device      string  `json:"device"`
	Mountpoint  string  `json:"mountpoint"`
	Fstype      string  `json:"fstype"`
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	UsedPercent float64 `json:"used_percent"`
}

type NetworkInfo struct {
	BytesSent   uint64        `json:"bytes_sent"`
	BytesRecv   uint64        `json:"bytes_recv"`
	PacketsSent uint64        `json:"packets_sent"`
	PacketsRecv uint64        `json:"packets_recv"`
	Interfaces  []NetworkInterface `json:"interfaces"`
}

type NetworkInterface struct {
	Name      string   `json:"name"`
	BytesSent uint64   `json:"bytes_sent"`
	BytesRecv uint64   `json:"bytes_recv"`
	Status    string   `json:"status"`
	Addresses []string `json:"addresses"`
}

type LoadInfo struct {
	Load1  float64 `json:"load1"`
	Load5  float64 `json:"load5"`
	Load15 float64 `json:"load15"`
}

type ProcessInfo struct {
	Total       int              `json:"total"`
	Running     int              `json:"running"`
	Sleeping    int              `json:"sleeping"`
	Stopped     int              `json:"stopped"`
	Zombie      int              `json:"zombie"`
	TopCPU      []ProcessDetail  `json:"top_cpu"`
	TopMemory   []ProcessDetail  `json:"top_memory"`
}

type ProcessDetail struct {
	PID        int32   `json:"pid"`
	Name       string  `json:"name"`
	Username   string  `json:"username"`
	CPUPercent float64 `json:"cpu_percent"`
	MemPercent float32 `json:"mem_percent"`
	Status     string  `json:"status"`
}

type UptimeInfo struct {
	Uptime       uint64    `json:"uptime"`
	BootTime     uint64    `json:"boot_time"`
	LastBootTime time.Time `json:"last_boot_time"`
}

type Collector struct {
	config *config.MetricsConfig
}

func NewCollector(config *config.MetricsConfig) (*Collector, error) {
	return &Collector{
		config: config,
	}, nil
}

func (c *Collector) Collect() (*Metrics, error) {
	metrics := &Metrics{
		Timestamp: time.Now(),
	}

	// 收集主机信息
	if err := c.collectHostInfo(metrics); err != nil {
		return nil, fmt.Errorf("收集主机信息失败: %w", err)
	}

	// 收集CPU信息
	if c.config.CollectCPU {
		if err := c.collectCPUInfo(metrics); err != nil {
			return nil, fmt.Errorf("收集CPU信息失败: %w", err)
		}
	}

	// 收集内存信息
	if c.config.CollectMemory {
		if err := c.collectMemoryInfo(metrics); err != nil {
			return nil, fmt.Errorf("收集内存信息失败: %w", err)
		}
	}

	// 收集磁盘信息
	if c.config.CollectDisk {
		if err := c.collectDiskInfo(metrics); err != nil {
			return nil, fmt.Errorf("收集磁盘信息失败: %w", err)
		}
	}

	// 收集网络信息
	if c.config.CollectNetwork {
		if err := c.collectNetworkInfo(metrics); err != nil {
			return nil, fmt.Errorf("收集网络信息失败: %w", err)
		}
	}

	// 收集负载信息
	if c.config.CollectLoad {
		if err := c.collectLoadInfo(metrics); err != nil {
			return nil, fmt.Errorf("收集负载信息失败: %w", err)
		}
	}

	// 收集进程信息
	if c.config.CollectProcess {
		if err := c.collectProcessInfo(metrics); err != nil {
			return nil, fmt.Errorf("收集进程信息失败: %w", err)
		}
	}

	// 收集运行时间信息
	if c.config.CollectUptime {
		if err := c.collectUptimeInfo(metrics); err != nil {
			return nil, fmt.Errorf("收集运行时间信息失败: %w", err)
		}
	}

	return metrics, nil
}

func (c *Collector) collectHostInfo(metrics *Metrics) error {
	hostname, err := os.Hostname()
	if err != nil {
		hostname = "unknown"
	}

	hostInfo, err := host.Info()
	if err != nil {
		return err
	}

	metrics.Host = HostInfo{
		Hostname:        hostname,
		OS:              runtime.GOOS,
		Platform:        hostInfo.Platform,
		PlatformVersion: hostInfo.PlatformVersion,
		Architecture:    runtime.GOARCH,
	}

	return nil
}

func (c *Collector) collectCPUInfo(metrics *Metrics) error {
	// 获取CPU使用率
	percent, err := cpu.Percent(time.Second, false)
	if err != nil {
		return err
	}

	usage := 0.0
	if len(percent) > 0 {
		usage = percent[0]
	}

	// 获取CPU信息
	cpuInfos, err := cpu.Info()
	if err != nil {
		return err
	}

	modelName := ""
	mhz := 0.0
	if len(cpuInfos) > 0 {
		modelName = cpuInfos[0].ModelName
		mhz = cpuInfos[0].Mhz
	}

	// 获取CPU时间
	times, err := cpu.Times(false)
	if err != nil {
		return err
	}

	cpuTimes := CPUTimes{}
	if len(times) > 0 {
		cpuTimes = CPUTimes{
			User:   times[0].User,
			System: times[0].System,
			Idle:   times[0].Idle,
		}
	}

	metrics.CPU = CPUInfo{
		Usage:     usage,
		Cores:     runtime.NumCPU(),
		ModelName: modelName,
		Mhz:       mhz,
		Times:     cpuTimes,
	}

	return nil
}

func (c *Collector) collectMemoryInfo(metrics *Metrics) error {
	memInfo, err := mem.VirtualMemory()
	if err != nil {
		return err
	}

	swapInfo, err := mem.SwapMemory()
	if err != nil {
		return err
	}

	metrics.Memory = MemoryInfo{
		Total:       memInfo.Total,
		Used:        memInfo.Used,
		Available:   memInfo.Available,
		UsedPercent: memInfo.UsedPercent,
		SwapTotal:   swapInfo.Total,
		SwapUsed:    swapInfo.Used,
		SwapFree:    swapInfo.Free,
	}

	return nil
}

func (c *Collector) collectDiskInfo(metrics *Metrics) error {
	// 获取根分区信息
	usage, err := disk.Usage("/")
	if err != nil {
		return err
	}

	metrics.Disk = DiskInfo{
		Total:       usage.Total,
		Used:        usage.Used,
		Free:        usage.Free,
		UsedPercent: usage.UsedPercent,
	}

	// 获取所有分区信息
	partitions, err := disk.Partitions(false)
	if err != nil {
		return err
	}

	for _, p := range partitions {
		usage, err := disk.Usage(p.Mountpoint)
		if err != nil {
			continue
		}

		metrics.Disk.Partitions = append(metrics.Disk.Partitions, DiskPartition{
			Device:      p.Device,
			Mountpoint:  p.Mountpoint,
			Fstype:      p.Fstype,
			Total:       usage.Total,
			Used:        usage.Used,
			Free:        usage.Free,
			UsedPercent: usage.UsedPercent,
		})
	}

	return nil
}

func (c *Collector) collectNetworkInfo(metrics *Metrics) error {
	// 获取网络IO计数器
	ioCounters, err := net.IOCounters(false)
	if err != nil {
		return err
	}

	if len(ioCounters) > 0 {
		metrics.Network = NetworkInfo{
			BytesSent:   ioCounters[0].BytesSent,
			BytesRecv:   ioCounters[0].BytesRecv,
			PacketsSent: ioCounters[0].PacketsSent,
			PacketsRecv: ioCounters[0].PacketsRecv,
		}
	}

	// 获取网络接口信息
	interfaces, err := net.Interfaces()
	if err != nil {
		return err
	}

	for _, iface := range interfaces {
		// 跳过回环接口
		if iface.Flags&net.FlagLoopback != 0 {
			continue
		}

		addrs := make([]string, 0)
		for _, addr := range iface.Addrs {
			addrs = append(addrs, addr.Addr)
		}

		status := "down"
		if iface.Flags&net.FlagUp != 0 {
			status = "up"
		}

		metrics.Network.Interfaces = append(metrics.Network.Interfaces, NetworkInterface{
			Name:      iface.Name,
			Status:    status,
			Addresses: addrs,
		})
	}

	return nil
}

func (c *Collector) collectLoadInfo(metrics *Metrics) error {
	loadAvg, err := load.Avg()
	if err != nil {
		return err
	}

	metrics.Load = LoadInfo{
		Load1:  loadAvg.Load1,
		Load5:  loadAvg.Load5,
		Load15: loadAvg.Load15,
	}

	return nil
}

func (c *Collector) collectProcessInfo(metrics *Metrics) error {
	pids, err := process.Pids()
	if err != nil {
		return err
	}

	metrics.Process.Total = len(pids)

	// 获取进程详细信息
	topCPU := make([]ProcessDetail, 0)
	topMemory := make([]ProcessDetail, 0)

	for _, pid := range pids {
		p, err := process.NewProcess(pid)
		if err != nil {
			continue
		}

		name, _ := p.Name()
		username, _ := p.Username()
		status, _ := p.Status()
		cpuPercent, _ := p.CPUPercent()
		memPercent, _ := p.MemoryPercent()

		detail := ProcessDetail{
			PID:        pid,
			Name:       name,
			Username:   username,
			CPUPercent: cpuPercent,
			MemPercent: memPercent,
			Status:     status,
		}

		// 统计进程状态
		switch status {
		case "running":
			metrics.Process.Running++
		case "sleeping":
			metrics.Process.Sleeping++
		case "stopped":
			metrics.Process.Stopped++
		case "zombie":
			metrics.Process.Zombie++
		}

		// 添加到Top CPU列表
		if len(topCPU) < 5 {
			topCPU = append(topCPU, detail)
		} else {
			// 替换最小的
			minIdx := 0
			for i, p := range topCPU {
				if p.CPUPercent < topCPU[minIdx].CPUPercent {
					minIdx = i
				}
			}
			if cpuPercent > topCPU[minIdx].CPUPercent {
				topCPU[minIdx] = detail
			}
		}

		// 添加到Top Memory列表
		if len(topMemory) < 5 {
			topMemory = append(topMemory, detail)
		} else {
			// 替换最小的
			minIdx := 0
			for i, p := range topMemory {
				if p.MemPercent < topMemory[minIdx].MemPercent {
					minIdx = i
				}
			}
			if memPercent > topMemory[minIdx].MemPercent {
				topMemory[minIdx] = detail
			}
		}
	}

	metrics.Process.TopCPU = topCPU
	metrics.Process.TopMemory = topMemory

	return nil
}

func (c *Collector) collectUptimeInfo(metrics *Metrics) error {
	uptime, err := host.Uptime()
	if err != nil {
		return err
	}

	bootTime, err := host.BootTime()
	if err != nil {
		return err
	}

	metrics.Uptime = UptimeInfo{
		Uptime:       uptime,
		BootTime:     bootTime,
		LastBootTime: time.Unix(int64(bootTime), 0),
	}

	return nil
}