import { emnapiCtx } from 'emnapi:shared'
import { wasmMemory, _malloc } from 'emscripten:runtime'
import { from64, makeGetValue, makeSetValue, POINTER_SIZE, to64 } from 'emscripten:parse-tools'
import { emnapiString } from '../string'
import { type MemoryViewDescriptor, emnapiExternalMemory } from '../memory'
import { emnapi_create_memory_view } from '../emnapi'
import { napi_add_finalizer } from '../wrap'
import { $CHECK_ARG, $CHECK_ENV_NOT_IN_GC, $PREAMBLE, $RETURN_STATUS_IF_FALSE } from '../macro'

/**
 * @__sig ipp
 */
export function napi_create_array (env: napi_env, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = emnapiCtx.addToCurrentScope([]).id
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = emnapiCtx.addToCurrentScope(new Array(length)).id
  makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

function emnapiCreateArrayBuffer (byte_length: size_t, data: void_pp, shared: boolean): ArrayBufferLike {
  from64('byte_length')
  byte_length = byte_length >>> 0
  const arrayBuffer = shared ? new SharedArrayBuffer(byte_length) : new ArrayBuffer(byte_length)

  if (data) {
    from64('data')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const p = emnapiExternalMemory.getArrayBufferPointer(arrayBuffer, true).address
    makeSetValue('data', 0, 'p', '*')
  }

  return arrayBuffer
}

/**
 * @__sig ipppp
 */
export function napi_create_arraybuffer (env: napi_env, byte_length: size_t, data: void_pp, result: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    from64('result')
    const arrayBuffer = emnapiCreateArrayBuffer(byte_length, data, false)
    value = emnapiCtx.addToCurrentScope(arrayBuffer).id
    makeSetValue('result', 0, 'value', '*')
    return envObject.getReturnStatus()
  })
}

/**
 * @__sig ipppp
 */
export function node_api_create_sharedarraybuffer (env: napi_env, byte_length: size_t, data: void_pp, result: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: napi_value

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    from64('result')
    const arrayBuffer = emnapiCreateArrayBuffer(byte_length, data, true)
    value = emnapiCtx.addToCurrentScope(arrayBuffer).id
    makeSetValue('result', 0, 'value', '*')
    return envObject.getReturnStatus()
  })
}

/**
 * @__sig ipdp
 */
export function napi_create_date (env: napi_env, time: double, result: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    from64('result')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    value = emnapiCtx.addToCurrentScope(new Date(time)).id
    makeSetValue('result', 0, 'value', '*')
    return envObject.getReturnStatus()
  })
}

/**
 * @__sig ippppp
 */
export function napi_create_external (env: napi_env, data: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    if (!emnapiCtx.feature.supportFinalizer && finalize_cb) {
      throw emnapiCtx.createNotSupportWeakRefError('napi_create_external', 'Parameter "finalize_cb" must be 0(NULL)')
    }
    const externalHandle = emnapiCtx.getCurrentScope()!.addExternal(data)
    if (finalize_cb) {
      emnapiCtx.createReferenceWithFinalizer(envObject, externalHandle.id, 0, ReferenceOwnership.kRuntime as any, finalize_cb, data, finalize_hint)
    }
    from64('result')
    value = externalHandle.id
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    from64('byte_length')
    from64('external_data')
    from64('result')

    byte_length = byte_length >>> 0

    if (!external_data) {
      byte_length = 0
    }

    if ((external_data + byte_length) > wasmMemory.buffer.byteLength) {
      throw new RangeError('Memory out of range')
    }
    if (!emnapiCtx.feature.supportFinalizer && finalize_cb) {
      throw emnapiCtx.createNotSupportWeakRefError('napi_create_external_arraybuffer', 'Parameter "finalize_cb" must be 0(NULL)')
    }
    const arrayBuffer = new ArrayBuffer(byte_length)
    if (byte_length === 0) {
      try {
        const MessageChannel = emnapiCtx.feature.MessageChannel
        const messageChannel = new MessageChannel!()
        messageChannel.port1.postMessage(arrayBuffer, [arrayBuffer])
      } catch (_) {}
    } else {
      const u8arr = new Uint8Array(arrayBuffer)
      u8arr.set(new Uint8Array(wasmMemory.buffer).subarray(external_data, external_data + byte_length))
      emnapiExternalMemory.table.set(arrayBuffer, {
        address: external_data,
        ownership: ReferenceOwnership.kUserland,
        runtimeAllocated: 0
      })
    }
    const handle = emnapiCtx.addToCurrentScope(arrayBuffer)
    if (finalize_cb) {
      const status = napi_add_finalizer(env, handle.id, external_data, finalize_cb, finalize_hint, /* NULL */ 0)
      if (status === napi_status.napi_pending_exception) {
        const err = envObject.tryCatch.extractException()
        envObject.clearLastError()
        throw err
      } else if (status !== napi_status.napi_ok) {
        return envObject.setLastError(status)
      }
    }
    value = handle.id
    makeSetValue('result', 0, 'value', '*')
    return envObject.getReturnStatus()
  })
}

