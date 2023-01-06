/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-implied-eval */

declare const __webpack_public_path__: any
declare const global: typeof globalThis

export const supportNewFunction = (function () {
  let f: Function
  try {
    f = new Function()
  } catch (_) {
    return false
  }
  return typeof f === 'function'
})()

export const _global: typeof globalThis = (function () {
  if (typeof globalThis !== 'undefined') return globalThis

  let g = (function (this: any) { return this })()
  if (!g && supportNewFunction) {
    g = new Function('return this')()
  }

  if (!g) {
    if (typeof __webpack_public_path__ === 'undefined') {
      if (typeof global !== 'undefined') return global
    }
    if (typeof window !== 'undefined') return window
    if (typeof self !== 'undefined') return self
  }

  return g
})()

const emptyException = new Error()

/** @internal */
export class TryCatch {
  private _exception: any = emptyException
  public hasCaught (): boolean {
    return this._exception !== emptyException
  }

  public exception (): any {
    return this._exception
  }

  public setError (err: any): void {
    this._exception = err
  }

  public reset (): void {
    this._exception = emptyException
  }

  public extractException (): any {
    const e = this._exception
    this.reset()
    return e
  }
}

export let canSetFunctionName = false
try {
  canSetFunctionName = !!Object.getOwnPropertyDescriptor(Function.prototype, 'name')?.configurable
} catch (_) {}

export const supportReflect = typeof Reflect === 'object'
export const supportFinalizer = (typeof FinalizationRegistry !== 'undefined') && (typeof WeakRef !== 'undefined')
export const supportBigInt = typeof BigInt !== 'undefined'

export function isReferenceType (v: any): v is object {
  return (typeof v === 'object' && v !== null) || typeof v === 'function'
}

export const _setImmediate = typeof setImmediate === 'function'
  ? setImmediate
  : function (f: () => void): void {
    if (typeof f !== 'function') return
    let channel = new MessageChannel()
    channel.port1.onmessage = function () {
      channel.port1.onmessage = null
      channel = undefined!
      f()
    }
    channel.port2.postMessage(null)
  }

export const construct = supportReflect
  ? Reflect.construct
  : function<R> (target: new (...args: any[]) => R, args: ArrayLike<any>, newTarget?: Function): R {
    const argsList = Array(args.length + 1) as [undefined, ...any[]]
    argsList[0] = undefined
    for (let i = 0; i < args.length; i++) {
      argsList[i + 1] = args[i]
    }
    const BoundCtor = target.bind.apply(target as any, argsList) as new () => any
    const instance = new BoundCtor()
    if (typeof newTarget === 'function') {
      Object.setPrototypeOf(instance, newTarget.prototype)
    }
    return instance
  }

export const utf8Decoder: { decode: (input: BufferSource) => string } = typeof TextDecoder === 'function'
  ? new TextDecoder()
  : {
      decode (input: BufferSource) {
        const isArrayBuffer = input instanceof ArrayBuffer
        const isView = ArrayBuffer.isView(input)
        if (!isArrayBuffer && !isView) {
          throw new TypeError('The "input" argument must be an instance of ArrayBuffer or ArrayBufferView')
        }
        let bytes = isArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength)

        let inputIndex = 0
        const pendingSize = Math.min(256 * 256, bytes.length + 1)
        const pending = new Uint16Array(pendingSize)
        const chunks = []
        let pendingIndex = 0

        for (;;) {
          const more = inputIndex < bytes.length

          if (!more || (pendingIndex >= pendingSize - 1)) {
            const subarray = pending.subarray(0, pendingIndex)
            const arraylike = subarray as unknown as number[]
            chunks.push(String.fromCharCode.apply(null, arraylike))

            if (!more) {
              return chunks.join('')
            }

            bytes = bytes.subarray(inputIndex)
            inputIndex = 0
            pendingIndex = 0
          }

          const byte1 = bytes[inputIndex++]
          if ((byte1 & 0x80) === 0) {
            pending[pendingIndex++] = byte1
          } else if ((byte1 & 0xe0) === 0xc0) {
            const byte2 = bytes[inputIndex++] & 0x3f
            pending[pendingIndex++] = ((byte1 & 0x1f) << 6) | byte2
          } else if ((byte1 & 0xf0) === 0xe0) {
            const byte2 = bytes[inputIndex++] & 0x3f
            const byte3 = bytes[inputIndex++] & 0x3f
            pending[pendingIndex++] = ((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3
          } else if ((byte1 & 0xf8) === 0xf0) {
            const byte2 = bytes[inputIndex++] & 0x3f
            const byte3 = bytes[inputIndex++] & 0x3f
            const byte4 = bytes[inputIndex++] & 0x3f

            let codepoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4
            if (codepoint > 0xffff) {
              codepoint -= 0x10000
              pending[pendingIndex++] = (codepoint >>> 10) & 0x3ff | 0xd800
              codepoint = 0xdc00 | codepoint & 0x3ff
            }
            pending[pendingIndex++] = codepoint
          } else {
            // invalid
          }
        }
      }
    }

export const utf16leDecoder: { decode: (input: BufferSource) => string } = typeof TextDecoder === 'function'
  ? new TextDecoder('utf-16le')
  : {
      decode (input: BufferSource) {
        const isArrayBuffer = input instanceof ArrayBuffer
        const isView = ArrayBuffer.isView(input)
        if (!isArrayBuffer && !isView) {
          throw new TypeError('The "input" argument must be an instance of ArrayBuffer or ArrayBufferView')
        }
        const bytes = isArrayBuffer ? new Uint16Array(input) : new Uint16Array(input.buffer, input.byteOffset, input.byteLength / 2)
        return String.fromCharCode.apply(String, bytes as any)
      }
    }
