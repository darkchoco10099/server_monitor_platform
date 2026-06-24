<template>
  <div class="server-card glass-card" :class="[`status-${server.status}`]" @click="$emit('click')">

    <!-- Header -->
    <div class="card-header">
      <div class="server-identity">
        <span class="status-indicator" :class="server.status" />
        <div>
          <div class="server-name">{{ server.name }}</div>
          <div class="server-meta">{{ server.ip }} · {{ server.os }}</div>
        </div>
      </div>
      <div class="header-right">
        <span v-if="server.pending" class="loading-spinner-sm" />
        <div v-else class="uptime">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          <span>{{ formatUptime(server.uptime) }}</span>
        </div>
      </div>
    </div>

    <!-- CPU Section -->
    <div class="metric-section">
      <div class="metric-header">
        <span class="metric-label">
          <span class="label-dot cpu" />
          CPU · {{ server.cpu.model }}
        </span>
        <span class="metric-extra">{{ server.cpu.cores }}C / {{ server.cpu.threads }}T</span>
      </div>
      <div class="bar-row">
        <div class="bar-track">
          <div class="bar-fill cpu" :style="{ width: server.cpu.usage + '%' }" />
        </div>
        <span class="bar-value metric-value">{{ server.cpu.usage.toFixed(1) }}%</span>
      </div>
      <div class="metric-sub">
        <span>{{ server.cpu.temperature.toFixed(1) }}°C</span>
        <span>{{ server.load.load1.toFixed(1) }} / {{ server.load.load5.toFixed(1) }} / {{ server.load.load15.toFixed(1) }}</span>
      </div>
    </div>

    <!-- Memory -->
    <div class="metric-section">
      <div class="metric-header">
        <span class="metric-label">
          <span class="label-dot mem" />
          内存
        </span>
        <span class="metric-extra">{{ formatBytes(server.memory.total) }}</span>
      </div>
      <div class="bar-row">
        <div class="bar-track">
          <div class="bar-fill mem" :style="{ width: server.memory.usage + '%' }" />
        </div>
        <span class="bar-value metric-value">{{ server.memory.usage.toFixed(1) }}%</span>
      </div>
      <div class="metric-sub">
        <span>已用 {{ formatBytes(server.memory.used) }}</span>
        <span>缓存 {{ formatBytes(server.memory.cached) }}</span>
      </div>
    </div>

    <!-- Disk -->
    <div class="metric-section">
      <div class="metric-header">
        <span class="metric-label">
          <span class="label-dot disk" />
          磁盘
        </span>
        <span class="metric-extra">{{ formatBytes(server.disk.total) }}</span>
      </div>
      <div class="bar-row">
        <div class="bar-track">
          <div class="bar-fill disk" :style="{ width: server.disk.usage + '%' }" />
        </div>
        <span class="bar-value metric-value">{{ server.disk.usage.toFixed(1) }}%</span>
      </div>
      <div class="metric-sub">
        <span>已用 {{ formatBytes(server.disk.used) }}</span>
        <span>IOPS {{ server.disk.iops.toLocaleString() }}</span>
      </div>
    </div>

    <!-- Network -->
    <div class="network-section">
      <div class="net-stat">
        <span class="net-arrow down">↓</span>
        <span class="net-value metric-value">{{ formatTraffic(server.network.rx) }}</span>
        <span class="net-label">RX</span>
      </div>
      <div class="net-stat">
        <span class="net-arrow up">↑</span>
        <span class="net-value metric-value">{{ formatTraffic(server.network.tx) }}</span>
        <span class="net-label">TX</span>
      </div>
      <div class="net-stat">
        <span class="net-value metric-value">{{ server.network.connections.toLocaleString() }}</span>
        <span class="net-label">连接</span>
      </div>
    </div>

    <!-- Process footer -->
    <div class="card-footer">
      <span>进程 {{ server.processes.total }} · 运行 {{ server.processes.running }}</span>
      <span v-if="server.processes.zombie > 0" class="zombie-warn">僵尸 {{ server.processes.zombie }}</span>
      <span v-if="server.swap.usage > 50" class="swap-warn">Swap {{ server.swap.usage.toFixed(0) }}%</span>
      <span v-if="!server.pending" class="view-detail">查看详情 →</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ServerInfo } from '~/types/server'

