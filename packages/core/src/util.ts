declare const WXWebAssembly: typeof WebAssembly | undefined
declare const wx: any
declare const __wxConfig: any

const _WebAssembly = typeof WebAssembly !== 'undefined'
  ? WebAssembly
  : typeof WXWebAssembly !== 'undefined'
    ? WXWebAssembly
    : undefined!

export { _WebAssembly }

function validateImports (imports: unknown): imports is object {
  if (imports && typeof imports !== 'object') {
    throw new TypeError('imports must be an object or undefined')
  }
  return true
}

export type InputType = string | URL | Response | BufferSource | WebAssembly.Module
export type MaybePromise<T> = T | Promise<T>

export function load (wasmInput: MaybePromise<InputType>, imports?: WebAssembly.Imports): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
  if (!wasmInput) throw new TypeError('Invalid wasm source')
  validateImports(imports)
  imports = imports ?? {}

  // Promise<string | URL | Response | BufferSource | WebAssembly.Module>
  try {
    const then = typeof wasmInput === 'object' && wasmInput !== null && 'then' in wasmInput ? wasmInput.then : undefined
    if (typeof then === 'function') {
      return then.call(wasmInput, (input) => load(input, imports)) as Promise<WebAssembly.WebAssemblyInstantiatedSource>
    }
  } catch (_) {}

  // BufferSource
  if (wasmInput instanceof ArrayBuffer || ArrayBuffer.isView(wasmInput)) {
    return _WebAssembly.instantiate(wasmInput as BufferSource, imports)
  }

  // WebAssembly.Module
  if (wasmInput instanceof _WebAssembly!.Module) {
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
      return _WebAssembly.instantiate(wasmInput, imports) as unknown as Promise<WebAssembly.WebAssemblyInstantiatedSource>
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

export function loadSync (wasmInput: InputType, imports?: WebAssembly.Imports): WebAssembly.WebAssemblyInstantiatedSource {
  if (!wasmInput) throw new TypeError('Invalid wasm source')
  validateImports(imports)
  imports = imports ?? {}

  let module

  if ((wasmInput instanceof ArrayBuffer) || ArrayBuffer.isView(wasmInput)) {
    module = new _WebAssembly.Module(wasmInput as BufferSource)
  } else if (wasmInput instanceof WebAssembly.Module) {
    module = wasmInput
  } else {
    throw new TypeError('Invalid wasm source')
  }

  const instance = new _WebAssembly.Instance(module, imports)
  const source = { instance, module }

  return source
}
