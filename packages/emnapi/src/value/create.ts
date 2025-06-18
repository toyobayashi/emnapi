import { emnapiCtx } from 'emnapi:shared'
import { wasmMemory, _malloc } from 'emscripten:runtime'
import { from64, makeSetValue, to64 } from 'emscripten:parse-tools'
import { emnapiString } from '../string'
import { type MemoryViewDescriptor, emnapiExternalMemory } from '../memory'
import { emnapi_create_memory_view } from '../emnapi'
import { napi_add_finalizer } from '../wrap'
import { $CHECK_ARG, $CHECK_ENV_NOT_IN_GC, $GET_RETURN_STATUS, $PREAMBLE } from '../macro'

/**
 * @__sig ipp
 */
export function napi_create_array (env: napi_env, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  from64('result')

  const value = emnapiCtx.napiValueFromJsValue([])
  makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

/**
 * @__sig ippp
 */
export function napi_create_array_with_length (env: napi_env, length: size_t, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  from64('length')
  from64('result')
  length = length >>> 0

  const value = emnapiCtx.napiValueFromJsValue(new Array(length))
  makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

function emnapiCreateArrayBuffer (byte_length: size_t, data: void_pp): ArrayBuffer {
  from64('byte_length')
  byte_length = byte_length >>> 0
  const arrayBuffer = new ArrayBuffer(byte_length)

  if (data) {
    from64('data')

    const p = emnapiExternalMemory.getArrayBufferPointer(arrayBuffer, true).address
    makeSetValue('data', 0, 'p', '*')
  }

  return arrayBuffer
}

/**
 * @__sig ipppp
 */
export function napi_create_arraybuffer (env: napi_env, byte_length: size_t, data: void_pp, result: Pointer<napi_value>): napi_status {
  let value: napi_value

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    from64('result')
    const arrayBuffer = emnapiCreateArrayBuffer(byte_length, data)
    value = emnapiCtx.napiValueFromJsValue(arrayBuffer)
    makeSetValue('result', 0, 'value', '*')
    return $GET_RETURN_STATUS!(envObject)
  })
}

/**
 * @__sig ipdp
 */
export function napi_create_date (env: napi_env, time: double, result: Pointer<napi_value>): napi_status {
  let value: napi_value

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    from64('result')

    value = emnapiCtx.napiValueFromJsValue(new Date(time))
    makeSetValue('result', 0, 'value', '*')
    return $GET_RETURN_STATUS!(envObject)
  })
}

/**
 * @__sig ippppp
 */
export function napi_create_external (env: napi_env, data: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_value>): napi_status {
  let value: number | bigint

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    if (!emnapiCtx.features.finalizer && finalize_cb) {
      throw emnapiCtx.createNotSupportWeakRefError('napi_create_external', 'Parameter "finalize_cb" must be 0(NULL)')
    }
    value = emnapiCtx.getCurrentScope()!.addExternal(data)
    if (finalize_cb) {
      emnapiCtx.createReferenceWithFinalizer(envObject, value, 0, ReferenceOwnership.kRuntime as any, finalize_cb, data, finalize_hint)
    }
    from64('result')
    makeSetValue('result', 0, 'value', '*')
    return envObject.clearLastError()
  })
}

/**
 * @__sig ipppppp
 */
export function napi_create_external_arraybuffer (
  env: napi_env,
  external_data: void_p,
  byte_length: size_t,
  finalize_cb: napi_finalize,
  finalize_hint: void_p,
  result: Pointer<napi_value>
): napi_status {
  let value: napi_value

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    from64('byte_length')
    from64('external_data')
    from64('result')

    byte_length = byte_length >>> 0

    if (!external_data) {
      byte_length = 0
    }

    if ((external_data as number + byte_length) > wasmMemory.buffer.byteLength) {
      throw new RangeError('Memory out of range')
    }
    if (!emnapiCtx.features.finalizer && finalize_cb) {
      throw emnapiCtx.createNotSupportWeakRefError('napi_create_external_arraybuffer', 'Parameter "finalize_cb" must be 0(NULL)')
    }
    const arrayBuffer = new ArrayBuffer(byte_length)
    if (byte_length === 0) {
      try {
        const MessageChannel = emnapiCtx.features.MessageChannel
        const messageChannel = new MessageChannel!()
        messageChannel.port1.postMessage(arrayBuffer, [arrayBuffer])
      } catch (_) {}
    } else {
      const u8arr = new Uint8Array(arrayBuffer)
      u8arr.set(new Uint8Array(wasmMemory.buffer).subarray(external_data as number, external_data as number + byte_length))
      emnapiExternalMemory.table.set(arrayBuffer, {
        address: external_data as number,
        ownership: ReferenceOwnership.kUserland,
        runtimeAllocated: 0
      })
    }
    value = emnapiCtx.napiValueFromJsValue(arrayBuffer)
    if (finalize_cb) {
      const status = napi_add_finalizer(env, value, external_data, finalize_cb, finalize_hint, /* NULL */ 0)
      if (status === napi_status.napi_pending_exception) {
        const err = envObject.lastException.deref()
        envObject.clearLastError()
        envObject.lastException.reset()
        throw err
      } else if (status !== napi_status.napi_ok) {
        return envObject.setLastError(status)
      }
    }
    makeSetValue('result', 0, 'value', '*')
    return $GET_RETURN_STATUS!(envObject)
  })
}

