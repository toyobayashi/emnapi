import { Writable } from 'stream'
import process from 'process'

globalThis.setImmediate ||= (callback, ...args) => setTimeout(callback, 0, ...args)
globalThis.clearImmediate ||= clearTimeout

Object.assign(process.env, globalThis.__EMNAPI_BROWSER_ENV__)

if (!process.stdout) {
  let stdoutLine = ''
  process.stdout = new Writable({
    write (chunk, _encoding, callback) {
      const lines = (stdoutLine + chunk.toString()).split(/\r?\n/)
      stdoutLine = lines.pop()
      for (const line of lines) console.log(line)
      callback()
    },
    final (callback) {
      if (stdoutLine) console.log(stdoutLine)
      stdoutLine = ''
      callback()
    }
  })
}

if (!process.stderr) {
  let stderrLine = ''
  process.stderr = new Writable({
    write (chunk, _encoding, callback) {
      const lines = (stderrLine + chunk.toString()).split(/\r?\n/)
      stderrLine = lines.pop()
      for (const line of lines) console.error(line)
      callback()
    },
    final (callback) {
      if (stderrLine) console.error(stderrLine)
      stderrLine = ''
      callback()
    }
  })
}

globalThis.process = process
