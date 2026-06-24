import { NodeSSH } from 'node-ssh'
import type { ServerConfig } from '~~/types/config'

export async function createSSHConnection(config: ServerConfig): Promise<NodeSSH> {
  const ssh = new NodeSSH()
  const opts: Record<string, unknown> = {
    host: config.host,
    port: config.port,
    username: config.username,
    readyTimeout: 10000,
  }

  if (config.authType === 'password') {
    opts.password = config.password
  } else if (config.authType === 'key') {
    const key = config.sshKeyPath
    if (!key) throw new Error('未提供 SSH 密钥')
    if (key.startsWith('/') || key.startsWith('~')) {
      opts.privateKeyPath = key
    } else {
      opts.privateKey = key
    }
  }

  await ssh.connect(opts as any)
  return ssh
}

export async function execWithTimeout(
  ssh: NodeSSH,
  command: string,
  timeoutMs = 8000
): Promise<{ stdout: string; stderr: string }> {
  const execPromise = ssh.execCommand(command)
  const result = await Promise.race([
    execPromise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`命令超时 (${timeoutMs / 1000}s): ${command.slice(0, 40)}...`)), timeoutMs)
    ),
  ])
  return result
}