/**
 * @__sig ipp
 */
export function napi_create_object (env: napi_env, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  from64('result')

  const value = emnapiCtx.napiValueFromJsValue({})
  makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

/**
 * @__sig ippp
 */
export function napi_create_symbol (env: napi_env, description: napi_value, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  from64('result')

  if (!description) {
    // eslint-disable-next-line symbol-description
    const value = emnapiCtx.napiValueFromJsValue(Symbol())
    makeSetValue('result', 0, 'value', '*')
  } else {
    const desc = emnapiCtx.jsValueFromNapiValue(description)!
    if (typeof desc !== 'string') {
      return envObject.setLastError(napi_status.napi_string_expected)
    }

    const v = emnapiCtx.napiValueFromJsValue(Symbol(desc))
    makeSetValue('result', 0, 'v', '*')
  }
  return envObject.clearLastError()
}

/**
 * @__sig ipipppp
 */
export function napi_create_typedarray (
  env: napi_env,
  type: napi_typedarray_type,
  length: size_t,
  arraybuffer: napi_value,
  byte_offset: size_t,
  result: Pointer<napi_value>
): napi_status {
  let value: napi_value

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, arraybuffer)
    $CHECK_ARG!(envObject, result)

    const buffer = emnapiCtx.jsValueFromNapiValue(arraybuffer)!
    if (!(buffer instanceof ArrayBuffer)) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }

    from64('byte_offset')
    from64('length')

    const createTypedArray = function (envObject: Env, Type: { new (...args: any[]): ArrayBufferView; name?: string }, size_of_element: number, buffer: ArrayBuffer, byte_offset: size_t, length: size_t): napi_status {
      byte_offset = byte_offset >>> 0
      length = length >>> 0
      if (size_of_element > 1) {
        if ((byte_offset) % (size_of_element) !== 0) {
          const err: RangeError & { code?: string } = new RangeError(`start offset of ${Type.name ?? ''} should be a multiple of ${size_of_element}`)
          err.code = 'ERR_NAPI_INVALID_TYPEDARRAY_ALIGNMENT'
          envObject.lastException.resetTo(err)
          return envObject.setLastError(napi_status.napi_generic_failure)
        }
      }

      if (((length * size_of_element) + byte_offset) > buffer.byteLength) {
        const err: RangeError & { code?: string } = new RangeError('Invalid typed array length')
        err.code = 'ERR_NAPI_INVALID_TYPEDARRAY_LENGTH'
        envObject.lastException.resetTo(err)
        return envObject.setLastError(napi_status.napi_generic_failure)
      }
      const out = new Type(buffer, byte_offset, length)
      if (buffer === wasmMemory.buffer) {
        if (!emnapiExternalMemory.wasmMemoryViewTable.has(out)) {
          emnapiExternalMemory.wasmMemoryViewTable.set(out, {
            Ctor: Type as any,
            address: byte_offset,
            length,
            ownership: ReferenceOwnership.kUserland,
            runtimeAllocated: 0
          })
        }
      }

      from64('result')

      value = emnapiCtx.napiValueFromJsValue(out)
      makeSetValue('result', 0, 'value', '*')
      return $GET_RETURN_STATUS!(envObject)
    }

    switch (type) {
      case napi_typedarray_type.napi_int8_array:
        return createTypedArray(envObject, Int8Array, 1, buffer, byte_offset, length)
      case napi_typedarray_type.napi_uint8_array:
        return createTypedArray(envObject, Uint8Array, 1, buffer, byte_offset, length)
      case napi_typedarray_type.napi_uint8_clamped_array:
        return createTypedArray(envObject, Uint8ClampedArray, 1, buffer, byte_offset, length)
      case napi_typedarray_type.napi_int16_array:
        return createTypedArray(envObject, Int16Array, 2, buffer, byte_offset, length)
      case napi_typedarray_type.napi_uint16_array:
        return createTypedArray(envObject, Uint16Array, 2, buffer, byte_offset, length)
      case napi_typedarray_type.napi_int32_array:
        return createTypedArray(envObject, Int32Array, 4, buffer, byte_offset, length)
      case napi_typedarray_type.napi_uint32_array:
        return createTypedArray(envObject, Uint32Array, 4, buffer, byte_offset, length)
      case napi_typedarray_type.napi_float32_array:
        return createTypedArray(envObject, Float32Array, 4, buffer, byte_offset, length)
      case napi_typedarray_type.napi_float64_array:
        return createTypedArray(envObject, Float64Array, 8, buffer, byte_offset, length)
      case napi_typedarray_type.napi_bigint64_array:
        return createTypedArray(envObject, BigInt64Array, 8, buffer, byte_offset, length)
      case napi_typedarray_type.napi_biguint64_array:
        return createTypedArray(envObject, BigUint64Array, 8, buffer, byte_offset, length)
      default:
        return envObject.setLastError(napi_status.napi_invalid_arg)
    }
  })
}

