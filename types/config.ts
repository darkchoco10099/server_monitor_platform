export type AuthType = 'password' | 'key'

export interface ServerConfig {
  id: string
  name: string
  host: string
  port: number
  username: string
  authType: AuthType
  password?: string
  sshKeyPath?: string
  createdAt: string
  updatedAt: string
}

export interface ServerConfigInput {
  name: string
  host: string
  port?: number
  username: string
  authType: AuthType
  password?: string
  sshKeyPath?: string
}
