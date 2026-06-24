export interface DockerContainer {
  id: string
  name: string
  image: string
  state: string
  status: string
  ports: string
  cpuPercent: number
  memUsage: number
  memLimit: number
  memPercent: number
  netRx: number
  netTx: number
  pids: number
}

export interface DockerImage {
  id: string
  repository: string
  tag: string
  size: number
  created: string
  unused: boolean
}

export interface DockerSystemInfo {
  containers: number
  containersRunning: number
  containersPaused: number
  containersStopped: number
  images: number
  driver: string
  serverVersion: string
  operatingSystem: string
  cpus: number
  memoryTotal: number
}

export interface DockerOverview {
  systemInfo: DockerSystemInfo | null
  containers: DockerContainer[]
  images: DockerImage[]
  error?: string
}