/**
 * @__deps malloc
 * @__sig ippp
 */
export function napi_create_buffer (
  env: napi_env,
  size: size_t,
  data: Pointer<Pointer<void>>,
  result: Pointer<napi_value>
): napi_status {
  let value: napi_value, pointer: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)

    const Buffer = emnapiCtx.features.Buffer
    if (!Buffer) {
      throw emnapiCtx.createNotSupportBufferError('napi_create_buffer', '')
    }
    from64('result')

    let buffer: Uint8Array
    from64('size')
    size = size >>> 0
    if (!data || (size === 0)) {
      buffer = Buffer.alloc(size)
      value = emnapiCtx.napiValueFromJsValue(buffer)
      makeSetValue('result', 0, 'value', '*')
    } else {
      pointer = _malloc(to64('size')) as number
      if (!pointer) throw new Error('Out of memory')
      from64('pointer')
      new Uint8Array(wasmMemory.buffer).subarray(pointer, pointer + size).fill(0)
      const buffer = Buffer.from(wasmMemory.buffer, pointer, size)
      const viewDescriptor: MemoryViewDescriptor = {
        Ctor: Buffer,
        address: pointer,
        length: size,
        ownership: emnapiExternalMemory.registry ? ReferenceOwnership.kRuntime : ReferenceOwnership.kUserland,
        runtimeAllocated: 1
      }
      emnapiExternalMemory.wasmMemoryViewTable.set(buffer, viewDescriptor)
      emnapiExternalMemory.registry?.register(viewDescriptor, pointer)

      value = emnapiCtx.napiValueFromJsValue(buffer)
      makeSetValue('result', 0, 'value', '*')
      from64('data')
      makeSetValue('data', 0, 'pointer', '*')
    }

    return $GET_RETURN_STATUS!(envObject)
  })
}

/**
 * @__sig ippppp
 */
export function napi_create_buffer_copy (
  env: napi_env,
  length: size_t,
  data: Pointer<void>,
  result_data: Pointer<Pointer<void>>,
  result: Pointer<napi_value>
): napi_status {
  let value: napi_value

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    const Buffer = emnapiCtx.features.Buffer!
    if (!Buffer) {
      throw emnapiCtx.createNotSupportBufferError('napi_create_buffer_copy', '')
    }
    const arrayBuffer = emnapiCreateArrayBuffer(length, result_data)
    const buffer = Buffer.from(arrayBuffer)
    from64('data')
    from64('length')
    buffer.set(new Uint8Array(wasmMemory.buffer).subarray(data as number, data as number + length))
    value = emnapiCtx.napiValueFromJsValue(buffer)
    from64('result')
    makeSetValue('result', 0, 'value', '*')
    return $GET_RETURN_STATUS!(envObject)
  })
}

/**
 * @__sig ipppppp
 */
