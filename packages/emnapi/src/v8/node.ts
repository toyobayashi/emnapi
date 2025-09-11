import { from64 } from 'emscripten:parse-tools'
import { wasmMemory } from 'emscripten:runtime'

/**
 * @__deps $emnapiCtx
 * @__deps $emnapiString
 * @__sig ppppi
 */
export function _node_encode (isolate: Ptr, buf: Ptr, len: size_t, encoding: number): Ptr {
  const autoLength = len === -1
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
