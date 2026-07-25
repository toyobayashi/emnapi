const { parentPort, workerData } = require('node:worker_threads')

workerData.memory.grow(1)
parentPort.postMessage(null)
