/* eslint-disable @typescript-eslint/indent */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function lengthBytesUTF8 (str: string): number {
  var len = 0
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
    // unit, not a Unicode code point of the character! So decode
    // UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var c = str.charCodeAt(i) // possibly a lead surrogate
    if (c <= 0x7F) {
      len++
    } else if (c <= 0x7FF) {
      len += 2
    } else if (c >= 0xD800 && c <= 0xDFFF) {
      len += 4; ++i
    } else {
      len += 3
    }
  }
  return len
}

function UTF8ToString (ptr: number): string {
  ptr >>>= 0
  if (!ptr) return ''
  const HEAPU8 = new Uint8Array(wasmMemory.buffer)
  for (var end = ptr; HEAPU8[end];) ++end
  const shared = (typeof SharedArrayBuffer === 'function') && (wasmMemory.buffer instanceof SharedArrayBuffer)
  return emnapiUtf8Decoder.decode(shared ? HEAPU8.slice(ptr, end) : HEAPU8.subarray(ptr, end))
}

function stringToUTF8Array (str: string, heap: Uint8Array, outIdx: number, maxBytesToWrite: number): number {
  outIdx >>>= 0
  // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
  // undefined and false each don't write out any bytes.
  if (!(maxBytesToWrite > 0)) { return 0 }

  var startIdx = outIdx
  var endIdx = outIdx + maxBytesToWrite - 1 // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
    // unit, not a Unicode code point of the character! So decode
    // UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
    // and https://www.ietf.org/rfc/rfc2279.txt
    // and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i) // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) {
      var u1 = str.charCodeAt(++i)
      u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF)
    }
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break
      heap[outIdx++] = u
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break
      heap[outIdx++] = 0xC0 | (u >> 6)
      heap[outIdx++] = 0x80 | (u & 63)
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break
      heap[outIdx++] = 0xE0 | (u >> 12)
      heap[outIdx++] = 0x80 | ((u >> 6) & 63)
      heap[outIdx++] = 0x80 | (u & 63)
    } else {
      if (outIdx + 3 >= endIdx) break
      heap[outIdx++] = 0xF0 | (u >> 18)
      heap[outIdx++] = 0x80 | ((u >> 12) & 63)
      heap[outIdx++] = 0x80 | ((u >> 6) & 63)
      heap[outIdx++] = 0x80 | (u & 63)
    }
  }
  // Null-terminate the pointer to the buffer.
  heap[outIdx] = 0
  return outIdx - startIdx
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function stringToUTF8 (str: string, outPtr: number, maxBytesToWrite: number): number {
  const HEAPU8 = new Uint8Array(wasmMemory.buffer)
  return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
}

function UTF16ToString (ptr: number): string {
  var endPtr = ptr
  // TextDecoder needs to know the byte length in advance, it doesn't stop on
  // null terminator by itself.
  // Also, use the length info to avoid running tiny strings through
  // TextDecoder, since .subarray() allocates garbage.
  var idx = endPtr >> 1
  const HEAPU16 = new Uint16Array(wasmMemory.buffer)
  // If maxBytesToRead is not passed explicitly, it will be undefined, and this
  // will always evaluate to true. This saves on code size.
  while (HEAPU16[idx]) ++idx
  endPtr = idx << 1

  const HEAPU8 = new Uint8Array(wasmMemory.buffer)
  const shared = (typeof SharedArrayBuffer === 'function') && (wasmMemory.buffer instanceof SharedArrayBuffer)
  return emnapiUtf16leDecoder.decode(shared ? HEAPU8.slice(ptr, endPtr) : HEAPU8.subarray(ptr, endPtr))
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function stringToUTF16 (str: string, outPtr: number, maxBytesToWrite: number): number {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF
  }
  if (maxBytesToWrite < 2) return 0
  maxBytesToWrite -= 2 // Null terminator.
  var startPtr = outPtr
  var numCharsToWrite = (maxBytesToWrite < str.length * 2) ? (maxBytesToWrite / 2) : str.length
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    var codeUnit = str.charCodeAt(i) // possibly a lead surrogate
    $makeSetValue('outPtr', 0, 'codeUnit', 'i16')
    outPtr += 2
  }
  // Null-terminate the pointer to the HEAP.
  $makeSetValue('outPtr', 0, '0', 'i16')
  return outPtr - startPtr
}

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
  if (!length) return ''
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function emnapiUtf16ToString (ptr: number, length: number): string {
  // eslint-disable-next-line eqeqeq
  if (length == -1) {
    return UTF16ToString(ptr)
  }
  length = length >>> 0
  if (!length) return ''
  const HEAPU8 = new Uint8Array(wasmMemory.buffer)
  const shared = (typeof SharedArrayBuffer === 'function') && (wasmMemory.buffer instanceof SharedArrayBuffer)
  return emnapiUtf16leDecoder.decode(shared ? HEAPU8.slice(ptr, ptr + length * 2) : HEAPU8.subarray(ptr, ptr + length * 2))
}
