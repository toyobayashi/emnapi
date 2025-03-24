import { WASI } from '../../../node_modules/@tybys/wasm-util/dist/wasm-util.esm.js'
import { Worker } from './proxy.js'
import { WASIThreads } from '../dist/wasi-threads.js'
import { main } from './run.js'

main(WASI, WASIThreads, Worker, { env: {} }, './browser-worker.js')
