// global.why = require('why-is-node-running')
const path = require('path')
const chalk = require('chalk')

const cwd = process.cwd()
console.log(chalk.blueBright(`=> ${process.argv[2]}`))
const start = Date.now()
const entry = require(path.join(cwd, process.argv[2]))

process.once('exit', code => {
  if (entry.skip) return
  if (code === 0) {
    console.log(chalk.greenBright(`✔  ${process.argv[2]} ${(Date.now() - start) / 1000}s`))
  } else {
    console.error(chalk.redBright(`❌ ${process.argv[2]} ${(Date.now() - start) / 1000}s Exit: ${code}`))
  }
})

let promise

if (typeof entry.then === 'function') {
  promise = entry
} else {
  promise = entry.skip ? Promise.resolve() : require('../util.js').load(entry.target).then(entry.test)
}

promise.then(
  () => {
    if (promise.immdiateExit) {
      process.exit(0)
    }
  },
  err => {
    console.error(err)
    process.exit(1)
  }
)
