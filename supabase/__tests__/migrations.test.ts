import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_DIR = path.resolve(__dirname, '..')
const MIGRATIONS_DIR = path.join(SUPABASE_DIR, 'migrations')

describe('Supabase migrations', () => {
  it('migrations directory exists', () => {
    expect(fs.existsSync(MIGRATIONS_DIR)).toBe(true)
  })

  it('has at least one migration file', () => {
    const files = fs.readdirSync(MIGRATIONS_DIR)
    const sqlFiles = files.filter((f) => f.endsWith('.sql'))
    expect(sqlFiles.length).toBeGreaterThanOrEqual(1)
  })

  it('migration files follow timestamp naming convention (YYYYMMDDHHMMSS_*.sql)', () => {
    const files = fs.readdirSync(MIGRATIONS_DIR)
    const sqlFiles = files.filter((f) => f.endsWith('.sql'))
    const pattern = /^\d{14}_.*\.sql$/

    for (const file of sqlFiles) {
      expect(file).toMatch(pattern)
    }
  })

  it('initial migration contains all core table definitions', () => {
    const files = fs.readdirSync(MIGRATIONS_DIR)
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort()
    const initialMigration = fs.readFileSync(
      path.join(MIGRATIONS_DIR, sqlFiles[0]),
      'utf-8'
    )

    const requiredTables = [
      'trades',
      'j_quants_tokens',
      'iv_history',
      'push_subscriptions',
      'user_preferences',
      'playbooks',
    ]

    for (const table of requiredTables) {
      expect(initialMigration).toContain(`create table if not exists ${table}`)
    }
  })

  it('initial migration contains RLS policies', () => {
    const files = fs.readdirSync(MIGRATIONS_DIR)
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort()
    const initialMigration = fs.readFileSync(
      path.join(MIGRATIONS_DIR, sqlFiles[0]),
      'utf-8'
    )

    expect(initialMigration).toContain('enable row level security')
    expect(initialMigration).toContain('create policy')
  })

  it('initial migration contains triggers for updated_at', () => {
    const files = fs.readdirSync(MIGRATIONS_DIR)
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort()
    const initialMigration = fs.readFileSync(
      path.join(MIGRATIONS_DIR, sqlFiles[0]),
      'utf-8'
    )

    expect(initialMigration).toContain('update_updated_at')
    expect(initialMigration).toContain('create trigger')
  })

  it('initial migration contains indexes', () => {
    const files = fs.readdirSync(MIGRATIONS_DIR)
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort()
    const initialMigration = fs.readFileSync(
      path.join(MIGRATIONS_DIR, sqlFiles[0]),
      'utf-8'
    )

    expect(initialMigration).toContain('create index')
  })

  it('initial migration content matches schema.sql', () => {
    const schemaPath = path.join(SUPABASE_DIR, 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf-8')

    const files = fs.readdirSync(MIGRATIONS_DIR)
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort()
    const initialMigration = fs.readFileSync(
      path.join(MIGRATIONS_DIR, sqlFiles[0]),
      'utf-8'
    )

    expect(initialMigration).toBe(schema)
  })
})