defineProps<{ server: ServerInfo }>()
defineEmits<{ click: [] }>()

function formatUptime(s: number): string {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatBytes(gb: number): string {
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`
  return `${gb.toFixed(0)} GB`
}

function formatTraffic(mbs: number): string {
  if (mbs >= 1000) return `${(mbs / 1000).toFixed(1)} Gbps`
  if (mbs >= 1) return `${mbs.toFixed(1)} Mbps`
  return `${(mbs * 1000).toFixed(0)} Kbps`
}
</script>

<style scoped>
.server-card {
  padding: 20px 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

/* 小转圈 */
.loading-spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.1);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin { to { transform: rotate(360deg); } }

.header-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 8px;
}

.server-card:hover {
  transform: translateY(-2px);
}

.status-critical {
  border-color: rgba(255, 61, 79, 0.3);
}
.status-critical:hover {
  box-shadow: var(--glow-red);
}
.status-warning {
  border-color: rgba(255, 171, 0, 0.2);
}

/* Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 18px;
}

.server-identity {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.status-indicator {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 2px;
}
.status-indicator.online {
  background: var(--status-ok);
  box-shadow: 0 0 10px var(--status-ok);
}
.status-indicator.warning {
  background: var(--status-warn);
  box-shadow: 0 0 10px var(--status-warn);
}
.status-indicator.critical {
  background: var(--status-critical);
  box-shadow: 0 0 10px var(--status-critical);
  animation: pulse-glow 1.5s ease-in-out infinite;
}
.status-indicator.loading {
  background: var(--accent-primary);
  box-shadow: 0 0 10px var(--accent-primary);
  animation: pulse-glow 1.2s ease-in-out infinite;
}

.server-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-accent);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.server-meta {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.uptime {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
  margin-left: 8px;
}

/* Metric sections */
.metric-section {
  margin-bottom: 14px;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.metric-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.label-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.label-dot.cpu { background: var(--cpu-color); box-shadow: 0 0 6px var(--cpu-color); }
.label-dot.mem { background: var(--mem-color); box-shadow: 0 0 6px var(--mem-color); }
.label-dot.disk { background: var(--disk-color); box-shadow: 0 0 6px var(--disk-color); }

.metric-extra {
  font-size: 11px;
  color: var(--text-muted);
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.bar-track {
  flex: 1;
  height: 6px;
  background: var(--bg-overlay);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease;
}
.bar-fill.cpu {
  background: linear-gradient(90deg, var(--cpu-color), rgba(0, 212, 255, 0.5));
}
.bar-fill.mem {
  background: linear-gradient(90deg, var(--mem-color), rgba(124, 92, 231, 0.5));
}
.bar-fill.disk {
  background: linear-gradient(90deg, var(--disk-color), rgba(255, 109, 55, 0.5));
}

.bar-value {
  width: 52px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-accent);
  text-align: right;
  flex-shrink: 0;
}

.metric-sub {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-muted);
}

/* Network */
.network-section {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
  padding: 10px 12px;
  background: var(--bg-overlay);
  border-radius: var(--radius-sm);
}

.net-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.net-arrow {
  font-size: 14px;
}
.net-arrow.down { color: var(--accent-secondary); }
.net-arrow.up { color: var(--accent-primary); }

.net-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.net-label {
  font-size: 9px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* Footer */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: var(--text-muted);
  border-top: 1px solid var(--border-subtle);
  padding-top: 12px;
}

.zombie-warn {
  color: var(--status-warn);
  font-weight: 600;
}

.swap-warn {
  color: var(--mem-color);
  font-weight: 600;
}

.view-detail {
  color: var(--accent-primary);
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.2s;
}
.server-card:hover .view-detail {
  opacity: 1;
}
</style>
