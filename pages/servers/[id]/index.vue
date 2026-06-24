<template>
  <div class="detail-page">
    <!-- Back -->
    <NuxtLink to="/" class="back-link">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      返回总览
    </NuxtLink>

    <div v-if="pending" class="loading-state">
      <div class="loading-spinner" />
      <span>加载中...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <p>加载失败：{{ error.message }}</p>
      <button @click="refresh()">重试</button>
    </div>

    <template v-else-if="server">
      <!-- Hero Section -->
      <header class="detail-hero glass-card glow-border">
        <div class="hero-top">
          <div class="hero-id">
            <span class="status-dot" :class="server.status" />
            <div>
              <h1 class="hero-name">{{ server.name }}</h1>
              <p class="hero-host">{{ server.hostname }} · {{ server.ip }}</p>
            </div>
          </div>
          <div class="hero-badge" :class="`badge-${server.status}`">
            {{ statusText }}
          </div>
        </div>

        <div class="hero-metrics">
          <div class="hero-gauge-group">
            <GaugeRing :value="server.cpu.usage" :max="100" sub="CPU" />
            <GaugeRing :value="server.memory.usage" :max="100" sub="内存" />
            <GaugeRing :value="server.disk.usage" :max="100" sub="磁盘" />
          </div>

          <div class="hero-info-grid">
            <div class="info-item">
              <span class="info-label">操作系统</span>
              <span class="info-value">{{ server.os }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">内核版本</span>
              <span class="info-value">{{ server.kernel }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">系统架构</span>
              <span class="info-value metric-value">{{ server.cpu.architecture || 'x86_64' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">CPU 型号</span>
              <span class="info-value">{{ server.cpu.model }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">CPU 核心 / 线程</span>
              <span class="info-value">{{ server.cpu.cores }}C / {{ server.cpu.threads }}T</span>
            </div>
            <div class="info-item">
              <span class="info-label">内存总量</span>
              <span class="info-value">{{ server.memory.total }} GB</span>
            </div>
            <div class="info-item">
              <span class="info-label">Swap</span>
              <span class="info-value" :class="{ 'text-warn': server.swap.usage > 50 }">
                {{ server.swap.used }} / {{ server.swap.total }} GB ({{ server.swap.usage.toFixed(0) }}%)
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">磁盘总量</span>
              <span class="info-value">{{ server.disk.total }} GB</span>
            </div>
            <div class="info-item">
              <span class="info-label">磁盘读写</span>
              <span class="info-value">读 {{ (server.disk.readSpeed||0).toFixed(0) }} MB/s · 写 {{ (server.disk.writeSpeed||0).toFixed(0) }} MB/s</span>
            </div>
            <div class="info-item">
              <span class="info-label">CPU 温度</span>
              <span class="info-value" :class="{ 'text-warn': server.cpu.temperature > 70, 'text-danger': server.cpu.temperature > 80 }">
                {{ server.cpu.temperature.toFixed(1) }}°C
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">运行时间</span>
              <span class="info-value">{{ formatUptime(server.uptime) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">上次启动</span>
              <span class="info-value">{{ formatBoot(server.lastBoot || server.lastBoot) }}</span>
            </div>
          </div>
        </div>
      </header>

      <!-- 错误信息 -->
      <div v-if="server.collectError" class="error-banner">
        <span>⚠️ 采集警告: {{ server.collectError }}</span>
      </div>

      <!-- Docker 入口 -->
      <div class="docker-cta">
        <nuxt-link :to="`/servers/${server.id}/docker`" class="docker-link glass-card">
          <span class="docker-icon">🐳</span>
          <div>
            <span class="docker-link-title">查看 Docker 容器</span>
            <span class="docker-link-sub">查看该服务器上的所有容器、镜像及运行状态</span>
          </div>
          <span class="docker-arrow">→</span>
        </nuxt-link>
      </div>

      <!-- Charts Grid -->
      <ClientOnly>
        <section class="charts-section">
          <h2 class="section-title">历史指标趋势</h2>
          <div class="charts-grid">
            <MetricChart
              title="CPU 使用率"
              :value="`${server.cpu.usage.toFixed(1)}%`"
              :option="buildLineOption(server.timestamps, server.history.cpu, '#00d4ff', '%')"
            />
            <MetricChart
              title="内存使用率"
              :value="`${server.memory.usage.toFixed(1)}%`"
              :option="buildLineOption(server.timestamps, server.history.memory, '#7c5ce7', '%')"
            />
            <MetricChart
              title="磁盘使用率"
              :value="`${server.disk.usage.toFixed(1)}%`"
              :option="buildLineOption(server.timestamps, server.history.disk, '#ff6d37', '%')"
            />
            <MetricChart
              title="负载均值"
              :value="server.load.load1.toFixed(1)"
              :option="buildLineOption(server.timestamps, server.history.load, '#ffab00', '')"
            />
            <MetricChart
              title="网络流量"
              :value="`↓${formatTraffic(server.network.rx)} ↑${formatTraffic(server.network.tx)}`"
              :option="buildDualLineOption(server.timestamps, server.history.network_rx, server.history.network_tx, 'RX', 'TX')"
            />
            <MetricChart
              title="Swap 使用率"
              :value="`${server.swap.usage.toFixed(1)}%`"
              :option="buildLineOption(server.timestamps, server.history.swap, '#7c5ce7', '%')"
            />
            <MetricChart
              title="磁盘 IOPS"
              :value="server.disk.iops.toLocaleString()"
              :option="buildLineOption(server.timestamps, server.history.iops, '#00e676', '')"
            />
            <MetricChart
              title="网络连接数"
              :value="server.network.connections.toLocaleString()"
              :option="buildLineOption(server.timestamps, server.history.connections, '#00b0ff', '')"
            />
            <MetricChart
              title="上下文切换"
              :value="(server.contextSwitches?.voluntary || 0).toLocaleString()"
              :option="buildLineOption(server.timestamps, server.history.contextSwitches || [], '#ffab00', '')"
            />
            <MetricChart
              title="CPU 温度"
              :value="`${server.cpu.temperature.toFixed(1)}°C`"
              :option="buildLineOption(server.timestamps, server.history.temperature, '#ff5252', '°C')"
            />
          </div>
        </section>
        <template #fallback>
          <div class="charts-loading">
            <div class="loading-spinner" />
            <span>加载图表中...</span>
          </div>
        </template>
      </ClientOnly>

      <!-- Table Section -->
      <section class="tables-section">
        <div class="table-group">
          <h2 class="section-title">系统信息</h2>
          <div class="mini-table glass-card">
            <table>
              <thead>
                <tr><th>项目</th><th>详情</th></tr>
              </thead>
              <tbody>
                <tr><td>主机名</td><td class="metric-value">{{ server.hostname }}</td></tr>
                <tr><td>操作系统</td><td>{{ server.os }}</td></tr>
                <tr><td>内核</td><td class="metric-value">{{ server.kernel }}</td></tr>
                <tr><td>架构</td><td class="metric-value">{{ server.cpu.architecture || 'x86_64' }}</td></tr>
                <tr><td>CPU</td><td>{{ server.cpu.model }} · {{ server.cpu.cores }}C/{{ server.cpu.threads }}T</td></tr>
                <tr><td>启动时间</td><td>{{ formatBoot(server.lastBoot) }}</td></tr>
                <tr><td>运行时间</td><td>{{ formatUptime(server.uptime) }}</td></tr>
                <tr><td>上下文切换</td><td class="metric-value">自愿 {{ (server.contextSwitches?.voluntary||0).toLocaleString() }} · 非自愿 {{ (server.contextSwitches?.involuntary||0).toLocaleString() }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="table-group">
          <h2 class="section-title">系统负载 (Load Average)</h2>
          <div class="mini-table glass-card">
            <table>
              <thead>
                <tr><th>指标</th><th>1 分钟</th><th>5 分钟</th><th>15 分钟</th></tr>
              </thead>
              <tbody>
                <tr><td>Load</td><td class="metric-value">{{ server.load.load1.toFixed(2) }}</td><td class="metric-value">{{ server.load.load5.toFixed(2) }}</td><td class="metric-value">{{ server.load.load15.toFixed(2) }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="table-group">
          <h2 class="section-title">内存与 Swap</h2>
          <div class="mini-table glass-card">
            <table>
              <thead>
                <tr><th>类型</th><th>总量</th><th>已用</th><th>可用</th><th>缓存</th><th>使用率</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>内存</td>
                  <td class="metric-value">{{ server.memory.total }} GB</td>
                  <td class="metric-value">{{ server.memory.used }} GB</td>
                  <td class="metric-value" style="color:var(--status-ok)">{{ server.memory.free || (server.memory.total - server.memory.used).toFixed(1) }} GB</td>
                  <td class="metric-value">{{ server.memory.cached }} GB</td>
                  <td class="metric-value" :style="{ color: server.memory.usage > 90 ? 'var(--status-critical)' : 'var(--text-primary)' }">{{ server.memory.usage.toFixed(1) }}%</td>
                </tr>
                <tr>
                  <td>Swap</td>
                  <td class="metric-value">{{ server.swap.total }} GB</td>
                  <td class="metric-value">{{ server.swap.used }} GB</td>
                  <td class="metric-value" style="color:var(--status-ok)">{{ server.swap.free || (server.swap.total - server.swap.used).toFixed(1) }} GB</td>
                  <td class="metric-value">-</td>
                  <td class="metric-value" :style="{ color: server.swap.usage > 50 ? 'var(--status-warn)' : 'var(--text-primary)' }">{{ server.swap.usage.toFixed(1) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="table-group">
          <h2 class="section-title">进程信息</h2>
          <div class="mini-table glass-card">
            <table>
              <thead>
                <tr><th>指标</th><th>总数</th><th>运行中</th><th>休眠</th><th>停止</th><th>僵尸</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>进程</td>
                  <td class="metric-value">{{ server.processes.total }}</td>
                  <td class="metric-value" style="color:var(--status-ok)">{{ server.processes.running }}</td>
                  <td class="metric-value">{{ server.processes.sleeping || 0 }}</td>
                  <td class="metric-value">{{ server.processes.stopped || 0 }}</td>
                  <td class="metric-value" :style="{ color: server.processes.zombie > 0 ? 'var(--status-critical)' : 'var(--text-muted)' }">{{ server.processes.zombie }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="table-group" v-if="server.disk.partitions && server.disk.partitions.length > 0">
          <h2 class="section-title">磁盘分区详情</h2>
          <div class="mini-table glass-card">
            <table>
              <thead>
                <tr><th>挂载点</th><th>设备</th><th>文件系统</th><th>总量</th><th>已用</th><th>使用率</th></tr>
              </thead>
              <tbody>
                <tr v-for="p in server.disk.partitions" :key="p.mount">
                  <td class="metric-value">{{ p.mount }}</td>
                  <td class="metric-value">{{ p.device }}</td>
                  <td>{{ p.fsType }}</td>
                  <td class="metric-value">{{ p.total }} GB</td>
                  <td class="metric-value">{{ p.used }} GB</td>
                  <td class="metric-value" :style="{ color: p.usage > 90 ? 'var(--status-critical)' : p.usage > 80 ? 'var(--status-warn)' : 'var(--text-primary)' }">{{ p.usage.toFixed(1) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="table-group" v-if="server.network.interfaces && server.network.interfaces.length > 0">
          <h2 class="section-title">网络接口详情</h2>
          <div class="mini-table glass-card">
            <table>
              <thead>
                <tr><th>接口</th><th>IP 地址</th><th>RX 速率</th><th>TX 速率</th><th>总接收</th><th>总发送</th></tr>
              </thead>
              <tbody>
                <tr v-for="iface in server.network.interfaces" :key="iface.name">
                  <td class="metric-value">{{ iface.name }}</td>
                  <td class="metric-value">{{ iface.ip || '—' }}</td>
                  <td class="metric-value">{{ formatTraffic(iface.rx) }}</td>
                  <td class="metric-value">{{ formatTraffic(iface.tx) }}</td>
                  <td class="metric-value">{{ formatBytesTotal(iface.rxTotal || 0) }}</td>
                  <td class="metric-value">{{ formatBytesTotal(iface.txTotal || 0) }}</td>
                </tr>
                <tr v-if="server.network.tcpConnections != null">
                  <td colspan="2">TCP 连接: {{ server.network.tcpConnections }}</td>
                  <td colspan="2">UDP 连接: {{ server.network.udpConnections }}</td>
                  <td colspan="2">总连接: {{ server.network.connections.toLocaleString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="table-group">
          <h2 class="section-title">关键服务状态</h2>
          <div class="mini-table glass-card">
            <table>
              <thead>
                <tr><th>服务</th><th>状态</th><th>PID</th></tr>
              </thead>
              <tbody>
                <tr v-for="svc in server.services" :key="svc.name">
                  <td class="metric-value">{{ svc.name }}</td>
                  <td>
                    <span class="svc-status" :class="`svc-${svc.status}`">
                      {{ svc.status === 'active' ? '运行中' : svc.status === 'inactive' ? '未激活' : '故障' }}
                    </span>
                  </td>
                  <td class="metric-value">{{ svc.pid }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ServerDetail } from '~/types/server'

const route = useRoute()
const { data, pending, error, refresh } = await useFetch<ServerDetail>(`/api/servers/${route.params.id}`, { lazy: true })
const server = computed(() => data.value ?? null)

const statusText = computed(() => {
  switch (server.value?.status) {
    case 'online': return '运行中'
    case 'warning': return '警告'
    case 'critical': return '严重'
    default: return '未知'
  }
})

// ---- Chart helpers ----
function timeLabels(timestamps: string[]): string[] {
  return timestamps.map(t => {
    const d = new Date(t)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  })
}

function buildLineOption(timestamps: string[], data: number[], color: string, unit: string) {
  return {
    tooltip: { trigger: 'axis' as const },
    grid: { top: 8, right: 16, bottom: 24, left: 40 },
    xAxis: {
      type: 'category' as const,
      data: timeLabels(timestamps),
      axisLine: { lineStyle: { color: '#1e2a40' } },
      axisTick: { show: false },
      axisLabel: { color: '#556580', fontSize: 10, interval: 'auto' as const },
    },
    yAxis: {
      type: 'value' as const,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#1c2338' } },
      axisLabel: { color: '#556580', fontSize: 10 },
    },
    series: [{
      type: 'line' as const,
      data,
      smooth: true,
      symbol: 'none' as const,
      lineStyle: { color, width: 2 },
      areaStyle: { color: color + '15' },
    }],
  }
}

function buildDualLineOption(timestamps: string[], rx: number[], tx: number[], rxLabel: string, txLabel: string) {
  return {
    tooltip: { trigger: 'axis' as const },
    grid: { top: 8, right: 16, bottom: 24, left: 40 },
    xAxis: {
      type: 'category' as const,
      data: timeLabels(timestamps),
      axisLine: { lineStyle: { color: '#1e2a40' } },
      axisTick: { show: false },
      axisLabel: { color: '#556580', fontSize: 10, interval: 'auto' as const },
    },
    yAxis: {
      type: 'value' as const,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#1c2338' } },
      axisLabel: { color: '#556580', fontSize: 10 },
    },
    legend: {
      textStyle: { color: '#8896b4', fontSize: 10 },
      top: 0,
    },
    series: [
      {
        name: rxLabel,
        type: 'line' as const,
        data: rx,
        smooth: true,
        symbol: 'none' as const,
        lineStyle: { color: '#00e676', width: 1.5 },
      },
      {
        name: txLabel,
        type: 'line' as const,
        data: tx,
        smooth: true,
        symbol: 'none' as const,
        lineStyle: { color: '#00d4ff', width: 1.5 },
      },
    ],
  }
}

// ---- formatters ----
function formatUptime(s: number): string {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d} 天 ${h} 小时 ${m} 分`
  if (h > 0) return `${h} 小时 ${m} 分`
  return `${m} 分`
}
function formatBoot(isoStr: string | undefined): string {
  if (!isoStr) return '未知'
  const d = new Date(isoStr)
  return d.toLocaleString('zh-CN', { hour12: false })
}
function formatTraffic(mbs: number): string {
  if (mbs >= 1000) return `${(mbs / 1000).toFixed(1)} Gbps`
  if (mbs >= 1) return `${mbs.toFixed(1)} Mbps`
  return `${(mbs * 1000).toFixed(0)} Kbps`
}
function formatBytesTotal(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`
  return `${bytes} B`
}
</script>

<style scoped>
.detail-page {
  max-width: 1280px;
  margin: 0 auto;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 13px;
  margin-bottom: 20px;
  transition: color 0.2s;
}
.back-link:hover { color: var(--accent-primary); }

.loading-state, .error-state {
  text-align: center;
  padding: 80px 0;
  color: var(--text-muted);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-default);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Hero */
.detail-hero {
  padding: 28px 32px;
  margin-bottom: 28px;
}

.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.hero-id {
  display: flex;
  align-items: center;
  gap: 14px;
}

.hero-id .status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.hero-id .status-dot.online { background: var(--status-ok); box-shadow: 0 0 14px var(--status-ok); }
.hero-id .status-dot.warning { background: var(--status-warn); box-shadow: 0 0 14px var(--status-warn); }
.hero-id .status-dot.critical { background: var(--status-critical); box-shadow: 0 0 14px var(--status-critical); animation: pulse-glow 1.5s ease-in-out infinite; }

.hero-name {
  font-size: 24px;
  font-weight: 800;
  color: var(--text-accent);
  letter-spacing: -0.02em;
}

.hero-host {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}

.hero-badge {
  padding: 5px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
}
.badge-online { background: rgba(0,230,118,0.12); color: var(--status-ok); border: 1px solid rgba(0,230,118,0.25); }
.badge-warning { background: rgba(255,171,0,0.12); color: var(--status-warn); border: 1px solid rgba(255,171,0,0.25); }
.badge-critical { background: rgba(255,61,79,0.12); color: var(--status-critical); border: 1px solid rgba(255,61,79,0.25); }

.hero-metrics {
  display: flex;
  gap: 40px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.hero-gauge-group {
  display: flex;
  gap: 24px;
}

.hero-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 28px;
  flex: 1;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.info-value {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}

.text-warn { color: var(--status-warn) !important; }
.text-danger { color: var(--status-critical) !important; }

/* Error banner */
.error-banner {
  padding: 12px 20px;
  background: rgba(255, 171, 0, 0.1);
  border: 1px solid rgba(255, 171, 0, 0.25);
  border-radius: var(--radius-sm);
  color: var(--status-warn);
  font-size: 13px;
  margin-bottom: 16px;
}

/* Docker CTA */
.docker-cta {
  margin-bottom: 24px;
}

.docker-link {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 24px;
  text-decoration: none;
  transition: all 0.25s;
}
.docker-link:hover {
  border-color: var(--accent-primary);
  box-shadow: var(--glow-accent);
}

.docker-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.docker-link-title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-accent);
}

.docker-link-sub {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.docker-arrow {
  margin-left: auto;
  font-size: 20px;
  color: var(--text-muted);
  transition: color 0.2s;
}
.docker-link:hover .docker-arrow {
  color: var(--accent-primary);
}

/* Charts */
.charts-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-accent);
  margin-bottom: 14px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

/* Tables */
.tables-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}

.mini-table {
  padding: 16px 20px;
  overflow-x: auto;
}

.mini-table table {
  width: 100%;
  border-collapse: collapse;
}

.mini-table th {
  text-align: left;
  font-size: 11px;
  color: var(--text-muted);
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-subtle);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.mini-table td {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.mini-table tr:last-child td { border-bottom: none; }

.svc-status {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}
.svc-active { background: rgba(0,230,118,0.12); color: var(--status-ok); }
.svc-inactive { background: var(--bg-overlay); color: var(--text-muted); }
.svc-failed { background: rgba(255,61,79,0.12); color: var(--status-critical); }
</style>
