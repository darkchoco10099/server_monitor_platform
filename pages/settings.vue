<template>
  <div class="settings-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">服务器管理</h1>
        <p class="page-desc">管理 SSH 连接配置，添加需要监控的 Linux 服务器</p>
      </div>
      <button class="btn-add" @click="openAdd">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        添加服务器
      </button>
    </header>

    <!-- Loading -->
    <div v-if="pending" class="loading-state">
      <div class="loading-spinner" />
      <span>加载中...</span>
    </div>

    <!-- Empty -->
    <div v-else-if="!configs.length" class="empty-state">
      <div class="empty-icon">🖥️</div>
      <h2>暂无服务器配置</h2>
      <p>点击上方按钮添加第一台服务器，或使用默认模拟数据查看效果</p>
    </div>

    <!-- Config List -->
    <div v-else class="configs-grid">
      <div v-for="cfg in configs" :key="cfg.id" class="config-card glass-card">
        <div class="cfg-header">
          <div class="cfg-name">{{ cfg.name }}</div>
          <div class="cfg-actions">
            <button class="cfg-btn" title="编辑" @click="openEdit(cfg)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="cfg-btn cfg-btn-danger" title="删除" @click="remove(cfg)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>

        <div class="cfg-details">
          <div class="cfg-row">
            <span class="cfg-label">主机</span>
            <span class="cfg-value">{{ cfg.host }}:{{ cfg.port }}</span>
          </div>
          <div class="cfg-row">
            <span class="cfg-label">用户</span>
            <span class="cfg-value">{{ cfg.username }}</span>
          </div>
          <div class="cfg-row">
            <span class="cfg-label">认证</span>
            <span class="cfg-value">{{ cfg.authType === 'password' ? '密码' : 'SSH 密钥' }}</span>
          </div>
          <div class="cfg-row">
            <span class="cfg-label">创建时间</span>
            <span class="cfg-value">{{ cfg.createdAt }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Form Modal -->
    <ServerConfigForm
      :visible="showForm"
      :editingConfig="editingConfig"
      @close="showForm = false; editingConfig = null"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import type { ServerConfig } from '~/types/config'

const { data, pending, refresh } = await useFetch<ServerConfig[]>('/api/configs')
const configs = computed(() => data.value ?? [])

const showForm = ref(false)
const editingConfig = ref<ServerConfig | null>(null)

function openAdd() {
  editingConfig.value = null
  showForm.value = true
}
function openEdit(cfg: ServerConfig) {
  editingConfig.value = cfg
  showForm.value = true
}
function onSaved() {
  showForm.value = false
  editingConfig.value = null
  refresh()
}

async function remove(cfg: ServerConfig) {
  const ok = confirm(`确定要删除 "${cfg.name}" 吗？`)
  if (!ok) return
  await $fetch(`/api/configs/${cfg.id}`, { method: 'DELETE' })
  refresh()
}
</script>

<style scoped>
.settings-page {
  max-width: 960px;
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

.btn-add {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: #080c14;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-add:hover { box-shadow: var(--glow-accent); }

/* Loading / Empty */
.loading-state, .empty-state {
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
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-state h2 { font-size: 18px; color: var(--text-secondary); margin-bottom: 8px; }
.empty-state p { font-size: 13px; }

/* Grid */
.configs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 14px;
}

.config-card {
  padding: 20px 24px;
}

.cfg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-subtle);
}

.cfg-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-accent);
}

.cfg-actions {
  display: flex;
  gap: 4px;
}

.cfg-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}
.cfg-btn:hover { background: var(--bg-overlay); color: var(--text-primary); }
.cfg-btn-danger:hover { color: var(--status-critical); }

.cfg-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cfg-row {
  display: flex;
  justify-content: space-between;
}

.cfg-label {
  font-size: 12px;
  color: var(--text-muted);
}

.cfg-value {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', monospace;
}
</style>
