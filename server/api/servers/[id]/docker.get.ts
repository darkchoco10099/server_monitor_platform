import { getConfigById } from '~~/server/utils/db'
import { collectDockerOverview } from '~~/server/utils/docker'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: '缺少服务器 ID' })

  const config = getConfigById(id)
  if (!config) throw createError({ statusCode: 404, message: '未找到服务器配置' })

  return await collectDockerOverview(config)
})
