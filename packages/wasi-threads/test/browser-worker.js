import { WASI } from '../../../node_modules/@tybys/wasm-util/dist/wasm-util.esm.js'
import { ThreadMessageHandler, WASIThreads } from '../dist/wasi-threads.js'
import { child } from './run.js'

console.log(`name: ${globalThis.name}`)
child(WASI, ThreadMessageHandler, WASIThreads)
