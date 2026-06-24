export interface CPUInfo {
  model: string
  cores: number
  threads: number
  usage: number
  temperature: number
  architecture?: string
}

export interface MemoryInfo {
  total: number
  used: number
  free: number
  cached: number
  usage: number
}

export interface SwapInfo {
  total: number
  used: number
  free: number
  usage: number
}

export interface DiskPartitionInfo {
  mount: string
  device: string
  fsType: string
  total: number
  used: number
  free: number
  usage: number
}

export interface DiskInfo {
  total: number
  used: number
  free: number
  iops: number
  usage: number
  readSpeed?: number
  writeSpeed?: number
  partitions?: DiskPartitionInfo[]
}

export interface NetworkInterfaceInfo {
  name: string
  rx: number
  tx: number
  rxTotal?: number
  txTotal?: number
  ip?: string
  mac?: string
}

export interface NetworkInfo {
  rx: number
  tx: number
  connections: number
  interfaces?: NetworkInterfaceInfo[]
  tcpConnections?: number
  udpConnections?: number
}

export interface LoadInfo {
  load1: number
  load5: number
  load15: number
}

export interface ProcessesInfo {
  total: number
  running: number
  zombie: number
  sleeping?: number
  stopped?: number
}

export interface ContextSwitchesInfo {
  voluntary: number
  involuntary: number
}

export type ServerStatus = 'online' | 'warning' | 'critical' | 'offline' | 'loading'

export interface ServerInfo {
  id: string
  name: string
  hostname: string
  ip: string
  os: string
  status: ServerStatus
  pending?: boolean
  uptime: number
  cpu: CPUInfo
  memory: MemoryInfo
  swap: SwapInfo
  disk: DiskInfo
  network: NetworkInfo
  load: LoadInfo
  processes: ProcessesInfo
  contextSwitches?: ContextSwitchesInfo
  lastBoot?: string
  collectError?: string
}

export interface ServiceInfo {
  name: string
  status: 'active' | 'inactive' | 'failed'
  pid: number
}

export interface ServerHistory {
  cpu: number[]
  memory: number[]
  disk: number[]
  swap: number[]
  network_rx: number[]
  network_tx: number[]
  load: number[]
  iops: number[]
  connections: number[]
  temperature: number[]
  contextSwitches?: number[]
}

export interface ServerDetail extends ServerInfo {
  kernel: string
  lastBoot: string
  services: ServiceInfo[]
  history: ServerHistory
  timestamps: string[]
}
