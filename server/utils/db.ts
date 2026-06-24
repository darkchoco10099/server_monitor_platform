import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { ServerConfig, ServerConfigInput } from '~~/types/config'

let db: Database.Database | null = null

const DB_DIR = join(process.cwd(), 'data')

export function getDb(): Database.Database {
  if (!db) {
    mkdirSync(DB_DIR, { recursive: true })
    const dbPath = join(DB_DIR, 'servers.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.exec(`
      CREATE TABLE IF NOT EXISTS servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL DEFAULT 22,
        username TEXT NOT NULL,
        auth_type TEXT NOT NULL CHECK(auth_type IN ('password', 'key')),
        password TEXT,
        ssh_key_path TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
  }
  return db
}

export function getAllConfigs(): ServerConfig[] {
  const db = getDb()
  return (db.prepare('SELECT * FROM servers ORDER BY created_at DESC').all() as any[]).map(mapRow)
}

export function getConfigById(id: string): ServerConfig | undefined {
  const db = getDb()
  const row = db.prepare('SELECT * FROM servers WHERE id = ?').get(id) as any
  return row ? mapRow(row) : undefined
}

export function createConfig(input: ServerConfigInput): ServerConfig {
  const db = getDb()
  const id = randomUUID()
  db.prepare(`
    INSERT INTO servers (id, name, host, port, username, auth_type, password, ssh_key_path)
    VALUES (@id, @name, @host, @port, @username, @authType, @password, @sshKeyPath)
  `).run({
    id,
    name: input.name,
    host: input.host,
    port: input.port ?? 22,
    username: input.username,
    authType: input.authType,
    password: input.authType === 'password' ? input.password ?? null : null,
    sshKeyPath: input.authType === 'key' ? input.sshKeyPath ?? null : null,
  })
  return getConfigById(id)!
}

export function updateConfig(id: string, input: Partial<ServerConfigInput>): ServerConfig | undefined {
  const existing = getConfigById(id)
  if (!existing) return undefined

  const db = getDb()
  const fields: string[] = []
  const values: Record<string, unknown> = { id }

  if (input.name !== undefined) { fields.push('name = @name'); values.name = input.name }
  if (input.host !== undefined) { fields.push('host = @host'); values.host = input.host }
  if (input.port !== undefined) { fields.push('port = @port'); values.port = input.port }
  if (input.username !== undefined) { fields.push('username = @username'); values.username = input.username }
  if (input.authType !== undefined) { fields.push('auth_type = @authType'); values.authType = input.authType }
  if (input.password !== undefined) { fields.push('password = @password'); values.password = input.password }
  if (input.sshKeyPath !== undefined) { fields.push('ssh_key_path = @sshKeyPath'); values.sshKeyPath = input.sshKeyPath }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')")
    db.prepare(`UPDATE servers SET ${fields.join(', ')} WHERE id = @id`).run(values)
  }
  return getConfigById(id)
}

export function deleteConfig(id: string): boolean {
  const db = getDb()
  return db.prepare('DELETE FROM servers WHERE id = ?').run(id).changes > 0
}

function mapRow(row: any): ServerConfig {
  return {
    id: row.id,
    name: row.name,
    host: row.host,
    port: row.port,
    username: row.username,
    authType: row.auth_type,
    password: row.password ?? undefined,
    sshKeyPath: row.ssh_key_path ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
