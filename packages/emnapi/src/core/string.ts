/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/indent */

var emnapiUtf8Decoder = typeof TextDecoder === 'function'
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
        const chunks: string[] = []
        let pendingIndex = 0

        for (;;) {
          const more = inputIndex < bytes.length

          if (!more || (pendingIndex >= pendingSize - 1)) {
            const subarray = pending.subarray(0, pendingIndex)
            const arraylike = subarray as unknown as number[]
            for (let i = 0; i < arraylike.length; ++i) {
              chunks.push(String.fromCharCode(arraylike[i]))
            }

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function emnapiUtf8ToString (ptr: number, length: number): string {
  // eslint-disable-next-line eqeqeq
  if (length == -1) {
    return UTF8ToString(ptr)
  }
  length = length >>> 0
  const HEAPU8 = new Uint8Array(wasmMemory.buffer)
  const shared = (typeof SharedArrayBuffer === 'function') && (wasmMemory.buffer instanceof SharedArrayBuffer)
  return emnapiUtf8Decoder.decode(shared ? HEAPU8.slice(ptr, ptr + length) : HEAPU8.subarray(ptr, ptr + length))
}

var emnapiUtf16leDecoder = typeof TextDecoder === 'function'
  ? new TextDecoder('utf-16le')
  : {
      decode (input: BufferSource) {
        const isArrayBuffer = input instanceof ArrayBuffer
        const isView = ArrayBuffer.isView(input)
        if (!isArrayBuffer && !isView) {
          throw new TypeError('The "input" argument must be an instance of ArrayBuffer or ArrayBufferView')
        }
        const bytes = isArrayBuffer ? new Uint16Array(input) : new Uint16Array(input.buffer, input.byteOffset, input.byteLength / 2)
        const wcharArray = Array(bytes.length)
        for (let i = 0; i < bytes.length; ++i) {
          wcharArray[i] = String.fromCharCode(bytes[i])
        }
        return wcharArray.join('')
      }
    }

function emnapiUtf16ToString (ptr: number, length: number): string {
  // eslint-disable-next-line eqeqeq
  if (length == -1) {
    return UTF16ToString(ptr)
  }
  length = length >>> 0
  const HEAPU8 = new Uint8Array(wasmMemory.buffer)
  const shared = (typeof SharedArrayBuffer === 'function') && (wasmMemory.buffer instanceof SharedArrayBuffer)
  return emnapiUtf16leDecoder.decode(shared ? HEAPU8.slice(ptr, ptr + length * 2) : HEAPU8.subarray(ptr, ptr + length * 2))
}
