import { createConfig } from '~~/server/utils/db'
import type { ServerConfigInput } from '~~/types/config'

export default defineEventHandler(async (event) => {
  const body = await readBody<ServerConfigInput>(event)
  if (!body.name || !body.host || !body.username) {
    throw createError({ statusCode: 400, message: '名称、主机和用户名不能为空' })
  }
  const config = createConfig({
    name: body.name,
    host: body.host,
    port: body.port ?? 22,
    username: body.username,
    authType: body.authType || 'password',
    password: body.password,
    sshKeyPath: body.sshKeyPath,
  })
  return config
})
