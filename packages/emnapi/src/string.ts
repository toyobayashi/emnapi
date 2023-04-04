/* eslint-disable @typescript-eslint/indent */

var emnapiString = {
  utf8Decoder: undefined! as { decode (input: BufferSource): string },
  utf16Decoder: undefined! as { decode (input: BufferSource): string },
  init () {
// #if !TEXTDECODER || TEXTDECODER == 1
    const fallbackDecoder = {
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
// #endif
    let utf8Decoder: any
// #if !TEXTDECODER
    utf8Decoder = fallbackDecoder
// #elif TEXTDECODER == 1
    utf8Decoder = typeof TextDecoder === 'function' ? new TextDecoder() : fallbackDecoder
// #elif TEXTDECODER == 2
    utf8Decoder = new TextDecoder()
// #endif
    emnapiString.utf8Decoder = utf8Decoder

// #if !TEXTDECODER || TEXTDECODER == 1
    const fallbackDecoder2 = {
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
// #endif
    let utf16Decoder: any
// #if !TEXTDECODER
    utf16Decoder = fallbackDecoder2
// #elif TEXTDECODER == 1
    utf16Decoder = typeof TextDecoder === 'function' ? new TextDecoder('utf-16le') : fallbackDecoder2
// #elif TEXTDECODER == 2
    utf16Decoder = new TextDecoder('utf-16le')
// #endif
    emnapiString.utf16Decoder = utf16Decoder
  },
  lengthBytesUTF8 (str: string): number {
    let c: number
    let len = 0
    for (let i = 0; i < str.length; ++i) {
      c = str.charCodeAt(i)
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
  },
  UTF8ToString (ptr: void_p, length: int): string {
    ptr >>>= 0
    if (!ptr || !length) return ''
    const HEAPU8 = new Uint8Array(wasmMemory.buffer)
    let end = ptr
    if (length === -1) {
      for (; HEAPU8[end];) ++end
    } else {
      end = ptr + (length >>> 0)
    }
    return emnapiString.utf8Decoder.decode($getUnsharedTextDecoderView('HEAPU8', 'ptr', 'end'))
  },
  stringToUTF8 (str: string, outPtr: number, maxBytesToWrite: number): number {
    const HEAPU8 = new Uint8Array(wasmMemory.buffer)
    let outIdx = outPtr
    outIdx >>>= 0
    if (!(maxBytesToWrite > 0)) { return 0 }

    var startIdx = outIdx
    var endIdx = outIdx + maxBytesToWrite - 1
    for (var i = 0; i < str.length; ++i) {
      var u = str.charCodeAt(i)
      if (u >= 0xD800 && u <= 0xDFFF) {
        var u1 = str.charCodeAt(++i)
        u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF)
      }
      if (u <= 0x7F) {
        if (outIdx >= endIdx) break
        HEAPU8[outIdx++] = u
      } else if (u <= 0x7FF) {
        if (outIdx + 1 >= endIdx) break
        HEAPU8[outIdx++] = 0xC0 | (u >> 6)
        HEAPU8[outIdx++] = 0x80 | (u & 63)
      } else if (u <= 0xFFFF) {
        if (outIdx + 2 >= endIdx) break
        HEAPU8[outIdx++] = 0xE0 | (u >> 12)
        HEAPU8[outIdx++] = 0x80 | ((u >> 6) & 63)
        HEAPU8[outIdx++] = 0x80 | (u & 63)
      } else {
        if (outIdx + 3 >= endIdx) break
        HEAPU8[outIdx++] = 0xF0 | (u >> 18)
        HEAPU8[outIdx++] = 0x80 | ((u >> 12) & 63)
        HEAPU8[outIdx++] = 0x80 | ((u >> 6) & 63)
        HEAPU8[outIdx++] = 0x80 | (u & 63)
      }
    }
    HEAPU8[outIdx] = 0
    return outIdx - startIdx
  },
  UTF16ToString (ptr: number, length: number): string {
    ptr >>>= 0
    if (!ptr || !length) return ''
    let end = ptr
    if (length === -1) {
      let idx = end >> 1
      const HEAPU16 = new Uint16Array(wasmMemory.buffer)
      while (HEAPU16[idx]) ++idx
      end = idx << 1
    } else {
      end = ptr + (length >>> 0) * 2
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const HEAPU8 = new Uint8Array(wasmMemory.buffer)
    return emnapiString.utf16Decoder.decode($getUnsharedTextDecoderView('HEAPU8', 'ptr', 'end'))
  },
  stringToUTF16 (str: string, outPtr: number, maxBytesToWrite: number): number {
    if (maxBytesToWrite === undefined) {
      maxBytesToWrite = 0x7FFFFFFF
    }
    if (maxBytesToWrite < 2) return 0
    maxBytesToWrite -= 2
    var startPtr = outPtr
    var numCharsToWrite = (maxBytesToWrite < str.length * 2) ? (maxBytesToWrite / 2) : str.length
    for (var i = 0; i < numCharsToWrite; ++i) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      var codeUnit = str.charCodeAt(i)
      $makeSetValue('outPtr', 0, 'codeUnit', 'i16')
      outPtr += 2
    }
    $makeSetValue('outPtr', 0, '0', 'i16')
    return outPtr - startPtr
  }
}

emnapiDefineVar('$emnapiString', emnapiString, [], 'emnapiString.init();')