import { deleteConfig } from '~~/server/utils/db'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: '缺少 ID' })
  const ok = deleteConfig(id)
  if (!ok) throw createError({ statusCode: 404, message: '未找到' })
  return { success: true }
})
