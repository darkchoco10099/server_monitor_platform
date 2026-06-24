import { getConfigById } from '~~/server/utils/db'
import { collectDetail } from '~~/server/utils/collector'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: '缺少服务器 ID' })

  const config = getConfigById(id)
  if (!config) throw createError({ statusCode: 404, message: '未找到服务器配置' })

  try {
    return await collectDetail(config)
  } catch (err: any) {
    throw createError({ statusCode: 500, message: `采集失败: ${err.message}` })
  }
})
