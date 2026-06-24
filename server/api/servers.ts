import { getAllConfigs } from '~~/server/utils/db'

export default defineEventHandler(() => {
  const configs = getAllConfigs()
  return configs.map(c => ({
    id: c.id,
    name: c.name,
    hostname: '...',
    ip: c.host,
    os: '...',
    status: 'loading' as const,
    pending: true,
    uptime: 0,
    cpu: { model: '...', cores: 0, threads: 0, usage: 0, temperature: 0 },
    memory: { total: 0, used: 0, free: 0, cached: 0, usage: 0 },
    disk: { total: 0, used: 0, free: 0, iops: 0, usage: 0 },
    network: { rx: 0, tx: 0, connections: 0 },
    load: { load1: 0, load5: 0, load15: 0 },
    swap: { total: 0, used: 0, free: 0, usage: 0 },
    processes: { total: 0, running: 0, zombie: 0 },
  }))
})
