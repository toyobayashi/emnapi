import { WASI } from 'wasi'
import { ThreadMessageHandler, WASIThreads } from '@emnapi/wasi-threads'
import { child } from './run.js'
import { workerData, parentPort } from 'worker_threads'

parentPort.on('message', (data) => {
  globalThis.onmessage({ data })
})

globalThis.postMessage = function (...args) {
  parentPort.postMessage(...args)
}

console.log(`name: ${workerData.name}`)

child(WASI, ThreadMessageHandler, WASIThreads)
