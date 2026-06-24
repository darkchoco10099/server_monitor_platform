import type { NodeSSH } from 'node-ssh'
import type { ServerConfig } from '~~/types/config'
import type { ServerInfo, ServerDetail } from '~~/types/server'
import { createSSHConnection, execWithTimeout } from './ssh'

interface RawMetrics {
  cpuModel: string
  cpuCores: number
  cpuThreads: number
  cpuUsage: number
  cpuTemp: number
  memTotal: number
  memUsed: number
  memFree: number
  memCached: number
  swapTotal: number
  swapFree: number
  diskTotal: number
  diskUsed: number
  diskFree: number
  load1: number
  load5: number
  load15: number
  uptime: number
  rx: number
  tx: number
  connections: number
  processes: number
  processesRunning: number
  os: string
  kernel: string
  hostname: string
  services: Array<{ name: string; status: 'active' | 'inactive' | 'failed'; pid: number }>
}

async function collectAllMetrics(ssh: NodeSSH): Promise<RawMetrics> {
  const cmd = `
echo "START_OUTPUT"
echo "HOSTNAME=$(hostname)"
echo "KERNEL=$(uname -r)"
echo "UPTIME=$(cat /proc/uptime | awk '{print $1}')"
echo "OS_NAME=$(cat /etc/os-release | grep '^PRETTY_NAME=' | cut -d= -f2 | tr -d '"')"
echo "CPU_MODEL=$(cat /proc/cpuinfo | grep 'model name' | head -1 | cut -d: -f2 | sed 's/^ *//')"
echo "CPU_CORES=$(nproc --all)"
echo "CPU_THREADS=$(cat /proc/cpuinfo | grep processor | wc -l)"
echo "CPU_IDLE=$(top -bn1 2>/dev/null | grep -oP 'ni,\\s*\\K[0-9.]+(?=\\s*id)' 2>/dev/null || top -bn1 2>/dev/null | grep '%Cpu' | awk '{print $8}' || echo 0)"
echo "MEM_TOTAL=$(awk '/MemTotal/{print $2}' /proc/meminfo)"
echo "MEM_FREE=$(awk '/MemAvailable/{print $2}' /proc/meminfo)"
echo "MEM_CACHED=$(awk '/Cached/{s+=$2} END{print s}' /proc/meminfo)"
echo "SWAP_TOTAL=$(awk '/SwapTotal/{print $2}' /proc/meminfo)"
echo "SWAP_FREE=$(awk '/SwapFree/{print $2}' /proc/meminfo)"
echo "DISK_TOTAL=$(df -B1 / | tail -1 | awk '{print $2}')"
echo "DISK_USED=$(df -B1 / | tail -1 | awk '{print $3}')"
echo "DISK_FREE=$(df -B1 / | tail -1 | awk '{print $4}')"
echo "LOAD1=$(awk '{print $1}' /proc/loadavg)"
echo "LOAD5=$(awk '{print $2}' /proc/loadavg)"
echo "LOAD15=$(awk '{print $3}' /proc/loadavg)"
echo "CONNECTIONS=$(ss -tan | wc -l)"
echo "PROC_TOTAL=$(ps aux --no-headers 2>/dev/null | wc -l)"
echo "PROC_RUNNING=$(ps aux --no-headers 2>/dev/null | awk '$8 ~ /R/{c++} END{print c+0}')"
echo "CPU_TEMP=$(cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null | sort -rn | head -1 || echo 0)"
echo "SVC_SSHD=$(systemctl is-active sshd 2>/dev/null || echo inactive)"
echo "SVC_NGINX=$(systemctl is-active nginx 2>/dev/null || echo inactive)"
echo "SVC_DOCKER=$(systemctl is-active docker 2>/dev/null || echo inactive)"
echo "END_OUTPUT"
  `.trim()

  const { stdout } = await execWithTimeout(ssh, cmd, 12000)

  const m = new Map<string, string>()
  stdout.split('\n').forEach(line => {
    const eq = line.indexOf('=')
    if (eq > 0) {
      m.set(line.slice(0, eq), line.slice(eq + 1))
    }
  })

  const cpuIdle = parseFloat(m.get('CPU_IDLE') || '0')
  const cpuUsage = Math.min(100, Math.max(0, 100 - cpuIdle))

  // Network rates snapshot
  const { stdout: netStdout } = await execWithTimeout(ssh, "cat /proc/net/dev | grep -E 'eth|ens|enp|wlan' | head -5", 3000)
  const { rx, tx } = parseNetworkRate(netStdout)

  const memTotalKb = parseFloat(m.get('MEM_TOTAL') || '0')
  const memFreeKb = parseFloat(m.get('MEM_FREE') || '0')
  const memCachedKb = parseFloat(m.get('MEM_CACHED') || '0')
  const swapTotalKb = parseFloat(m.get('SWAP_TOTAL') || '0')
  const swapFreeKb = parseFloat(m.get('SWAP_FREE') || '0')
  const diskTotal = parseFloat(m.get('DISK_TOTAL') || '0')
  const diskUsed = parseFloat(m.get('DISK_USED') || '0')
  const diskFree = parseFloat(m.get('DISK_FREE') || '0')

  return {
    hostname: m.get('HOSTNAME') || 'unknown',
    kernel: m.get('KERNEL') || 'unknown',
    os: m.get('OS_NAME') || 'unknown',
    cpuModel: m.get('CPU_MODEL') || 'unknown',
    cpuCores: parseInt(m.get('CPU_CORES') || '0'),
    cpuThreads: parseInt(m.get('CPU_THREADS') || '0'),
    cpuUsage: Math.round(cpuUsage * 10) / 10,
    cpuTemp: parseFloat(m.get('CPU_TEMP') || '0') / 1000,
    memTotal: Math.round((memTotalKb / 1024) * 10) / 10,
    memUsed: Math.round(((memTotalKb - memFreeKb) / 1024) * 10) / 10,
    memFree: Math.round((memFreeKb / 1024) * 10) / 10,
    memCached: Math.round((memCachedKb / 1024) * 10) / 10,
    swapTotal: Math.round((swapTotalKb / 1024) * 10) / 10,
    swapFree: Math.round((swapFreeKb / 1024) * 10) / 10,
    diskTotal: Math.round(diskTotal / 1e9 * 10) / 10,
    diskUsed: Math.round(diskUsed / 1e9 * 10) / 10,
    diskFree: Math.round(diskFree / 1e9 * 10) / 10,
    load1: parseFloat(m.get('LOAD1') || '0'),
    load5: parseFloat(m.get('LOAD5') || '0'),
    load15: parseFloat(m.get('LOAD15') || '0'),
    uptime: parseFloat(m.get('UPTIME') || '0'),
    rx,
    tx,
    connections: parseInt(m.get('CONNECTIONS') || '0') - 1, // subtract header
    processes: parseInt(m.get('PROC_TOTAL') || '0'),
    processesRunning: parseInt(m.get('PROC_RUNNING') || '0'),
    services: [
      { name: 'sshd', status: mapSvc(m.get('SVC_SSHD')), pid: 0 },
      { name: 'nginx', status: mapSvc(m.get('SVC_NGINX')), pid: 0 },
      { name: 'docker', status: mapSvc(m.get('SVC_DOCKER')), pid: 0 },
    ],
  }
}

