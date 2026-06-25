import type { ServerInfo } from '~/types/server'

export const useServerStore = () => {
  const servers = useState<ServerInfo[]>('server-list', () => [])
  const pending = useState<Set<string>>('server-pending', () => new Set())
  let refreshTimer: ReturnType<typeof setInterval> | null = null
  let started = false

  function markPending(id: string) {
    pending.value = new Set([...pending.value, id])
  }

  function markDone(id: string) {
    const next = new Set(pending.value)
    next.delete(id)
    pending.value = next
  }

  async function fetchOne(id: string) {
    markPending(id)
    try {
      const fresh = await $fetch<ServerInfo>(`/api/servers/${id}/overview`)
      const idx = servers.value.findIndex(s => s.id === id)
      if (idx !== -1) {
        servers.value[idx] = { ...fresh, pending: false }
      } else {
        servers.value.push({ ...fresh, pending: false })
      }
    } catch {
      const idx = servers.value.findIndex(s => s.id === id)
      if (idx !== -1) {
        servers.value[idx] = {
          ...servers.value[idx],
          status: 'offline' as const,
          pending: false,
          collectError: '采集失败',
        }
      }
    } finally {
      markDone(id)
    }
  }

  async function refreshAll() {
    const ids = servers.value.map(s => s.id)
    await Promise.allSettled(ids.map(fetchOne))
  }

  async function init() {
    // 首次加载配置列表（仅 ID/名称占位）
    if (servers.value.length === 0) {
      const configs = await $fetch<ServerInfo[]>('/api/servers')
      servers.value = configs.map(c => ({ ...c, pending: true }))
    }
    // 异步拉取每台服务器的实际数据
    await refreshAll()
  }

  function startPolling(intervalSec = 5) {
    if (started) return
    started = true
    init()
    refreshTimer = setInterval(refreshAll, intervalSec * 1000)
  }

  function stopPolling() {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
    started = false
  }

  return {
    servers,
    pending,
    init,
    refreshAll,
    startPolling,
    stopPolling,
  }
}
