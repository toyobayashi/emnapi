import type { SerializedError } from './command'

declare const WXWebAssembly: typeof WebAssembly | undefined
const _WebAssembly = typeof WebAssembly !== 'undefined'
  ? WebAssembly
  : typeof WXWebAssembly !== 'undefined'
    ? WXWebAssembly
    : undefined!

export const ENVIRONMENT_IS_NODE = typeof process === 'object' && process !== null &&
  typeof process.versions === 'object' && process.versions !== null &&
  typeof process.versions.node === 'string'

export function getPostMessage (options?: { postMessage?: (message: any) => void }): ((message: any) => void) | undefined {
  return typeof options?.postMessage === 'function'
    ? options.postMessage
    : typeof postMessage === 'function'
      ? postMessage
      : undefined
}

/** @public */
export function normalizeError (value: unknown): Error {
  if (value instanceof Error) return value

  if (typeof value === 'object' && value !== null && 'error' in value) {
    const nested = (value as { error?: unknown }).error
    if (nested !== undefined && nested !== value) return normalizeError(nested)
  }

  const record = typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : undefined
  const message = record?.message !== undefined
    ? String(record.message)
    : typeof value === 'string'
      ? value
      : 'Worker sent an unknown error'
  const name = record?.name !== undefined ? String(record.name) : 'Error'
  let error: Error
  try {
    const ErrorConstructor = name === 'RuntimeError'
      ? (_WebAssembly?.RuntimeError ?? Error)
      : Error
    error = new ErrorConstructor(message)
  } catch (_) {
    error = new Error(message)
  }
  error.name = name
  if (record?.stack !== undefined) {
    Object.defineProperty(error, 'stack', {
      value: String(record.stack),
      writable: true,
      enumerable: false,
      configurable: true
    })
  }
  if (record?.cause !== undefined) {
    Object.defineProperty(error, 'cause', {
      value: record.cause,
      writable: true,
      enumerable: false,
      configurable: true
    })
  }
  return error
}

/** @public */
export function serializeError (value: unknown): SerializedError {
  const error = normalizeError(value)
  const serialized: SerializedError = {
    name: error.name,
    message: error.message
  }
  if (error.stack !== undefined) serialized.stack = error.stack
  if ('cause' in error && error.cause !== undefined) serialized.cause = error.cause
  return serialized
}

/** @public */
export function deserializeError (value: SerializedError): Error {
  return normalizeError(value)
}

export function serializeErrorToBuffer (sab: SharedArrayBuffer, code: number, error?: Error): void {
  const i32array = new Int32Array(sab)
  Atomics.store(i32array, 0, code)
  if (code > 1 && error) {
    const name = error.name
    const message = error.message
    const stack = error.stack ?? ''
    const nameBuffer = new TextEncoder().encode(name)
    const messageBuffer = new TextEncoder().encode(message)
    const stackBuffer = new TextEncoder().encode(stack)
    Atomics.store(i32array, 1, nameBuffer.length)
    Atomics.store(i32array, 2, messageBuffer.length)
    Atomics.store(i32array, 3, stackBuffer.length)
    const buffer = new Uint8Array(sab)
    buffer.set(nameBuffer, 16)
    buffer.set(messageBuffer, 16 + nameBuffer.length)
    buffer.set(stackBuffer, 16 + nameBuffer.length + messageBuffer.length)
  }
}

export function deserializeErrorFromBuffer (sab: SharedArrayBuffer): Error | null {
  const i32array = new Int32Array(sab)
  const status = Atomics.load(i32array, 0)
  if (status <= 1) {
    return null
  }
  const nameLength = Atomics.load(i32array, 1)
  const messageLength = Atomics.load(i32array, 2)
  const stackLength = Atomics.load(i32array, 3)
  const buffer = new Uint8Array(sab)
  const nameBuffer = buffer.slice(16, 16 + nameLength)
  const messageBuffer = buffer.slice(16 + nameLength, 16 + nameLength + messageLength)
  const stackBuffer = buffer.slice(16 + nameLength + messageLength, 16 + nameLength + messageLength + stackLength)
  const name = new TextDecoder().decode(nameBuffer)
  const message = new TextDecoder().decode(messageBuffer)
  const stack = new TextDecoder().decode(stackBuffer)

  const ErrorConstructor = (globalThis as any)[name] ?? (name === 'RuntimeError' ? (_WebAssembly.RuntimeError ?? Error) : Error)
  const error = new ErrorConstructor(message)
  Object.defineProperty(error, 'stack', {
    value: stack,
    writable: true,
    enumerable: false,
    configurable: true
  })
  return error
}

/** @deprecated Use {@link serializeErrorToBuffer}. */
export const serizeErrorToBuffer = serializeErrorToBuffer

/** @deprecated Use {@link deserializeErrorFromBuffer}. */
export const deserizeErrorFromBuffer = deserializeErrorFromBuffer

/** @public */
export function isSharedArrayBuffer (value: any): value is SharedArrayBuffer {
  return (
    (typeof SharedArrayBuffer === 'function' && value instanceof SharedArrayBuffer) ||
    (Object.prototype.toString.call(value) === '[object SharedArrayBuffer]')
  )
}

/** @public */
export function isTrapError (e: Error): e is WebAssembly.RuntimeError {
  try {
    return e instanceof _WebAssembly.RuntimeError || e?.name === 'RuntimeError'
  } catch (_) {
    return e?.name === 'RuntimeError'
  }
}
