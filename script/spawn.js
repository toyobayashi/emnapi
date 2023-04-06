class ChildProcessError extends Error {
  constructor (message, code) {
    super(message)
    this.code = code
    this.name = 'ChildProcessError'
  }
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {string=} cwdPath
 * @param {'inherit' | 'pipe' | 'ignore'=} stdin
 * @returns {Promise<void> & { cp: import('child_process').ChildProcess }}
 */
function spawn (command, args, cwdPath, stdin) {
  const argsString = args.map(a => a.indexOf(' ') !== -1 ? ('"' + a + '"') : a).join(' ')
  const cwd = cwdPath || process.cwd()
  console.log(`[spawn] ${cwd}${process.platform === 'win32' ? '>' : '$'} ${command} ${argsString}`)
  const cp = require('child_process').spawn(command, args, {
    env: process.env,
    cwd,
    stdio: stdin ? [stdin, 'inherit', 'inherit'] : 'inherit'
  })
  const p = new Promise((resolve, reject) => {
    cp.once('exit', (code, reason) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new ChildProcessError(
          `Child process exit: ${code}. Reason: ${reason}\n\n${command} ${argsString}\n`,
          code
        ))
      }
    })
  })
  p.cp = cp
  return p
}

function spawnSync (command, args, cwdPath) {
  const argsString = args.map(a => a.indexOf(' ') !== -1 ? ('"' + a + '"') : a).join(' ')
  const cwd = cwdPath || process.cwd()
  console.log(`[spawn] ${cwd}${process.platform === 'win32' ? '>' : '$'} ${command} ${argsString}`)
  const result = require('child_process').spawnSync(command, args, {
    env: process.env,
    cwd
  })
  if (result.status) {
    throw new ChildProcessError(
      `Child process exit: ${result.status}. Reason: ${result.signal}\n\n${command} ${argsString}\n`,
      result.status
    )
  }
  return result
}

exports.spawn = spawn
exports.spawnSync = spawnSync
exports.ChildProcessError = ChildProcessError
