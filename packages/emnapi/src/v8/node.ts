import { from64, makeDynCall } from 'emscripten:parse-tools'
import { wasmMemory, _malloc } from 'emscripten:runtime'

function decodeNodeValue (value: any, encoding: number): Uint8Array {
  const Buffer = emnapiCtx.features.Buffer as any
  if (typeof Buffer === 'function') {
    if (encoding === 6 && ArrayBuffer.isView(value)) {
      return Uint8Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))
    }
    if (encoding === 6) return Uint8Array.from(Buffer.from(String(value)))
    const names = ['ascii', 'utf8', 'base64', 'utf16le', 'latin1', 'hex'] as const
    return Uint8Array.from(Buffer.from(String(value), names[encoding]))
  }
  if (encoding === 1) return new TextEncoder().encode(String(value))
  if (encoding === 0 || encoding === 4) {
    return Uint8Array.from(String(value), char => char.charCodeAt(0) & 0xff)
  }
  if (encoding === 2) {
    return Uint8Array.from(atob(String(value)), char => char.charCodeAt(0))
  }
  if (encoding === 3) {
    const input = String(value)
    const output = new Uint8Array(input.length * 2)
    const view = new DataView(output.buffer)
    for (let i = 0; i < input.length; i++) view.setUint16(i * 2, input.charCodeAt(i), true)
    return output
  }
  if (encoding === 5) {
    const input = String(value)
    if (input.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(input)) return new Uint8Array(0)
    return Uint8Array.from({ length: input.length / 2 }, (_, i) => parseInt(input.slice(i * 2, i * 2 + 2), 16))
  }
  if (encoding === 6 && ArrayBuffer.isView(value)) {
    return Uint8Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))
  }
  throw new TypeError(`Unsupported decode input for encoding ${encoding}`)
}

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
  from64('callback')
  from64('hint')
  const buffer = bufferFromWasmMemory(data as number, length >>> 0)
  if (callback) {
    if (!emnapiCtx.features.finalizer) {
      emnapiCtx.isolate.throwException(new Error('Buffer ownership callbacks require runtime finalizer support'))
      return 0
    }
    const handle = emnapiCtx.napiValueFromJsValue(buffer)
    const call = makeDynCall('vpp', 'callback')
    const persistent = emnapiCtx.isolate.createReference(buffer)
    persistent.setWeak({ call, data, hint }, (record) => {
      record.call(record.data, record.hint)
    })
    return handle
  }
  return emnapiCtx.napiValueFromJsValue(buffer)
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
    const heap = new Uint8Array(wasmMemory.buffer)
    let value = ''
    for (let i = 0; i < (len >>> 0); i++) value += String.fromCharCode(heap[(buf as number) + i])
    return emnapiCtx.napiValueFromJsValue(value)
  }

  if (encoding === 5) {
    const heap = new Uint8Array(wasmMemory.buffer)
    let value = ''
    for (let i = 0; i < (len >>> 0); i++) value += heap[(buf as number) + i].toString(16).padStart(2, '0')
    return emnapiCtx.napiValueFromJsValue(value)
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

/**
 * @__deps $emnapiCtx
 * @__sig pppi
 */
export function _node_decode_bytes (isolate: Ptr, value: Ptr, encoding: number): number {
  from64('value')
  try {
    return decodeNodeValue(emnapiCtx.jsValueFromNapiValue(value), encoding).byteLength
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return -1
  }
}

/**
 * @__deps $emnapiCtx
 * @__sig pppppi
 */
export function _node_decode_write (
  isolate: Ptr,
  output: Ptr,
  length: size_t,
  value: Ptr,
  encoding: number
): number {
  from64('output')
  from64('length')
  from64('value')
  try {
    const decoded = decodeNodeValue(emnapiCtx.jsValueFromNapiValue(value), encoding)
    const written = Math.min(Number(length), decoded.byteLength)
    new Uint8Array(wasmMemory.buffer).set(decoded.subarray(0, written), output as number)
    return written
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return -1
  }
}

/**
 * @__deps $emnapiCtx
 * @__deps $emnapiString
 * @__sig ppippp
 */
export function _node_errno_exception (
  isolate: Ptr,
  errorno: number,
  syscall: Ptr,
  message: Ptr,
  path: Ptr
): Ptr {
  from64('syscall')
  from64('message')
  from64('path')
  const normalizedErrorno = errorno | 0
  const syscallValue = syscall ? emnapiString.UTF8ToString(syscall as number, -1) : undefined
  const customMessage = message ? emnapiString.UTF8ToString(message as number, -1) : undefined
  const pathValue = path ? emnapiString.UTF8ToString(path as number, -1) : undefined
  const code = normalizedErrorno === -2 ? 'ENOENT' : `UNKNOWN_${normalizedErrorno}`
  const description = normalizedErrorno === -2 ? 'no such file or directory' : 'unknown error'
  const detail = customMessage ?? description
  const suffix = syscallValue
    ? `, ${syscallValue}${pathValue ? ` '${pathValue}'` : ''}`
    : ''
  const error = new Error(`${code}: ${detail}${suffix}`)
  const typedError = error as Error & {
    errno: number
    code: string
    syscall?: string
    path?: string
  }
  typedError.errno = normalizedErrorno
  typedError.code = code
  if (syscallValue !== undefined) typedError.syscall = syscallValue
  if (pathValue !== undefined) typedError.path = pathValue
  return emnapiCtx.napiValueFromJsValue(error)
}