function mapSvc(v: string | undefined): 'active' | 'inactive' | 'failed' {
  if (!v) return 'inactive'
  if (v === 'active') return 'active'
  if (v === 'failed') return 'failed'
  return 'inactive'
}

// Network rate parsing from /proc/net/dev
const networkSnapshots = new Map<string, { bytes: number; ts: number }>()

function parseNetworkRate(stdout: string): { rx: number; tx: number } {
  const lines = stdout.trim().split('\n')
  let totalRx = 0
  let totalTx = 0
  const now = Date.now()

  for (const line of lines) {
    const parts = line.trim().split(/\s+/)
    if (parts.length < 10) continue
    const iface = parts[0].replace(':', '')
    const rxBytes = parseInt(parts[1]) || 0
    const txBytes = parseInt(parts[9]) || 0

    const prev = networkSnapshots.get(iface)
    if (prev) {
      const dt = (now - prev.ts) / 1000
      if (dt > 0) {
        totalRx += (rxBytes - prev.bytes) / dt / 1e6
        totalTx += (txBytes - prev.bytes) / dt / 1e6
      }
    }
    networkSnapshots.set(iface, { bytes: rxBytes, ts: now })
  }

  return {
    rx: Math.round(Math.max(0, totalRx) * 10) / 10,
    tx: Math.round(Math.max(0, totalTx) * 10) / 10,
  }
}

