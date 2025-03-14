import path from 'path'
import fs from 'fs'
import { globSync } from 'glob'

globSync('**/*.d.ts', { cwd: path.join(import.meta.dirname, '../src/emnapi') }).forEach(file => {
  const from = path.join(path.join(import.meta.dirname, '../src/emnapi', file))
  const to = path.join(path.join(import.meta.dirname, '../dist/types/emnapi', file))
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(from, to)
})
