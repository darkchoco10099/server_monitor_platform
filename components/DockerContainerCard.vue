<template>
  <div class="container-card glass-card" :class="[`state-${container.state}`]">
    <div class="cc-top">
      <div class="cc-identity">
        <span class="cc-status-dot" :class="container.state" />
        <div>
          <div class="cc-name">{{ container.name }}</div>
          <div class="cc-image">{{ container.image }}</div>
        </div>
      </div>
      <div class="cc-badge" :class="`badge-${container.state}`">
        {{ stateText }}
      </div>
    </div>

    <div class="cc-actions">
      <button
        v-if="canStart"
        class="cc-action-btn start"
        :disabled="actionLoading"
        @click.stop="$emit('start')"
      >
        <span v-if="actionLoading" class="btn-spinner" />
        <span v-else>▶ 启动</span>
      </button>
      <button
        v-if="canStop"
        class="cc-action-btn stop"
        :disabled="actionLoading"
        @click.stop="$emit('stop')"
      >
        <span v-if="actionLoading" class="btn-spinner" />
        <span v-else>■ 停止</span>
      </button>
    </div>

    <div class="cc-ports" v-if="container.ports">
      <span class="cc-ports-label">端口</span>
      <span class="cc-ports-value">{{ container.ports }}</span>
    </div>

    <div class="cc-metrics">
      <div class="cc-metric">
        <div class="cc-metric-header">
          <span>CPU</span>
          <span class="metric-value">{{ container.cpuPercent.toFixed(1) }}%</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill cpu" :style="{ width: Math.min(100, container.cpuPercent) + '%' }" />
        </div>
      </div>

      <div class="cc-metric">
        <div class="cc-metric-header">
          <span>内存</span>
          <span class="metric-value">{{ formatBytes(container.memUsage) }} / {{ formatBytes(container.memLimit) }}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill mem" :style="{ width: Math.min(100, container.memPercent) + '%' }" />
        </div>
      </div>
    </div>

    <div class="cc-footer">
      <span>
        <span class="cc-footer-label">ID</span>
        {{ container.id.slice(0, 12) }}
      </span>
      <span v-if="container.pids > 0">
        <span class="cc-footer-label">进程</span>
        {{ container.pids }}
      </span>
      <span>
        <span class="cc-footer-label">NET RX</span>
        {{ formatBytes(container.netRx) }}
      </span>
      <span>
        <span class="cc-footer-label">NET TX</span>
        {{ formatBytes(container.netTx) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DockerContainer } from '~/types/docker'

const props = defineProps<{
  container: DockerContainer
  actionLoading?: boolean
}>()

defineEmits<{
  start: []
  stop: []
}>()

const stateText = computed(() => {
  switch (props.container.state) {
    case 'running': return '运行中'
    case 'exited': return '已停止'
    case 'paused': return '已暂停'
    default: return props.container.state
  }
})

const canStart = computed(() => ['exited', 'created', 'dead', 'paused'].includes(props.container.state))
const canStop = computed(() => ['running'].includes(props.container.state))

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`
  return `${bytes} B`
}
</script>

<style scoped>
.container-card {
  padding: 16px 20px;
  transition: all 0.25s;
}

.cc-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.cc-identity {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.cc-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.cc-status-dot.running { background: var(--status-ok); box-shadow: 0 0 8px var(--status-ok); }
.cc-status-dot.exited { background: var(--text-muted); }
.cc-status-dot.paused { background: var(--status-warn); box-shadow: 0 0 6px var(--status-warn); }

.cc-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-accent);
}

.cc-image {
  font-size: 11px;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
  margin-top: 2px;
}

.cc-badge {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}
.badge-running { background: rgba(0,230,118,0.12); color: var(--status-ok); }
.badge-exited { background: var(--bg-overlay); color: var(--text-muted); }
.badge-paused { background: rgba(255,171,0,0.12); color: var(--status-warn); }

.cc-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.cc-action-btn {
  padding: 4px 14px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.2s;
  background: transparent;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.cc-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.cc-action-btn.start {
  color: var(--status-ok);
  border-color: rgba(0, 230, 118, 0.3);
}
.cc-action-btn.start:hover:not(:disabled) {
  background: rgba(0, 230, 118, 0.1);
}
.cc-action-btn.stop {
  color: var(--status-critical);
  border-color: rgba(255, 61, 79, 0.3);
}
.cc-action-btn.stop:hover:not(:disabled) {
  background: rgba(255, 61, 79, 0.1);
}

.btn-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}

@keyframes spin { to { transform: rotate(360deg); } }

.cc-ports {
  display: flex;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 12px;
}
.cc-ports-label {
  color: var(--text-muted);
  flex-shrink: 0;
}
.cc-ports-value {
  color: var(--accent-primary);
  font-family: 'JetBrains Mono', monospace;
}

.cc-metrics {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.cc-metric-header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.cc-metric-header .metric-value {
  font-size: 12px;
  color: var(--text-accent);
}

.bar-track {
  height: 5px;
  background: var(--bg-overlay);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease;
}
.bar-fill.cpu { background: linear-gradient(90deg, var(--cpu-color), rgba(0, 212, 255, 0.5)); }
.bar-fill.mem { background: linear-gradient(90deg, var(--mem-color), rgba(124, 92, 231, 0.5)); }

.cc-footer {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
}

.cc-footer-label {
  color: var(--text-muted);
  opacity: 0.5;
  margin-right: 4px;
  font-family: 'Inter', sans-serif;
}
</style>
