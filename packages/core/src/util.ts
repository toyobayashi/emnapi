declare const WXWebAssembly: typeof WebAssembly | undefined
declare const wx: any
declare const __wxConfig: any

const _WebAssembly = typeof WebAssembly !== 'undefined'
  ? WebAssembly
  : typeof WXWebAssembly !== 'undefined'
    ? WXWebAssembly
    : undefined!

const arrayBufferByteLengthGetter = typeof ArrayBuffer === 'function' && ArrayBuffer.prototype != null
  ? Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength')?.get
  : undefined

const wasmMemoryBufferGetter = typeof _WebAssembly === 'object' && _WebAssembly !== null &&
  typeof _WebAssembly.Memory === 'function' && _WebAssembly.Memory.prototype != null
  ? Object.getOwnPropertyDescriptor(_WebAssembly.Memory.prototype, 'buffer')?.get
  : undefined

const wasmTableLengthGetter = typeof _WebAssembly === 'object' && _WebAssembly !== null &&
  typeof _WebAssembly.Table === 'function' && _WebAssembly.Table.prototype != null
  ? Object.getOwnPropertyDescriptor(_WebAssembly.Table.prototype, 'length')?.get
  : undefined

export function isArrayBuffer (value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  if (arrayBufferByteLengthGetter !== undefined) {
    try {
      arrayBufferByteLengthGetter.call(value)
      return true
    } catch (_) {
      return false
    }
  }
  return typeof ArrayBuffer === 'function' && value instanceof ArrayBuffer
}

export function isWebAssemblyModule (value: unknown): boolean {
  if (typeof value !== 'object' || value === null || typeof _WebAssembly !== 'object' || _WebAssembly === null) {
    return false
  }
  if (typeof _WebAssembly.Module === 'function') {
    if (typeof _WebAssembly.Module.imports === 'function') {
      try {
        _WebAssembly.Module.imports(value as WebAssembly.Module)
        return true
      } catch (_) {
        return false
      }
    }
    return value instanceof _WebAssembly.Module
  }
  return false
}

export function isWebAssemblyMemory (value: unknown): boolean {
  if (typeof value !== 'object' || value === null || typeof _WebAssembly !== 'object' || _WebAssembly === null) {
    return false
  }
  if (wasmMemoryBufferGetter !== undefined) {
    try {
      wasmMemoryBufferGetter.call(value)
      return true
    } catch (_) {
      return false
    }
  }
  return typeof _WebAssembly.Memory === 'function' && value instanceof _WebAssembly.Memory
}

export function isWebAssemblyTable (value: unknown): boolean {
  if (typeof value !== 'object' || value === null || typeof _WebAssembly !== 'object' || _WebAssembly === null) {
    return false
  }
  if (wasmTableLengthGetter !== undefined) {
    try {
      wasmTableLengthGetter.call(value)
      return true
    } catch (_) {
      return false
    }
  }
  return typeof _WebAssembly.Table === 'function' && value instanceof _WebAssembly.Table
}

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
  if (isArrayBuffer(wasmInput) || ArrayBuffer.isView(wasmInput)) {
    return _WebAssembly.instantiate(wasmInput as BufferSource, imports)
  }

  // WebAssembly.Module
  if (isWebAssemblyModule(wasmInput)) {
    return _WebAssembly.instantiate(wasmInput as WebAssembly.Module, imports).then((instance) => {
      return { instance, module: wasmInput as WebAssembly.Module }
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

  if (isArrayBuffer(wasmInput) || ArrayBuffer.isView(wasmInput)) {
    module = new _WebAssembly.Module(wasmInput as BufferSource)
  } else if (isWebAssemblyModule(wasmInput)) {
    module = wasmInput as WebAssembly.Module
  } else {
    throw new TypeError('Invalid wasm source')
  }

  const instance = new _WebAssembly.Instance(module, imports)
  const source = { instance, module }

  return source
}
