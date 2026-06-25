import { getDb, getAllConfigs } from '~~/server/utils/db'
import type { ServerConfig } from '~~/types/config'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ configs: ServerConfig[] }>(event)
  if (!body.configs || !Array.isArray(body.configs) || body.configs.length === 0) {
    throw createError({ statusCode: 400, message: '无效的配置数据' })
  }

  // Remove existing configs and re-insert
  const db = getDb()
  const clear = db.prepare('DELETE FROM servers')
  const insert = db.prepare(`
    INSERT INTO servers (id, name, host, port, username, auth_type, password, ssh_key_path, created_at, updated_at)
    VALUES (@id, @name, @host, @port, @username, @authType, @password, @sshKeyPath, @createdAt, @updatedAt)
  `)

  const insertMany = db.transaction((configs: ServerConfig[]) => {
    clear.run()
    for (const c of configs) {
      insert.run({
        id: c.id,
        name: c.name,
        host: c.host,
        port: c.port,
        username: c.username,
        authType: c.authType,
        password: c.password ?? null,
        sshKeyPath: c.sshKeyPath ?? null,
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: c.updatedAt || new Date().toISOString(),
      })
    }
  })

  insertMany(body.configs)
  return { success: true, count: body.configs.length }
})
