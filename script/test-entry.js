const path = require('path')
const chalk = require('chalk')

const cwd = process.cwd()
console.log(chalk.blueBright(`=> ${process.argv[2]}`))
const start = Date.now()
const promise = require(path.join(cwd, process.argv[2]))

promise.then(() => {
  console.log(chalk.greenBright(`✔  ${process.argv[2]} ${(Date.now() - start) / 1000}s`))
  process.exit(0)
}).catch(err => {
  console.error(err)
  console.error(chalk.redBright(`❌ ${process.argv[2]} ${(Date.now() - start) / 1000}s`))
  process.exit(1)
})
