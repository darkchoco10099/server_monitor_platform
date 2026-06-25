import { getAllConfigs } from '~~/server/utils/db'

export default defineEventHandler(() => {
  const configs = getAllConfigs()
  return configs
})