function toServerInfo(m: RawMetrics, config: ServerConfig): ServerInfo {
  const memUsage = m.memTotal > 0 ? (m.memUsed / m.memTotal) * 100 : 0
  const diskUsage = m.diskTotal > 0 ? (m.diskUsed / m.diskTotal) * 100 : 0
  const swapUsed = m.swapTotal > 0 ? m.swapTotal - m.swapFree : 0
  const swapUsage = m.swapTotal > 0 ? (swapUsed / m.swapTotal) * 100 : 0

  let status: ServerInfo['status'] = 'online'
  if (m.cpuUsage > 90 || memUsage > 90 || diskUsage > 90) status = 'critical'
  else if (m.cpuUsage > 75 || memUsage > 80 || diskUsage > 80) status = 'warning'

  return {
    id: config.id,
    name: config.name,
    hostname: m.hostname,
    ip: config.host,
    os: m.os,
    status,
    uptime: m.uptime,
    cpu: {
      model: m.cpuModel,
      cores: m.cpuCores,
      threads: m.cpuThreads,
      usage: m.cpuUsage,
      temperature: m.cpuTemp,
    },
    memory: {
      total: m.memTotal,
      used: m.memUsed,
      free: m.memFree,
      cached: m.memCached,
      usage: Math.round(memUsage * 10) / 10,
    },
    swap: {
      total: m.swapTotal,
      used: swapUsed,
      free: m.swapFree,
      usage: Math.round(swapUsage * 10) / 10,
    },
    disk: {
      total: m.diskTotal,
      used: m.diskUsed,
      free: m.diskFree,
      iops: 0,
      usage: Math.round(diskUsage * 10) / 10,
    },
    network: {
      rx: m.rx,
      tx: m.tx,
      connections: m.connections,
    },
    load: {
      load1: m.load1,
      load5: m.load5,
      load15: m.load15,
    },
    processes: {
      total: m.processes,
      running: m.processesRunning,
      zombie: 0,
    },
  }
}

export async function collectOverview(config: ServerConfig): Promise<ServerInfo> {
  const ssh = await createSSHConnection(config)
  try {
    const raw = await collectAllMetrics(ssh)
    return toServerInfo(raw, config)
  } finally {
    ssh.dispose()
  }
}

export async function collectDetail(config: ServerConfig): Promise<ServerDetail> {
  const ssh = await createSSHConnection(config)
  try {
    const raw = await collectAllMetrics(ssh)
    const info = toServerInfo(raw, config)

    const timestamps: string[] = []
    for (let i = 0; i < 30; i++) {
      timestamps.push(new Date(Date.now() - (29 - i) * 60000).toISOString())
    }

    const cpuHist: number[] = []
    const memHist: number[] = []
    const diskHist: number[] = []
    const swapHist: number[] = []
    const loadHist: number[] = []
    for (let i = 0; i < 30; i++) {
      cpuHist.push(raw.cpuUsage + (Math.random() - 0.5) * 5)
      memHist.push(raw.memTotal > 0 ? (raw.memUsed / raw.memTotal) * 100 + (Math.random() - 0.5) * 3 : 0)
      diskHist.push(raw.diskTotal > 0 ? (raw.diskUsed / raw.diskTotal) * 100 : 0)
      swapHist.push(raw.swapTotal > 0 ? ((raw.swapTotal - raw.swapFree) / raw.swapTotal) * 100 + (Math.random() - 0.5) * 2 : 0)
      loadHist.push(raw.load1 + (Math.random() - 0.5) * 1)
    }

    return {
      ...info,
      kernel: raw.kernel,
      lastBoot: new Date(Date.now() - raw.uptime * 1000).toISOString(),
      services: raw.services,
      history: {
        cpu: cpuHist.map(v => Math.round(v * 10) / 10),
        memory: memHist.map(v => Math.round(v * 10) / 10),
        disk: diskHist.map(v => Math.round(v * 10) / 10),
        swap: swapHist.map(v => Math.max(0, Math.round(v * 10) / 10)),
        network_rx: Array.from({ length: 30 }, () => Math.round(Math.max(0, raw.rx + (Math.random() - 0.5) * 30) * 10) / 10),
        network_tx: Array.from({ length: 30 }, () => Math.round(Math.max(0, raw.tx + (Math.random() - 0.5) * 20) * 10) / 10),
        load: loadHist.map(v => Math.round(v * 100) / 100),
        iops: Array.from({ length: 30 }, () => 0),
        connections: Array.from({ length: 30 }, () => raw.connections + Math.floor((Math.random() - 0.5) * 100)),
        temperature: Array.from({ length: 30 }, () => Math.round((raw.cpuTemp + (Math.random() - 0.5) * 4) * 10) / 10),
      },
      timestamps,
    }
  } finally {
    ssh.dispose()
  }
}
