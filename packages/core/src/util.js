/* eslint-disable no-undef */

const _WebAssembly = typeof WebAssembly !== 'undefined'
  ? WebAssembly
  : typeof WXWebAssembly !== 'undefined'
    ? WXWebAssembly
    : undefined

export { _WebAssembly }

function validateImports (imports) {
  if (imports && typeof imports !== 'object') {
    throw new TypeError('imports must be an object or undefined')
  }
}

export function load (wasmInput, imports) {
  if (!wasmInput) throw new TypeError('Invalid wasm source')
  validateImports(imports)
  imports = imports != null ? imports : {}

  // Promise<string | URL | Response | BufferSource | WebAssembly.Module>
  try {
    const then = wasmInput.then
    if (typeof then === 'function') {
      return then.call(wasmInput, (input) => load(input, imports))
    }
  } catch (_) {}

  // BufferSource
  if (wasmInput instanceof ArrayBuffer || ArrayBuffer.isView(wasmInput)) {
    return _WebAssembly.instantiate(wasmInput, imports)
  }

  // WebAssembly.Module
  if (wasmInput instanceof _WebAssembly.Module) {
    return _WebAssembly.instantiate(wasmInput, imports).then((instance) => {
      return { instance, module: wasmInput }
    })
  }

  // Response
  if (typeof Response !== 'undefined' && wasmInput instanceof Response) {
    return wasmInput.arrayBuffer().then(buffer => {
      return _WebAssembly.instantiate(buffer, imports)
    })
  }

  // string | URL
  const inputIsString = typeof wasmInput === 'string'
  if (inputIsString || (typeof URL !== 'undefined' && wasmInput instanceof URL)) {
    if (inputIsString && typeof wx !== 'undefined' && typeof __wxConfig !== 'undefined') {
      return _WebAssembly.instantiate(wasmInput, imports)
    }
    if (typeof fetch !== 'function') {
      throw new TypeError('wasm source can not be a string or URL in this environment')
    }
    if (typeof _WebAssembly.instantiateStreaming === 'function') {
      try {
        return _WebAssembly.instantiateStreaming(fetch(wasmInput), imports).catch(() => {
          return load(fetch(wasmInput), imports)
        })
      } catch (_) {
        return load(fetch(wasmInput), imports)
      }
    } else {
      return load(fetch(wasmInput), imports)
    }
  }

  throw new TypeError('Invalid wasm source')
}

export function loadSync (wasmInput, imports) {
  if (!wasmInput) throw new TypeError('Invalid wasm source')
  validateImports(imports)
  imports = imports != null ? imports : {}

  let module

  if ((wasmInput instanceof ArrayBuffer) || ArrayBuffer.isView(wasmInput)) {
    module = new _WebAssembly.Module(wasmInput)
  } else if (wasmInput instanceof WebAssembly.Module) {
    module = wasmInput
  } else {
    throw new TypeError('Invalid wasm source')
  }

  const instance = new _WebAssembly.Instance(module, imports)
  const source = { instance, module }

  return source
}
