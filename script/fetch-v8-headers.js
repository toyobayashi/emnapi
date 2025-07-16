import fs from 'fs-extra'
import path from 'path'
import { pipeline } from 'stream/promises'
import { spawn } from 'child_process'
import { spawnSync } from './spawn.js'
import envPaths from 'env-paths'

const cacheDir = envPaths('node-gyp', { suffix: '' }).cache
const targetVersion = '22.16.0'
const versionDir = path.join(cacheDir, targetVersion)

if (!fs.existsSync(versionDir)) {
  spawnSync('npx', ['node-gyp', 'install', '--target', targetVersion, '--arch', 'x64'])
}

const includeDir = path.join(cacheDir, targetVersion, 'include/node')

const root = path.join(import.meta.dirname, '..')
const temp = path.join(root, 'temp')
const original = path.join(temp, `node-${targetVersion}`)
const workspace = path.join(temp, 'node')
const patches = path.join(root, 'patches')
const patch = path.join(patches, 'v8.patch')

function copyOriginalHeaders () {
  fs.removeSync(original)
  fs.mkdirSync(original, { recursive: true })
  const items = fs.readdirSync(includeDir).filter(item => {
    return item.startsWith('v8') || item === 'cppgc' || item === 'libplatform'
  }).map(item => path.join(includeDir, item))
  for (const item of items) {
    const dest = path.join(original, path.basename(item))
    if (fs.existsSync(dest)) {
      fs.removeSync(dest)
    }
    fs.copySync(item, dest)
  }
  return original
}

function generateWorkspace () {
  const original = copyOriginalHeaders()
  fs.copySync(original, workspace)
  if (fs.existsSync(patch)) {
    spawnSync('patch', ['-p1', '-i', patch], workspace)
  }
}

async function diffHeaders () {
  const patches = path.join(root, 'patches')
  fs.mkdirSync(patches, { recursive: true })
  const { stdio } = spawn('diff', ['-urN', path.relative(temp, original), path.relative(temp, workspace)], {
    stdio: ['inherit', 'pipe', 'inherit'],
    env: process.env,
    cwd: temp
  })
  await pipeline(stdio[1], fs.createWriteStream(path.join(patches, 'v8.patch')))
}

async function main () {
  if (process.argv[2] === '--diff') {
    if (!fs.existsSync(workspace) || !fs.existsSync(original)) {
      throw new Error('Original headers or workspace not found. Please run without "--diff" argument first to generate them.')
    }
    await diffHeaders()
  } else {
    generateWorkspace()
    const emnapiInclude = path.join(import.meta.dirname, '..', 'packages', 'emnapi', 'include', 'node')
    const items = fs.readdirSync(workspace).map(item => path.join(workspace, item))
    for (const item of items) {
      const dest = path.join(emnapiInclude, path.basename(item))
      if (fs.existsSync(dest)) {
        fs.removeSync(dest)
      }
      fs.copySync(item, dest)
    }
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
