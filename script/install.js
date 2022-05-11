const path = require('path')

function spawn (command, args, cwdPath, stdin) {
  const argsString = args.map(a => a.indexOf(' ') !== -1 ? ('"' + a + '"') : a).join(' ')
  const cwd = cwdPath || process.cwd()
  console.log(`[spawn] ${cwd}${process.platform === 'win32' ? '>' : '$'} ${command} ${argsString}`)
  const cp = require('child_process').spawn(command, args, {
    env: process.env,
    cwd: cwd,
    stdio: stdin ? [stdin, 'inherit', 'inherit'] : 'inherit'
  })
  const p = new Promise((resolve, reject) => {
    cp.once('exit', (code, reason) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Child process exit: ${code}. Reason: ${reason}\n\n${command} ${argsString}\n`))
      }
    })
  })
  p.cp = cp
  return p
}

async function main () {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  await spawn(npm, ['install', '--legacy-peer-deps', '--no-package-lock'], path.join(__dirname, '..'))
  await spawn(npm, ['install', '--legacy-peer-deps', '--no-package-lock', '--ignore-scripts'], path.join(__dirname, '../packages/runtime'))
  await spawn(npm, ['install', '--legacy-peer-deps', '--no-package-lock', '--ignore-scripts'], path.join(__dirname, '../packages/emnapi'))
  await spawn(npm, ['install', '--legacy-peer-deps', '--no-package-lock', '--ignore-scripts'], path.join(__dirname, '../packages/test'))
}

main()
