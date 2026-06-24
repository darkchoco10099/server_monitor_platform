import { updateConfig } from '~~/server/utils/db'
import type { ServerConfigInput } from '~~/types/config'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: '缺少 ID' })
  const body = await readBody<Partial<ServerConfigInput>>(event)
  const updated = updateConfig(id, body)
  if (!updated) throw createError({ statusCode: 404, message: '未找到' })
  return updated
})
