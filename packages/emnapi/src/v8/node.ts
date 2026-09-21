import { from64 } from 'emscripten:parse-tools'
import { wasmMemory, _malloc } from 'emscripten:runtime'

function bufferFromWasmMemory (data: number, length: number): any {
  const Buffer = emnapiCtx.features.Buffer
  if (typeof Buffer !== 'function') {
    return new Uint8Array(wasmMemory.buffer, data, length)
  }
  return Buffer.from(wasmMemory.buffer, data, length)
}

/**
 * @__deps $emnapiCtx
 * @__sig pppppp
 */
export function _node_buffer_new (
  isolate: Ptr,
  data: Ptr,
  length: size_t,
  callback: Ptr,
  hint: Ptr
): Ptr {
  from64('data')
  from64('length')
  return emnapiCtx.napiValueFromJsValue(bufferFromWasmMemory(data as number, length >>> 0))
}

/**
 * @__deps $emnapiCtx
 * @__deps malloc
 * @__sig ppp
 */
export function _node_buffer_new_alloc (isolate: Ptr, length: size_t): Ptr {
  from64('length')
  let data = _malloc(length) as number
  from64('data')
  new Uint8Array(wasmMemory.buffer).fill(0, data, data + (length >>> 0))
  return emnapiCtx.napiValueFromJsValue(bufferFromWasmMemory(data, length >>> 0))
}

/**
 * @__deps $emnapiCtx
 * @__deps malloc
 * @__sig pppp
 */
export function _node_buffer_copy (isolate: Ptr, data: Ptr, length: size_t): Ptr {
  from64('data')
  from64('length')
  let out = _malloc(length) as number
  from64('out')
  const heap = new Uint8Array(wasmMemory.buffer)
  heap.set(
    heap.subarray(data as number, (data as number) + (length >>> 0)),
    out
  )
  return emnapiCtx.napiValueFromJsValue(bufferFromWasmMemory(out, length >>> 0))
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _node_buffer_data (value: Ptr): Ptr {
  const view = emnapiCtx.jsValueFromNapiValue<any>(value)
  return view == null ? 0 : view.byteOffset
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _node_buffer_length (value: Ptr): size_t {
  const view = emnapiCtx.jsValueFromNapiValue<any>(value)
  return view == null ? 0 : view.byteLength
}

/**
 * @__deps $emnapiCtx
 * @__deps $emnapiString
 * @__sig ppppi
 */
export function _node_encode (isolate: Ptr, buf: Ptr, len: size_t, encoding: number): Ptr {
  const autoLength = len === -1 || len === 4294967295
  from64('buf')
  from64('len')

  if (encoding === 1) {
    return emnapiCtx.napiValueFromJsValue(emnapiString.UTF8ToString(buf as number, len))
  }

  if (encoding === -1) {
    return emnapiCtx.napiValueFromJsValue(emnapiString.UTF16ToString(buf as number, len))
  }

  if (encoding === 2) {
    const Buffer = emnapiCtx.features.Buffer
    if (typeof Buffer !== 'function') {
      emnapiCtx.isolate.throwException(new Error('Buffer is not supported'))
      return 1
    }
    const buffer = Buffer.from(wasmMemory.buffer, buf as number, len >>> 0)
    return emnapiCtx.napiValueFromJsValue(buffer.toString('base64'))
  }

  if (encoding === 3) {
    return emnapiCtx.napiValueFromJsValue(emnapiString.UTF16ToString(buf as number, len / 2))
  }

  if (encoding === 4 || encoding === 0) {
    return emnapiCtx.napiValueFromJsValue(emnapiString.encode(buf as number, autoLength, len >>> 0, (c) => String.fromCharCode(c)))
  }

  if (encoding === 5) {
    return emnapiCtx.napiValueFromJsValue(emnapiString.encode(buf as number, autoLength, len >>> 0, (c) => c.toString(16).padStart(2, '0')))
  }

  if (encoding === 6) {
    const Buffer = emnapiCtx.features.Buffer
    if (typeof Buffer !== 'function') {
      emnapiCtx.isolate.throwException(new Error('Buffer is not supported'))
      return 1
    }
    const buffer = Buffer.from(wasmMemory.buffer, buf as number, len >>> 0)
    return emnapiCtx.napiValueFromJsValue(buffer)
  }

  emnapiCtx.isolate.throwException(new Error(`Unsupported encoding: ${encoding}`))
  return 1
}
