import type { ServerConfig } from '~~/types/config'
import type { DockerContainer, DockerImage, DockerOverview, DockerSystemInfo } from '~~/types/docker'
import { createSSHConnection, execWithTimeout } from './ssh'

export async function collectDockerOverview(config: ServerConfig): Promise<DockerOverview> {
  const ssh = await createSSHConnection(config)
  try {
    const infoResult = await execWithTimeout(ssh, "docker info --format '{{json .}}' 2>/dev/null || echo 'null'", 8000)
    if (infoResult.stdout.trim() === 'null' || infoResult.stdout.trim() === '') {
      return { systemInfo: null, containers: [], images: [], error: 'Docker 未安装或无法访问' }
    }

    const rawInfo = JSON.parse(infoResult.stdout.trim())
    const systemInfo: DockerSystemInfo = {
      containers: rawInfo.Containers ?? 0,
      containersRunning: rawInfo.ContainersRunning ?? 0,
      containersPaused: rawInfo.ContainersPaused ?? 0,
      containersStopped: rawInfo.ContainersStopped ?? 0,
      images: rawInfo.Images ?? 0,
      driver: rawInfo.Driver ?? 'unknown',
      serverVersion: rawInfo.ServerVersion ?? 'unknown',
      operatingSystem: rawInfo.OperatingSystem ?? 'unknown',
      cpus: rawInfo.NCPU ?? 0,
      memoryTotal: rawInfo.MemTotal ?? 0,
    }

    // Containers
    const psResult = await execWithTimeout(ssh, "docker ps -a --format '{{json .}}' 2>/dev/null", 8000)
    const containers = psResult.stdout.trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const raw = JSON.parse(line)
        return {
          id: raw.ID || '',
          name: raw.Names || '',
          image: raw.Image || '',
          state: raw.State || '',
          status: raw.Status || '',
          ports: raw.Ports || '',
          cpuPercent: 0,
          memUsage: 0,
          memLimit: 0,
          memPercent: 0,
          netRx: 0,
          netTx: 0,
          pids: 0,
        } as DockerContainer
      })

    // Stats
    const statsResult = await execWithTimeout(ssh, "docker stats --no-stream --format '{{json .}}' 2>/dev/null", 8000)
    const statsMap = new Map<string, any>()
    statsResult.stdout.trim()
      .split('\n')
      .filter(Boolean)
      .forEach(line => {
        const raw = JSON.parse(line)
        statsMap.set(raw.ID || raw.Name, raw)
      })

    // Merge stats into containers
    for (const c of containers) {
      const s = statsMap.get(c.id) || statsMap.get(c.name)
      if (s) {
        c.cpuPercent = parseFloat(s.CPUPerc) || 0
        const memParts = (s.MemUsage || '').split('/')
        if (memParts.length === 2) {
          c.memUsage = parseMemToBytes(memParts[0].trim())
          c.memLimit = parseMemToBytes(memParts[1].trim())
        }
        c.memPercent = parseFloat(s.MemPerc) || 0
        const netParts = (s.NetIO || '').split('/')
        if (netParts.length === 2) {
          c.netRx = parseMemToBytes(netParts[0].trim())
          c.netTx = parseMemToBytes(netParts[1].trim())
        }
        c.pids = parseInt(s.PIDs) || 0
      }
    }

    // Images
    const imgResult = await execWithTimeout(ssh, "docker images --format '{{json .}}' 2>/dev/null", 8000)
    const images: DockerImage[] = imgResult.stdout.trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const raw = JSON.parse(line)
        return {
          id: (raw.ID || '').replace('sha256:', '').slice(0, 12),
          repository: raw.Repository || '<none>',
          tag: raw.Tag || '<none>',
          size: parseSizeToBytes(raw.Size || '0'),
          created: raw.CreatedSince || raw.CreatedAt || '',
          unused: false,
        }
      })

    // Mark unused images — 先通过 repository:tag 匹配容器使用的镜像 ID，再按 ID 标记未使用
    const usedImageIds = new Set<string>()
    for (const c of containers) {
      // 在镜像列表中找与容器 image 名称匹配的镜像
      const matched = images.find(img => `${img.repository}:${img.tag}` === c.image)
      if (matched) {
        usedImageIds.add(matched.id)
      }
    }
    for (const img of images) {
      // 悬空镜像（无 repo 无 tag）一定未使用；否则看镜像 ID 是否被任何容器引用
      if (img.repository === '<none>') {
        img.unused = true
      } else {
        img.unused = !usedImageIds.has(img.id)
      }
    }

    return { systemInfo, containers, images }
  } catch (e: any) {
    return { systemInfo: null, containers: [], images: [], error: `Docker 采集失败: ${e.message}` }
  } finally {
    ssh.dispose()
  }
}

export async function startContainer(config: ServerConfig, containerId: string) {
  if (!containerId) return { success: false, message: '容器 ID 不能为空' }
  const ssh = await createSSHConnection(config)
  try {
    const { stdout, stderr } = await execWithTimeout(ssh, `docker start ${containerId}`, 15000)
    if (stderr && !stdout.trim()) return { success: false, message: stderr.trim() }
    return { success: true, message: stdout.trim() || `容器 ${containerId.slice(0, 12)} 已启动` }
  } catch (e: any) {
    return { success: false, message: `启动失败: ${e.message}` }
  } finally {
    ssh.dispose()
  }
}

export async function stopContainer(config: ServerConfig, containerId: string) {
  if (!containerId) return { success: false, message: '容器 ID 不能为空' }
  const ssh = await createSSHConnection(config)
  try {
    const { stdout, stderr } = await execWithTimeout(ssh, `docker stop ${containerId}`, 15000)
    if (stderr && !stdout.trim()) return { success: false, message: stderr.trim() }
    return { success: true, message: stdout.trim() || `容器 ${containerId.slice(0, 12)} 已停止` }
  } catch (e: any) {
    return { success: false, message: `停止失败: ${e.message}` }
  } finally {
    ssh.dispose()
  }
}

export async function deleteImage(config: ServerConfig, imageId: string) {
  if (!imageId) return { success: false, message: '镜像 ID 不能为空' }
  const ssh = await createSSHConnection(config)
  try {
    const { stdout, stderr } = await execWithTimeout(ssh, `docker rmi ${imageId}`, 15000)
    if (stderr && !stdout.trim()) return { success: false, message: stderr.trim() }
    return { success: true, message: stdout.trim() || `镜像 ${imageId.slice(0, 12)} 已删除` }
  } catch (e: any) {
    return { success: false, message: `删除失败: ${e.message}` }
  } finally {
    ssh.dispose()
  }
}

function parseMemToBytes(s: string): number {
  const m = s.match(/^([\d.]+)\s*(KiB|MiB|GiB|TiB|kB|MB|GB|TB|B)?$/i)
  if (!m) return 0
  const v = parseFloat(m[1])
  const u = (m[2] || 'B').toLowerCase()
  const multipliers: Record<string, number> = {
    b: 1, kb: 1024, kib: 1024, mb: 1024 ** 2, mib: 1024 ** 2,
    gb: 1024 ** 3, gib: 1024 ** 3, tb: 1024 ** 4, tib: 1024 ** 4,
  }
  return Math.round(v * (multipliers[u] || 1))
}

function parseSizeToBytes(s: string): number {
  return parseMemToBytes(s)
}
