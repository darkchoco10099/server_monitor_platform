import { getConfigById } from '~~/server/utils/db'
import { startContainer } from '~~/server/utils/docker'

export default defineEventHandler(async (event) => {
  const serverId = getRouterParam(event, 'id')
  if (!serverId) throw createError({ statusCode: 400, message: '缺少服务器 ID' })

  const containerId = getRouterParam(event, 'containerId')
  if (!containerId) throw createError({ statusCode: 400, message: '缺少容器 ID' })

  const config = getConfigById(serverId)
  if (!config) throw createError({ statusCode: 404, message: '未找到服务器配置' })

  return await startContainer(config, containerId)
})
