import { getConfigById } from '~~/server/utils/db'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: '缺少 ID' })
  const config = getConfigById(id)
  if (!config) throw createError({ statusCode: 404, message: '未找到' })
  const { password, sshKeyPath, ...rest } = config
  return { ...rest, hasPassword: !!password, hasSshKey: !!sshKeyPath }
})
