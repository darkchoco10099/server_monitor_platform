<template>
  <div class="overview-page">
    <!-- Header -->
    <header class="page-header">
      <div>
        <h1 class="page-title">服务器总览</h1>
        <p class="page-desc">实时监控 {{ servers.length }} 台服务器的运行状态与资源使用情况</p>
      </div>
      <div class="header-actions">
        <nuxt-link to="/settings" class="btn-settings">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          管理服务器
        </nuxt-link>
        <div class="refresh-info">
          <span class="refresh-dot" />
          自动刷新 · {{ refreshInterval }}s
        </div>
      </div>
    </header>

    <!-- Status Summary -->
    <div class="summary-row">
      <div v-for="item in statusSummary" :key="item.label" class="summary-card" :class="item.class">
        <div class="summary-value metric-value">{{ item.count }}</div>
        <div class="summary-label">{{ item.label }}</div>
        <div class="summary-icon">{{ item.icon }}</div>
      </div>
    </div>

    <!-- Empty (no configs) -->
    <div v-if="!servers.length" class="empty-state">
      <div class="empty-icon">🖥️</div>
      <h2>暂无服务器</h2>
      <p>前往<NuxtLink to="/settings" class="empty-link">服务器管理</NuxtLink>添加 SSH 连接配置</p>
    </div>

    <!-- Server list -->
    <template v-else>
      <div class="toolbar">
        <div class="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
          <input v-model="search" placeholder="搜索服务器名称、IP 或系统..." class="search-input" />
        </div>
        <div class="filter-chips">
          <button v-for="f in filters" :key="f.key" :class="['chip', { active: activeFilter === f.key }]" @click="activeFilter = f.key">{{ f.label }}</button>
        </div>
      </div>

      <div class="servers-grid">
        <ServerCard
          v-for="server in filteredServers"
          :key="server.id"
          :server="server"
          :pending="pendingSet.has(server.id)"
          @click="navigateTo(`/servers/${server.id}`)"
        />
      </div>

      <div v-if="filteredServers.length === 0" class="empty-state">
        <p>没有匹配的服务器</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ServerInfo } from '~/types/server'

const store = useServerStore()

const refreshInterval = 5

onMounted(() => {
  store.startPolling(refreshInterval)
})

onUnmounted(() => {
  store.stopPolling()
})

const servers = computed(() => store.servers.value)
const pendingSet = computed(() => store.pending.value)

const search = ref('')
const activeFilter = ref('all')

const filters = [
  { key: 'all', label: '全部' },
  { key: 'online', label: '运行中' },
  { key: 'warning', label: '警告' },
  { key: 'critical', label: '严重' },
]

const statusSummary = computed(() => {
  const list = servers.value
  return [
    { label: '全部', count: list.length, icon: '🖥️', class: 'gradient-blue' },
    { label: '运行中', count: list.filter(s => s.status === 'online').length, icon: '✅', class: 'gradient-green' },
    { label: '警告', count: list.filter(s => s.status === 'warning').length, icon: '⚠️', class: 'gradient-yellow' },
    { label: '严重', count: list.filter(s => s.status === 'critical').length, icon: '🔴', class: 'gradient-red' },
  ]
})

const filteredServers = computed(() => {
  let list = servers.value
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.ip.includes(q) ||
      s.os.toLowerCase().includes(q) ||
      s.hostname.toLowerCase().includes(q)
    )
  }
  if (activeFilter.value !== 'all') {
    list = list.filter(s => s.status === activeFilter.value)
  }
  return list
})
</script>

<style scoped>
.overview-page {
  max-width: 1440px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28px;
}

.page-title {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-accent);
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.page-desc {
  font-size: 14px;
  color: var(--text-muted);
  margin-top: 4px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.refresh-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  padding: 6px 14px;
}

.btn-settings {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  padding: 6px 16px;
  text-decoration: none;
  transition: all 0.2s;
}
.btn-settings:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.refresh-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-primary);
  animation: pulse-glow 2s ease-in-out infinite;
}

/* Summary Cards */
.summary-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card {
  position: relative;
  padding: 20px 24px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  overflow: hidden;
  transition: transform 0.2s, border-color 0.25s;
  cursor: default;
}
.summary-card:hover {
  border-color: var(--border-accent);
  transform: translateY(-1px);
}

.gradient-blue::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--accent-primary), transparent);
}
.gradient-green::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--accent-secondary), transparent);
}
.gradient-yellow::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--status-warn), transparent);
}
.gradient-red::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--status-critical), transparent);
}

.summary-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-accent);
  line-height: 1;
}

.summary-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 6px;
}

.summary-icon {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 24px;
  opacity: 0.5;
}

/* Toolbar */
.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  padding: 10px 16px;
  flex: 1;
  min-width: 260px;
  max-width: 400px;
  color: var(--text-muted);
  transition: border-color 0.2s;
}
.search-box:focus-within {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.08);
}

.search-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 14px;
  width: 100%;
}
.search-input::placeholder {
  color: var(--text-muted);
}

.filter-chips {
  display: flex;
  gap: 6px;
}

.chip {
  padding: 7px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.chip:hover {
  border-color: var(--border-accent);
  color: var(--text-primary);
}
.chip.active {
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(0, 230, 160, 0.08));
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

/* Grid */
.servers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
}

.empty-state {
  text-align: center;
  padding: 80px 0;
  color: var(--text-muted);
  font-size: 15px;
}

.empty-state h2 {
  font-size: 20px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
}

.empty-icon {
  font-size: 52px;
  margin-bottom: 16px;
}

.empty-link {
  color: var(--accent-primary);
  text-decoration: none;
  font-weight: 600;
}

.empty-link:hover {
  text-decoration: underline;
}
</style>
