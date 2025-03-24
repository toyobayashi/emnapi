import { WASI } from 'wasi'
import { Worker } from 'worker_threads'
import { WASIThreads } from '@emnapi/wasi-threads'
import { main } from './run.js'

main(WASI, WASIThreads, Worker, process, './worker.js')
