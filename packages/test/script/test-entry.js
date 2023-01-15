const path = require('path')
const chalk = require('chalk')

const cwd = process.cwd()
console.log(chalk.blueBright(`=> ${process.argv[2]}`))
const start = Date.now()
const promise = require(path.join(cwd, process.argv[2]))

process.once('exit', code => {
  if (code === 0) {
    console.log(chalk.greenBright(`✔  ${process.argv[2]} ${(Date.now() - start) / 1000}s`))
  } else {
    console.error(chalk.redBright(`❌ ${process.argv[2]} ${(Date.now() - start) / 1000}s Exit: ${code}`))
  }
})

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
