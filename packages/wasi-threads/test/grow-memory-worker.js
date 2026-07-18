import { parentPort, workerData } from 'node:worker_threads'

workerData.memory.grow(1)
parentPort.postMessage(null)
