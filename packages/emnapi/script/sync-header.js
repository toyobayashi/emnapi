const headers = [
  'js_native_api_types.h',
  'js_native_api.h',
  'node_api_types.h',
  'node_api.h',
]

const nodeRepo = process.argv[2]

if (!nodeRepo) {
  console.error('Usage: node sync-header.js <path-to-node-repo>')
  process.exit(1)
}

const fs = require('fs')
const path = require('path')

headers.forEach(header => {
  const src = path.join(nodeRepo, 'src', header)
  const dest = path.join(__dirname, '../include/node', header)
  fs.copyFileSync(src, dest)
})
