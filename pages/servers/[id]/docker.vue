<template>
  <div class="docker-page">
    <NuxtLink :to="`/servers/${serverId}`" class="back-link">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      返回服务器详情
    </NuxtLink>

    <!-- 确认弹窗 -->
    <div v-if="confirmDialog" class="confirm-overlay" @click.self="confirmDialog = null">
      <div class="confirm-dialog glass-card">
        <div class="confirm-icon" :class="confirmDialog.type">{{ confirmDialog.icon }}</div>
        <h3 class="confirm-title">{{ confirmDialog.title }}</h3>
        <p class="confirm-desc">{{ confirmDialog.desc }}</p>
        <div class="confirm-actions">
          <button class="btn btn-ghost" @click="confirmDialog = null">取消</button>
          <button class="btn" :class="confirmDialog.btnClass" @click="confirmDialog.onConfirm">{{ confirmDialog.btnText }}</button>
        </div>
      </div>
    </div>

    <div v-if="statusMessage" class="status-banner" :class="statusMessage.type">
      {{ statusMessage.text }}
    </div>

    <div v-if="pending" class="loading-state">
      <div class="loading-spinner" />
      <span>加载 Docker 数据中...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <p>加载失败：{{ error.message }}</p>
      <button class="btn-retry" @click="refresh()">重试</button>
    </div>

    <div v-else-if="data?.error" class="error-state">
      <div class="empty-icon">🐳</div>
      <h2>Docker 不可用</h2>
      <p>{{ data.error }}</p>
    </div>

    <template v-else-if="data?.systemInfo">
      <div class="summary-row">
        <div class="summary-card gradient-blue">
          <div class="summary-value metric-value">
            {{ data.systemInfo.containersRunning }}
            <span class="summary-total">/ {{ data.systemInfo.containers }}</span>
          </div>
          <div class="summary-label">容器 (运行中/总数)</div>
        </div>
        <div class="summary-card gradient-green">
          <div class="summary-value metric-value">{{ data.systemInfo.images }}</div>
          <div class="summary-label">镜像总数</div>
        </div>
        <div class="summary-card gradient-purple">
          <div class="summary-value" style="font-size: 18px">{{ data.systemInfo.serverVersion }}</div>
          <div class="summary-label">Docker 版本</div>
        </div>
        <div class="summary-card gradient-orange">
          <div class="summary-value" style="font-size: 18px">{{ data.systemInfo.driver }}</div>
          <div class="summary-label">存储驱动</div>
        </div>
      </div>

      <section class="section">
        <h2 class="section-title">容器列表 ({{ data.containers.length }})</h2>
        <div v-if="data.containers.length === 0" class="empty-small">暂无容器</div>
        <div v-else class="containers-grid">
          <DockerContainerCard
            v-for="c in data.containers"
            :key="c.id"
            :container="c"
            :action-loading="actioningContainers.has(c.id)"
            @start="confirmStart(c)"
            @stop="confirmStop(c)"
          />
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">
          镜像列表 ({{ data.images.length }})
          <span v-if="unusedCount > 0" class="unused-count">{{ unusedCount }} 个未使用</span>
        </h2>
        <div v-if="data.images.length === 0" class="empty-small">暂无镜像</div>
        <div v-else>
          <!-- 批量操作栏 -->
          <div class="batch-bar">
            <span v-if="selectedImages.size > 0">已选择 {{ selectedImages.size }} 个镜像</span>
            <span v-else class="batch-placeholder">勾选未使用的镜像进行批量删除</span>
            <button class="btn-batch-delete" :disabled="selectedImages.size === 0" @click="confirmBatchDelete">
              批量删除{{ selectedImages.size > 0 ? ` (${selectedImages.size})` : '' }}
            </button>
            <button class="btn-batch-clear" :disabled="selectedImages.size === 0" @click="selectedImages = new Set()">取消选择</button>
          </div>

          <div class="mini-table glass-card">
            <table>
              <thead>
                <tr>
                  <th style="width:36px">
                    <input
                      v-if="unusedCount > 0"
                      type="checkbox"
                      class="check-all"
                      :checked="selectedImages.size === unusedCount"
                      :indeterminate="selectedImages.size > 0 && selectedImages.size < unusedCount"
                      @change="toggleSelectAll"
                    />
                  </th>
                  <th>仓库</th>
                  <th>标签</th>
                  <th>镜像 ID</th>
                  <th>大小</th>
                  <th>创建时间</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="img in data.images" :key="img.id" :class="{ 'row-unused': img.unused, 'row-selected': selectedImages.has(img.id) }">
                  <td>
                    <input
                      v-if="img.unused"
                      type="checkbox"
                      class="check-row"
                      :checked="selectedImages.has(img.id)"
                      @change="toggleImage(img.id)"
                    />
                  </td>
                  <td class="metric-value">{{ img.repository }}</td>
                  <td class="metric-value">{{ img.tag }}</td>
                  <td class="metric-value">{{ img.id }}</td>
                  <td class="metric-value">{{ formatBytes(img.size) }}</td>
                  <td>{{ img.created }}</td>
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
import type { DockerContainer, DockerOverview } from '~/types/docker'

