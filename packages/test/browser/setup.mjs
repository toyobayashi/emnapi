globalThis.setImmediate ||= (callback, ...args) => setTimeout(callback, 0, ...args)
globalThis.clearImmediate ||= clearTimeout

Object.assign(globalThis.process.env, globalThis.__EMNAPI_BROWSER_ENV__)
