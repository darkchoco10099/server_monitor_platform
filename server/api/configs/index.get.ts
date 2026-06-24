import { getAllConfigs } from '~~/server/utils/db'

export default defineEventHandler(() => {
  const configs = getAllConfigs()
  return configs.map(({ password, sshKeyPath, ...rest }) => ({
    ...rest,
    hasPassword: !!password,
    hasSshKey: !!sshKeyPath,
  }))
})