const route = useRoute()
const serverId = computed(() => route.params.id as string)

const { data, pending, error, refresh } = await useFetch<DockerOverview>(`/api/servers/${serverId.value}/docker`, { lazy: true })

const actioningContainers = ref<Set<string>>(new Set())
const actioningImages = ref<Set<string>>(new Set())
const selectedImages = ref<Set<string>>(new Set())
const statusMessage = ref<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)
let statusTimer: ReturnType<typeof setTimeout> | null = null

function toggleImage(id: string) {
  const next = new Set(selectedImages.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedImages.value = next
}

function toggleSelectAll() {
  if (selectedImages.value.size === unusedCount.value) {
    selectedImages.value = new Set()
  } else {
    const ids = (data.value?.images || []).filter(img => img.unused).map(img => img.id)
    selectedImages.value = new Set(ids)
  }
}

function confirmBatchDelete() {
  const ids = [...selectedImages.value]
  if (!ids.length) return
  const count = ids.length
  confirmDialog.value = {
    title: '批量删除镜像',
    desc: `确认删除选中的 ${count} 个未使用镜像吗？此操作不可恢复。`,
    icon: '🗑',
    type: 'delete',
    btnText: `确认删除 ${count} 个`,
    btnClass: 'btn-delete',
    onConfirm: () => {
      confirmDialog.value = null
      handleDeleteImages(ids)
    },
  }
}

async function handleDeleteImages(imageIds: string[]) {
  showStatus(`正在删除 ${imageIds.length} 个镜像...`, 'info')
  for (const id of imageIds) {
    if (actioningImages.value.has(id)) continue
    actioningImages.value = new Set([...actioningImages.value, id])
  }
  const results: { id: string; ok: boolean; msg: string }[] = []
  for (const id of imageIds) {
    try {
      const result = await $fetch<{ success: boolean; message: string }>(
        `/api/servers/${serverId.value}/docker/images/${id}`,
        { method: 'DELETE' }
      )
      results.push({ id, ok: result.success, msg: result.message })
    } catch (e: any) {
      results.push({ id, ok: false, msg: e?.data?.message || e.message || '删除失败' })
    } finally {
      const next = new Set(actioningImages.value)
      next.delete(id)
      actioningImages.value = next
    }
  }
  const success = results.filter(r => r.ok).length
  const fail = results.filter(r => !r.ok).length
  if (fail === 0) {
    showStatus(`成功删除 ${success} 个镜像`, 'success')
  } else {
    showStatus(`成功 ${success} 个，失败 ${fail} 个`, 'error')
  }
  selectedImages.value = new Set()
  await refresh()
}

// 确认弹窗
interface ConfirmDialog {
  title: string
  desc: string
  icon: string
  type: string
  btnText: string
  btnClass: string
  onConfirm: () => void
}
const confirmDialog = ref<ConfirmDialog | null>(null)

function confirmStart(c: DockerContainer) {
  confirmDialog.value = {
    title: '启动容器',
    desc: `确认启动容器「${c.name}」(${c.id.slice(0, 12)}) 吗？`,
    icon: '▶',
    type: 'start',
    btnText: '确认启动',
    btnClass: 'btn-start',
    onConfirm: () => {
      confirmDialog.value = null
      handleStartContainer(c.id)
    },
  }
}

function confirmStop(c: DockerContainer) {
  confirmDialog.value = {
    title: '停止容器',
    desc: `确认停止容器「${c.name}」(${c.id.slice(0, 12)}) 吗？容器内的服务将不可用。`,
    icon: '■',
    type: 'stop',
    btnText: '确认停止',
    btnClass: 'btn-stop',
    onConfirm: () => {
      confirmDialog.value = null
      handleStopContainer(c.id)
    },
  }
}

function showStatus(text: string, type: 'success' | 'error' | 'info') {
  statusMessage.value = { text, type }
  if (statusTimer) clearTimeout(statusTimer)
  if (type !== 'info') {
    statusTimer = setTimeout(() => { statusMessage.value = null }, 5000)
  }
}

async function handleStartContainer(containerId: string) {
  if (actioningContainers.value.has(containerId)) return
  const name = data.value?.containers.find(c => c.id === containerId)?.name || containerId.slice(0, 12)
  showStatus(`正在启动容器「${name}」...`, 'info')
  actioningContainers.value = new Set([...actioningContainers.value, containerId])
  try {
    const result = await $fetch<{ success: boolean; message: string }>(
      `/api/servers/${serverId.value}/docker/containers/${containerId}/start`,
      { method: 'POST' }
    )
    showStatus(result.message, result.success ? 'success' : 'error')
    await refresh()
  } catch (e: any) {
    showStatus(e?.data?.message || e.message || '启动失败', 'error')
  } finally {
    const next = new Set(actioningContainers.value)
    next.delete(containerId)
    actioningContainers.value = next
  }
}

async function handleStopContainer(containerId: string) {
  if (actioningContainers.value.has(containerId)) return
  const name = data.value?.containers.find(c => c.id === containerId)?.name || containerId.slice(0, 12)
  showStatus(`正在停止容器「${name}」...`, 'info')
  actioningContainers.value = new Set([...actioningContainers.value, containerId])
  try {
    const result = await $fetch<{ success: boolean; message: string }>(
      `/api/servers/${serverId.value}/docker/containers/${containerId}/stop`,
      { method: 'POST' }
    )
    showStatus(result.message, result.success ? 'success' : 'error')
    await refresh()
  } catch (e: any) {
    showStatus(e?.data?.message || e.message || '停止失败', 'error')
  } finally {
    const next = new Set(actioningContainers.value)
    next.delete(containerId)
    actioningContainers.value = next
  }
}

const unusedCount = computed(() => {
  return data.value?.images.filter(img => img.unused).length ?? 0
})

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`
  return `${bytes} B`
}
</script>

<style scoped>
.docker-page {
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

/* 确认弹窗 */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  backdrop-filter: blur(4px);
}

.confirm-dialog {
  width: 100%;
  max-width: 400px;
  padding: 28px 32px;
  text-align: center;
}

.confirm-icon {
  font-size: 36px;
  margin-bottom: 12px;
}
.confirm-icon.start { color: var(--status-ok); }
.confirm-icon.stop { color: var(--status-warn); }
.confirm-icon.delete { color: var(--status-critical); }

.confirm-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-accent);
  margin-bottom: 8px;
}

.confirm-desc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 22px;
}

.confirm-actions .btn {
  padding: 8px 22px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  color: #080c14;
}

.confirm-actions .btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
}
.confirm-actions .btn-ghost:hover {
  border-color: var(--border-accent);
  color: var(--text-primary);
}

.btn-start { background: linear-gradient(135deg, var(--status-ok), #00c853); }
.btn-stop { background: linear-gradient(135deg, var(--status-warn), #ff9100); }
.btn-delete { background: linear-gradient(135deg, var(--status-critical), #d50000); }

/* 状态横幅 */
.status-banner {
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  margin-bottom: 16px;
}
.status-banner.success {
  background: rgba(0, 230, 118, 0.1);
  border: 1px solid rgba(0, 230, 118, 0.25);
  color: var(--status-ok);
}
.status-banner.error {
  background: rgba(255, 61, 79, 0.1);
  border: 1px solid rgba(255, 61, 79, 0.25);
  color: var(--status-critical);
}
.status-banner.info {
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.25);
  color: var(--accent-primary);
}

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

.error-state .empty-icon { font-size: 48px; margin-bottom: 16px; }
.error-state h2 { font-size: 18px; color: var(--text-secondary); margin-bottom: 8px; }

.btn-retry {
  margin-top: 12px;
  padding: 8px 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  cursor: pointer;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 28px;
}

.summary-card {
  position: relative;
  padding: 18px 22px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  overflow: hidden;
}
.summary-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
}

.gradient-blue::before { background: linear-gradient(90deg, var(--accent-primary), transparent); }
.gradient-green::before { background: linear-gradient(90deg, var(--accent-secondary), transparent); }
.gradient-purple::before { background: linear-gradient(90deg, var(--accent-tertiary), transparent); }
.gradient-orange::before { background: linear-gradient(90deg, var(--disk-color), transparent); }

.summary-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-accent);
  line-height: 1;
}

.summary-total {
  font-size: 16px;
  font-weight: 400;
  color: var(--text-muted);
}

.summary-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
}

.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-accent);
  margin-bottom: 14px;
}

.unused-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--status-warn);
  margin-left: 8px;
}

.containers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 14px;
}

.empty-small {
  text-align: center;
  padding: 40px 0;
  color: var(--text-muted);
  font-size: 14px;
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
  font-size: 12px;
  color: var(--text-secondary);
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-subtle);
}
.mini-table tr:last-child td { border-bottom: none; }

/* 未使用镜像行 */
.row-unused td:first-child {
  border-left: 2px solid var(--status-warn);
}
.row-selected td {
  background: rgba(0, 212, 255, 0.06);
}

/* 批量操作栏 */
.batch-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  margin-bottom: 12px;
  background: rgba(0, 212, 255, 0.06);
  border: 1px solid rgba(0, 212, 255, 0.15);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--accent-primary);
}
.batch-bar span { margin-right: auto; }

.batch-placeholder {
  color: var(--text-muted);
  font-size: 12px;
}

.btn-batch-delete {
  padding: 4px 14px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  color: #080c14;
  background: linear-gradient(135deg, var(--status-critical), #d50000);
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-batch-delete:hover:not(:disabled) { filter: brightness(1.1); }
.btn-batch-delete:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-batch-clear {
  padding: 4px 14px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--border-default);
  cursor: pointer;
  transition: all 0.2s;
}
.btn-batch-clear:hover:not(:disabled) { border-color: var(--border-accent); }
.btn-batch-clear:disabled { opacity: 0.3; cursor: not-allowed; }

.check-all, .check-row {
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: var(--accent-primary);
}

.in-use-label {
  font-size: 11px;
  color: var(--text-muted);
}

.btn-delete-image {
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 600;
  color: var(--status-critical);
  border: 1px solid rgba(255, 61, 79, 0.3);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.btn-delete-image:hover:not(:disabled) {
  background: rgba(255, 61, 79, 0.1);
}
.btn-delete-image:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-spinner {
  width: 10px;
  height: 10px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}
</style>
