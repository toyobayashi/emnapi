const fs = require('fs-extra')
const path = require('path')

async function main () {
  const [major, minor, patch] = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')).version.split('.').map(Number)
  const headerPath = path.join(__dirname, '../include/emnapi.h')
  const emnapiHeader = fs.readFileSync(headerPath, 'utf8')
  fs.writeFileSync(
    headerPath,
    emnapiHeader
      .replace(/#define EMNAPI_MAJOR_VERSION (\d+)/, `#define EMNAPI_MAJOR_VERSION ${major}`)
      .replace(/#define EMNAPI_MINOR_VERSION (\d+)/, `#define EMNAPI_MINOR_VERSION ${minor}`)
      .replace(/#define EMNAPI_PATCH_VERSION (\d+)/, `#define EMNAPI_PATCH_VERSION ${patch}`),
    'utf8'
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