export function napi_create_external_buffer (
  env: napi_env,
  length: size_t,
  data: Pointer<void>,
  finalize_cb: napi_finalize,
  finalize_hint: Pointer<void>,
  result: Pointer<napi_value>
): napi_status {
  return emnapi_create_memory_view(
    env,
    emnapi_memory_view_type.emnapi_buffer,
    data,
    length,
    finalize_cb,
    finalize_hint,
    result
  )
}

/**
 * @__sig ippppp
 */
export function node_api_create_buffer_from_arraybuffer (
  env: napi_env,
  arraybuffer: napi_value,
  byte_offset: size_t,
  byte_length: size_t,
  result: Pointer<napi_value>
): napi_status {
  let value: napi_value

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, arraybuffer)
    $CHECK_ARG!(envObject, result)
    from64('byte_offset')
    from64('byte_length')
    byte_offset = byte_offset >>> 0
    byte_length = byte_length >>> 0
    const buffer = emnapiCtx.jsValueFromNapiValue(arraybuffer)!
    if (!(buffer instanceof ArrayBuffer)) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }

    if ((byte_length + byte_offset) > buffer.byteLength) {
      const err: RangeError & { code?: string } = new RangeError('The byte offset + length is out of range')
      err.code = 'ERR_OUT_OF_RANGE'
      throw err
    }

    const Buffer = emnapiCtx.features.Buffer!
    if (!Buffer) {
      throw emnapiCtx.createNotSupportBufferError('node_api_create_buffer_from_arraybuffer', '')
    }
    const out = Buffer.from(buffer, byte_offset, byte_length)
    if (buffer === wasmMemory.buffer) {
      if (!emnapiExternalMemory.wasmMemoryViewTable.has(out)) {
        emnapiExternalMemory.wasmMemoryViewTable.set(out, {
          Ctor: Buffer,
          address: byte_offset,
          length: byte_length,
          ownership: ReferenceOwnership.kUserland,
          runtimeAllocated: 0
        })
      }
    }
    from64('result')

    value = emnapiCtx.napiValueFromJsValue(out)
    makeSetValue('result', 0, 'value', '*')
    return $GET_RETURN_STATUS!(envObject)
  })
}

/**
 * @__sig ippppp
 */
export function napi_create_dataview (
  env: napi_env,
  byte_length: size_t,
  arraybuffer: napi_value,
  byte_offset: size_t,
  result: Pointer<napi_value>
): napi_status {
  let value: napi_value

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, arraybuffer)
    $CHECK_ARG!(envObject, result)
    from64('byte_length')
    from64('byte_offset')
    byte_length = byte_length >>> 0
    byte_offset = byte_offset >>> 0
    const buffer = emnapiCtx.jsValueFromNapiValue(arraybuffer)!
    if (!(buffer instanceof ArrayBuffer)) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }

    if ((byte_length + byte_offset) > buffer.byteLength) {
      const err: RangeError & { code?: string } = new RangeError('byte_offset + byte_length should be less than or equal to the size in bytes of the array passed in')
      err.code = 'ERR_NAPI_INVALID_DATAVIEW_ARGS'
      throw err
    }

    const dataview = new DataView(buffer, byte_offset, byte_length)
    if (buffer === wasmMemory.buffer) {
      if (!emnapiExternalMemory.wasmMemoryViewTable.has(dataview)) {
        emnapiExternalMemory.wasmMemoryViewTable.set(dataview, {
          Ctor: DataView,
          address: byte_offset,
          length: byte_length,
          ownership: ReferenceOwnership.kUserland,
          runtimeAllocated: 0
        })
      }
    }
    from64('result')

    value = emnapiCtx.napiValueFromJsValue(dataview)
    makeSetValue('result', 0, 'value', '*')
    return $GET_RETURN_STATUS!(envObject)
  })
}

/**
 * @__sig ipppp
 */
export function node_api_symbol_for (env: napi_env, utf8description: const_char_p, length: size_t, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  from64('length')
  from64('utf8description')
  from64('result')

  const autoLength = length === -1
  const sizelength = length >>> 0
  if (length !== 0) {
    $CHECK_ARG!(envObject, utf8description)
  }

  if (!(autoLength || (sizelength <= 2147483647))) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }

  const descriptionString = emnapiString.UTF8ToString(utf8description as number, length)

  const value = emnapiCtx.napiValueFromJsValue(Symbol.for(descriptionString))
  makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}
