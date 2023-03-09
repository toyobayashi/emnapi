if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-undef
  window.WASI = wasmUtil.WASI
} else {
  // exports.WASI = require('wasi').WASI
  exports.WASI = require('@tybys/wasm-util').WASI
}
