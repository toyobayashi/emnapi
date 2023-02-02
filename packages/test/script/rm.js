if (process.argv[2]) {
  require('fs').rmSync(process.argv[2], { force: true, recursive: true })
}
