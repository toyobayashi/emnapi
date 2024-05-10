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

export function serizeErrorToBuffer (sab: SharedArrayBuffer, code: number, error?: Error): void {
  const i32array = new Int32Array(sab)
  Atomics.store(i32array, 0, code)
  if (code > 1 && error) {
    const name = error.name
    const message = error.message
    const stack = error.stack
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

export function deserizeErrorFromBuffer (sab: SharedArrayBuffer): Error | null {
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

  const ErrorConstructor = (globalThis as any)[name] ?? Error
  const error = new ErrorConstructor(message)
  Object.defineProperty(error, 'stack', {
    value: stack,
    writable: true,
    enumerable: false,
    configurable: true
  })
  return error
}
