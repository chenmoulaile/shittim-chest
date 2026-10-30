import initSqlJs, { type Database as SqlDatabase } from 'sql.js'

/**
 * 数据持久化：Web 环境下的 SQLite（sql.js + wasm，完全离线）
 * 元数据索引存 SQLite；快照以 base64 形式落到 localStorage 以便下次启动恢复。
 * 若 wasm 初始化失败，自动降级为 localStorage 存储层（同接口）。
 */
export interface ProgressRow {
  unitId: string
  completed: boolean
  bestScore: number
  updatedAt: string
}

const DB_KEY = 'shittim-chest-db-v1'

export class GameDatabase {
  private sql: SqlDatabase | null = null
  private fallback = new Map<string, string>()

  static async create(): Promise<GameDatabase> {
    const db = new GameDatabase()
    try {
      const SQL = await initSqlJs({
        // 相对页面 baseURI 解析（emscripten 默认相对 JS 脚本目录，会导致路径错误）
        locateFile: (f: string) => new URL(`wasm/${f}`, document.baseURI).href,
      })
      db.sql = new SQL.Database()
      db.sql.run(`
        CREATE TABLE IF NOT EXISTS progress (
          unit_id TEXT PRIMARY KEY,
          completed INTEGER NOT NULL DEFAULT 0,
          best_score INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS flags (
          unit_id TEXT NOT NULL,
          flag TEXT NOT NULL,
          created_at TEXT NOT NULL,
          PRIMARY KEY (unit_id, flag)
        );
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `)
      db.restore()
    } catch (e) {
      console.warn('[db] SQLite 初始化失败，降级为 localStorage：', e)
      db.sql = null
    }
    return db
  }

  /* ---------- progress ---------- */
  async getProgress(unitId: string): Promise<ProgressRow | null> {
    if (!this.sql) {
      const raw = this.fallback.get('p:' + unitId)
      return raw ? (JSON.parse(raw) as ProgressRow) : null
    }
    const stmt = this.sql.prepare('SELECT unit_id, completed, best_score, updated_at FROM progress WHERE unit_id = ?')
    stmt.bind([unitId])
    let row: ProgressRow | null = null
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>
      row = {
        unitId: r.unit_id as string,
        completed: Number(r.completed) === 1,
        bestScore: Number(r.best_score),
        updatedAt: r.updated_at as string,
      }
    }
    stmt.free()
    return row
  }

  async allProgress(): Promise<Record<string, ProgressRow>> {
    const out: Record<string, ProgressRow> = {}
    if (!this.sql) {
      for (const [k, v] of this.fallback) {
        if (k.startsWith('p:')) { const row = JSON.parse(v) as ProgressRow; out[row.unitId] = row }
      }
      return out
    }
    const stmt = this.sql.prepare('SELECT unit_id, completed, best_score, updated_at FROM progress')
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>
      const row: ProgressRow = {
        unitId: r.unit_id as string,
        completed: Number(r.completed) === 1,
        bestScore: Number(r.best_score),
        updatedAt: r.updated_at as string,
      }
      out[row.unitId] = row
    }
    stmt.free()
    return out
  }

  async markProgress(unitId: string, opts: { completed?: boolean; score?: number }): Promise<void> {
    const prev = await this.getProgress(unitId)
    const row: ProgressRow = {
      unitId,
      completed: (prev?.completed || opts.completed) ?? false,
      bestScore: Math.max(prev?.bestScore ?? 0, opts.score ?? 0),
      updatedAt: new Date().toISOString(),
    }
    if (!this.sql) { this.fallback.set('p:' + unitId, JSON.stringify(row)); this.persistFallback(); return }
    this.sql.run(
      'INSERT INTO progress (unit_id, completed, best_score, updated_at) VALUES (?,?,?,?) ' +
      'ON CONFLICT(unit_id) DO UPDATE SET completed=excluded.completed, best_score=excluded.best_score, updated_at=excluded.updated_at',
      [row.unitId, row.completed ? 1 : 0, row.bestScore, row.updatedAt],
    )
    this.persist()
  }

  /* ---------- flags（选项历史等） ---------- */
  async addFlag(unitId: string, flag: string): Promise<void> {
    if (!this.sql) {
      const key = 'f:' + unitId
      const set = new Set<string>(JSON.parse(this.fallback.get(key) ?? '[]') as string[])
      set.add(flag)
      this.fallback.set(key, JSON.stringify([...set]))
      this.persistFallback()
      return
    }
    this.sql.run(
      'INSERT OR IGNORE INTO flags (unit_id, flag, created_at) VALUES (?,?,?)',
      [unitId, flag, new Date().toISOString()],
    )
    this.persist()
  }

  async flagsOf(unitId: string): Promise<string[]> {
    if (!this.sql) return JSON.parse(this.fallback.get('f:' + unitId) ?? '[]') as string[]
    const stmt = this.sql.prepare('SELECT flag FROM flags WHERE unit_id = ?')
    stmt.bind([unitId])
    const out: string[] = []
    while (stmt.step()) out.push((stmt.getAsObject().flag) as string)
    stmt.free()
    return out
  }

  /* ---------- settings ---------- */
  async getSetting(key: string): Promise<string | null> {
    if (!this.sql) return this.fallback.get('s:' + key) ?? null
    const stmt = this.sql.prepare('SELECT value FROM settings WHERE key = ?')
    stmt.bind([key])
    let v: string | null = null
    while (stmt.step()) v = stmt.getAsObject().value as string
    stmt.free()
    return v
  }

  async setSetting(key: string, value: string): Promise<void> {
    if (!this.sql) { this.fallback.set('s:' + key, value); this.persistFallback(); return }
    this.sql.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)', [key, value])
    this.persist()
  }

  /* ---------- 快照持久化 ---------- */
  private persist(): void {
    if (!this.sql) return
    try {
      const data = this.sql.export()
      let bin = ''
      const chunk = 0x8000
      for (let i = 0; i < data.length; i += chunk) {
        bin += String.fromCharCode(...data.subarray(i, i + chunk))
      }
      localStorage.setItem(DB_KEY, btoa(bin))
    } catch (e) { console.warn('[db] 持久化失败', e) }
  }

  private restore(): void {
    if (!this.sql) return
    const b64 = localStorage.getItem(DB_KEY)
    if (!b64) return
    try {
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      this.sql = new (this.sql.constructor as new (data?: Uint8Array) => SqlDatabase)(bytes)
    } catch (e) { console.warn('[db] 恢复快照失败，使用新库', e) }
  }

  private persistFallback(): void {
    try {
      const obj: Record<string, string> = {}
      for (const [k, v] of this.fallback) obj[k] = v
      localStorage.setItem(DB_KEY + '-fallback', JSON.stringify(obj))
    } catch { /* ignore */ }
  }
}