/**
 * @__sig ipp
 */
export function napi_create_object (env: napi_env, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = emnapiCtx.addToCurrentScope({}).id
  makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

/**
 * @__sig ipppppp
 */
export function napi_create_object_with_properties (
  env: napi_env,
  prototype_or_null: napi_value,
  property_names: Pointer<napi_value>,
  property_values: Pointer<napi_value>,
  property_count: size_t,
  result: Pointer<napi_value>
): napi_status {
  const envObject = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)

  from64('property_count')
  property_count = property_count >>> 0

  if (property_count > 0) {
    $CHECK_ARG!(envObject, property_names)
    $CHECK_ARG!(envObject, property_values)
  }

  const v8_prototype_or_null = prototype_or_null
    ? emnapiCtx.handleStore.get(prototype_or_null)!.value
    : null

  const properties: PropertyDescriptorMap = {}

  from64('property_names')
  from64('property_values')
  for (let i = 0; i < property_count; i++) {
    const name_value = emnapiCtx.handleStore.get(makeGetValue('property_names', 'i * ' + POINTER_SIZE, '*'))!.value
    $RETURN_STATUS_IF_FALSE(envObject, typeof name_value === 'string' || typeof name_value === 'symbol', napi_status.napi_name_expected)
    properties[name_value] = {
      value: emnapiCtx.handleStore.get(makeGetValue('property_values', 'i * ' + POINTER_SIZE, '*'))!.value,
      writable: true,
      enumerable: true,
      configurable: true
    }
  }

  let obj: any
  try {
    obj = Object.defineProperties(Object.create(v8_prototype_or_null), properties)
  } catch (_) {
    return envObject.setLastError(napi_status.napi_generic_failure)
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = emnapiCtx.addToCurrentScope(obj).id
  from64('result')
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
    // eslint-disable-next-line symbol-description, @typescript-eslint/no-unused-vars
    const value = emnapiCtx.addToCurrentScope(Symbol()).id
    makeSetValue('result', 0, 'value', '*')
  } else {
    const handle = emnapiCtx.handleStore.get(description)!
    const desc = handle.value
    if (typeof desc !== 'string') {
      return envObject.setLastError(napi_status.napi_string_expected)
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const v = emnapiCtx.addToCurrentScope(Symbol(desc)).id
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, arraybuffer)
    $CHECK_ARG!(envObject, result)

    const handle = emnapiCtx.handleStore.get(arraybuffer)!
    if (!handle.isArrayBuffer()) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    const buffer = handle.value

    from64('byte_offset')
    from64('length')

    const createTypedArray = function (envObject: Env, Type: { new (...args: any[]): ArrayBufferView; name?: string }, size_of_element: number, buffer: ArrayBuffer, byte_offset: size_t, length: size_t): napi_status {
      byte_offset = byte_offset >>> 0
      length = length >>> 0
      if (size_of_element > 1) {
        if ((byte_offset) % (size_of_element) !== 0) {
          const err: RangeError & { code?: string } = new RangeError(`start offset of ${Type.name ?? ''} should be a multiple of ${size_of_element}`)
          err.code = 'ERR_NAPI_INVALID_TYPEDARRAY_ALIGNMENT'
          envObject.tryCatch.setError(err)
          return envObject.setLastError(napi_status.napi_generic_failure)
        }
      }

      if (((length * size_of_element) + byte_offset) > buffer.byteLength) {
        const err: RangeError & { code?: string } = new RangeError('Invalid typed array length')
        err.code = 'ERR_NAPI_INVALID_TYPEDARRAY_LENGTH'
        envObject.tryCatch.setError(err)
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

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      value = emnapiCtx.addToCurrentScope(out).id
      makeSetValue('result', 0, 'value', '*')
      return envObject.getReturnStatus()
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number, pointer: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)

    const Buffer = emnapiCtx.feature.Buffer
    if (!Buffer) {
      throw emnapiCtx.createNotSupportBufferError('napi_create_buffer', '')
    }
    from64('result')

    let buffer: Uint8Array
    from64('size')
    size = size >>> 0
    if (!data || (size === 0)) {
      buffer = Buffer.alloc(size)
      value = emnapiCtx.addToCurrentScope(buffer).id
      makeSetValue('result', 0, 'value', '*')
    } else {
      pointer = _malloc(to64('size'))
      if (!pointer) throw new Error('Out of memory')
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

      value = emnapiCtx.addToCurrentScope(buffer).id
      makeSetValue('result', 0, 'value', '*')
      from64('data')
      makeSetValue('data', 0, 'pointer', '*')
    }

    return envObject.getReturnStatus()
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    const Buffer = emnapiCtx.feature.Buffer!
    if (!Buffer) {
      throw emnapiCtx.createNotSupportBufferError('napi_create_buffer_copy', '')
    }
    const arrayBuffer = emnapiCreateArrayBuffer(length, result_data, false)
    const buffer = Buffer.from(arrayBuffer)
    from64('data')
    from64('length')
    buffer.set(new Uint8Array(wasmMemory.buffer).subarray(data, data + length))
    value = emnapiCtx.addToCurrentScope(buffer).id
    from64('result')
    makeSetValue('result', 0, 'value', '*')
    return envObject.getReturnStatus()
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, arraybuffer)
    $CHECK_ARG!(envObject, result)
    from64('byte_offset')
    from64('byte_length')
    byte_offset = byte_offset >>> 0
    byte_length = byte_length >>> 0
    const handle = emnapiCtx.handleStore.get(arraybuffer)!
    if (!handle.isArrayBuffer()) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    const buffer = handle.value

    if ((byte_length + byte_offset) > buffer.byteLength) {
      const err: RangeError & { code?: string } = new RangeError('The byte offset + length is out of range')
      err.code = 'ERR_OUT_OF_RANGE'
      throw err
    }

    const Buffer = emnapiCtx.feature.Buffer!
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    value = emnapiCtx.addToCurrentScope(out).id
    makeSetValue('result', 0, 'value', '*')
    return envObject.getReturnStatus()
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
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, arraybuffer)
    $CHECK_ARG!(envObject, result)
    from64('byte_length')
    from64('byte_offset')
    byte_length = byte_length >>> 0
    byte_offset = byte_offset >>> 0
    const value = emnapiCtx.handleStore.get(arraybuffer)!.value

    const createDataview = (buffer: ArrayBuffer | SharedArrayBuffer): napi_status => {
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const v = emnapiCtx.addToCurrentScope(dataview).id
      makeSetValue('result', 0, 'v', '*')
      return envObject.getReturnStatus()
    }

    if (value instanceof ArrayBuffer || emnapiExternalMemory.isSharedArrayBuffer(value)) {
      return createDataview(value)
    } else {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
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

  const descriptionString = emnapiString.UTF8ToString(utf8description, length)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = emnapiCtx.addToCurrentScope(Symbol.for(descriptionString)).id
  makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}
