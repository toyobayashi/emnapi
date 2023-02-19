if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-undef
  window.WASI = wasmUtil.WASI
} else {
  exports.WASI = {
    createSync (...args) {
      // return new (require('wasi').WASI)(...args)
      return require('@tybys/wasm-util').WASI.createSync(...args)
    }
  }
}
