import fs from 'fs-extra'
import path from 'path'
import { spawnSync } from './spawn.js'
import envPaths from 'env-paths'

const cacheDir = envPaths('node-gyp', { suffix: '' }).cache
const targetVersion = process.env.NODE_VERSION || '22.15.0'
const versionDir = path.join(cacheDir, targetVersion)

if (!fs.existsSync(versionDir)) {
  spawnSync('npx', ['node-gyp', 'install', '--target', targetVersion, '--arch', 'x64'])
}

const includeDir = path.join(cacheDir, targetVersion, 'include/node')

const items = fs.readdirSync(includeDir).filter(item => {
  return item.startsWith('v8') || item === 'cppgc' || item === 'libplatform'
}).map(item => path.join(includeDir, item))

const emnapiInclude = path.join(import.meta.dirname, '..', 'packages', 'emnapi', 'include', 'node')
for (const item of items) {
  const dest = path.join(emnapiInclude, path.basename(item))
  if (fs.existsSync(dest)) {
    fs.removeSync(dest)
  }
  fs.copySync(item, dest)
}

const v8config = path.join(emnapiInclude, 'v8config.h')
const v8configContent = fs.readFileSync(v8config, 'utf-8')
fs.writeFileSync(v8config,
  v8configContent
    .replace(/(#elif defined\(_M_IX86\) \|\| defined\(__i386__\))/g, '$1 || defined(__wasm32__)')
    .replace(/(#if defined\(_M_X64\) \|\| defined\(__x86_64__\))/g, '$1 || defined(__wasm64__)')
  ,
  'utf-8'
)
